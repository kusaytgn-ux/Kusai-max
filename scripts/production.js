import "dotenv/config";
import express from "express";
import cors from "cors";
import { db } from "../api/firebaseAdmin.js";
import { Timestamp } from "firebase-admin/firestore";
import { query as pgQuery, checkPostgres } from "../api/postgres.js";
import {
  getProducts,
  getProductById,
  testMoySklad,
} from "../api/moysklad.js";

import {
  checkOneCHealth,
  getOneCCustomer,
  normalizePhone,
} from "../api/oneC.js";

const app = express();

const PORT = process.env.PORT || 3001;

const ONE_C_API_KEY =
  process.env.ONE_C_API_KEY || "KUSAI-MAX-1C-KEY-2026";

app.use(cors());
app.use(express.json());

/*
|--------------------------------------------------------------------------
| Проверка API
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "KUSAI MAX Production API работает",
    serverTime: new Date().toISOString(),
  });
});



/*
|--------------------------------------------------------------------------
| Авторизация 1С
|--------------------------------------------------------------------------
*/

function check1CAccess(req, res) {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || apiKey !== ONE_C_API_KEY) {
    res.status(403).json({
      success: false,
      message: "Нет доступа",
    });

    return false;
  }

  return true;
}

async function findClientByPhone(phone) {
  const normalizedPhone = normalizePhone(phone);

  // Ищем в Firebase сначала по нормализованному номеру
  const snapshot = await db
    .collection("clients")
    .where("phone", "==", normalizedPhone)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    return snapshot.docs[0];
  }

  // Дополнительно пробуем вариант с +7
  const plusPhone =  normalizedPhone;

  const plusSnapshot = await db
    .collection("clients")
    .where("phone", "==", plusPhone)
    .limit(1)
    .get();

  if (!plusSnapshot.empty) {
    return plusSnapshot.docs[0];
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| GET /api/1c/test
|
| Проверка подключения 1С → Render API
|--------------------------------------------------------------------------
*/

app.get("/api/1c/test", (req, res) => {
  if (!check1CAccess(req, res)) {
    return;
  }

  res.json({
    success: true,
    message: "KUSAI MAX API подключен",
    serverTime: new Date().toISOString(),
  });
});

/*
|--------------------------------------------------------------------------
| GET /api/1c/health
|
| Проверка связи Production API → 1С
|--------------------------------------------------------------------------
*/

app.get(
  "/api/1c/health",
  async (req, res) => {
    try {
      const result =
        await checkOneCHealth();

      res.json({
        success: true,

        oneC: result,

        serverTime:
          new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        "Ошибка проверки 1С:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          "Не удалось подключиться к 1С",

        error:
          error?.message ||
          String(error),
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET /api/1c/customer?phone=
|
| Получение клиента из 1С
| + синхронизация с Firebase
|--------------------------------------------------------------------------
*/

app.get(
  "/api/1c/customer",
  async (req, res) => {
    try {
      const phone =
        String(
          req.query.phone || ""
        ).trim();

      if (!phone) {
        return res.status(400).json({
          success: false,
          message:
            "Не указан телефон",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | 1. Получаем клиента из 1С
      |--------------------------------------------------------------------------
      */

      const customer =
        await getOneCCustomer(phone);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message:
            "Клиент не найден в 1С",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | 2. Нормализуем данные
      |--------------------------------------------------------------------------
      */

      const normalizedPhone =
        normalizePhone(
          customer.phone || phone
        );

      const points =
        Number(
          customer.bonusBalance || 0
        );

      const address =
        String(
          customer.address || ""
        ).trim();

      const passportDetails =
        String(
          customer.passportDetails || ""
        ).trim();

      /*
      |--------------------------------------------------------------------------
      | Дата рождения
      |
      | 1С может отдавать:
      | 0001-01-01T00:00:00
      |
      | Такое значение считаем отсутствующим.
      |--------------------------------------------------------------------------
      */

      let birthDay = null;

      if (
        customer.birthDay &&
        !String(
          customer.birthDay
        ).startsWith("0001-01-01")
      ) {
        birthDay =
          customer.birthDay;
      }

      /*
      |--------------------------------------------------------------------------
      | 3. Ищем существующего клиента Firebase
      |--------------------------------------------------------------------------
      */

      const clientDoc =
        await findClientByPhone(
          normalizedPhone
        );

      /*
      |--------------------------------------------------------------------------
      | 4. Если клиент уже существует
      |--------------------------------------------------------------------------
      */

      if (clientDoc) {
        const clientData =
          clientDoc.data();

        const updateData = {
          /*
          |--------------------------------------------------------------------------
          | Актуальный баланс из 1С
          |--------------------------------------------------------------------------
          */

          points,

          bonuses: points,

          /*
          |--------------------------------------------------------------------------
          | Данные из 1С
          |--------------------------------------------------------------------------
          */

          address,

          birthDay,

          passportDetails,

          /*
          |--------------------------------------------------------------------------
          | Технические поля
          |--------------------------------------------------------------------------
          */

          oneCSyncedAt:
            Timestamp.now(),

          updatedFrom1C:
            Timestamp.now(),
        };

        /*
        |--------------------------------------------------------------------------
        | Если телефон в Firebase записан в другом формате,
        | приводим его к нормальному виду.
        |--------------------------------------------------------------------------
        */

        if (
          normalizedPhone &&
          clientData.phone !==
            normalizedPhone
        ) {
          updateData.phone =
             normalizedPhone;
        }

        /*
        |--------------------------------------------------------------------------
        | Обновляем ТОЛЬКО нужные поля.
        |
        | login
        | orders
        | role
        | source
        | status
        | welcomeBonus
        | createdAt
        |
        | остаются нетронутыми.
        |--------------------------------------------------------------------------
        */

        await clientDoc.ref.update(
          updateData
        );

        console.log(
          `1С → Firebase: клиент обновлён ${clientDoc.id}`
        );

        return res.json({
          success: true,

          action: "updated",

          clientId:
            clientDoc.id,

          customer: {
            id:
              clientDoc.id,

            name:
              customer.name ||
              clientData.name ||
              "",

            phone:
              
              normalizedPhone,

            bonusBalance:
              points,

            birthDay,

            address,

            passportDetails,
          },
        });
      }

      /*
      |--------------------------------------------------------------------------
      | 5. Если клиента нет — создаём нового
      |--------------------------------------------------------------------------
      */

      const clientRef =
        db.collection("clients").doc();

      const now =
        Timestamp.now();

      const newClient = {
        /*
        |--------------------------------------------------------------------------
        | Основные данные
        |--------------------------------------------------------------------------
        */

        name:
          customer.name || "",

        phone:
          
          normalizedPhone,

        login:
          "",

        points,

        bonuses: points,

        orders: 0,

        /*
        |--------------------------------------------------------------------------
        | Данные из 1С
        |--------------------------------------------------------------------------
        */

        address,

        birthDay,

        passportDetails,

        /*
        |--------------------------------------------------------------------------
        | Данные приложения
        |--------------------------------------------------------------------------
        */

        role:
          "user",

        source:
          "1C",

        status:
          "ACTIVE",

        welcomeBonus:
          false,

        /*
        |--------------------------------------------------------------------------
        | Даты
        |--------------------------------------------------------------------------
        */

        createdAt:
          now,

        oneCSyncedAt:
          now,

        updatedFrom1C:
          now,
      };

      await clientRef.set(
        newClient
      );

      console.log(
        `1С → Firebase: создан новый клиент ${clientRef.id}`
      );

      return res.json({
        success: true,

        action: "created",

        clientId:
          clientRef.id,

        customer: {
          id:
            clientRef.id,

          name:
            customer.name || "",

          phone:
            
            normalizedPhone,

          bonusBalance:
            points,

          birthDay,

          address,

          passportDetails,
        },
      });
    } catch (error) {
      console.error(
        "Ошибка синхронизации клиента 1С → Firebase:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Ошибка получения клиента из 1С",

        error:
          error?.message ||
          String(error),
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET /api/clients/1c?phone=
|
| Получение клиента из 1С + синхронизация с Firebase
|--------------------------------------------------------------------------
*/

app.get(
  "/api/clients/1c",
  async (req, res) => {
    try {
      const phone =
        String(
          req.query.phone || ""
        ).trim();

      if (!phone) {
        return res.status(400).json({
          success: false,
          message: "Не указан телефон",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Получаем клиента из 1С
      |--------------------------------------------------------------------------
      */

      const customer =
        await getOneCCustomer(phone);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message:
            "Клиент не найден в 1С",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Нормализуем данные
      |--------------------------------------------------------------------------
      */

      const customerPhone =
        customer.phone || phone;

      const points =
        Number(
          customer.bonusBalance || 0
        );

      /*
      |--------------------------------------------------------------------------
      | Ищем клиента в Firebase
      |--------------------------------------------------------------------------
      */

      const clientsRef =
        db.collection("clients");

      let snapshot =
        await clientsRef
          .where(
            "phone",
            "==",
            customerPhone
          )
          .limit(1)
          .get();

      /*
      |--------------------------------------------------------------------------
      | Если по номеру с + не нашли —
      | пробуем вариант без +
      |--------------------------------------------------------------------------
      */

      if (snapshot.empty) {
        const phoneWithoutPlus =
          customerPhone.replace(
            /^\+/,
            ""
          );

        snapshot =
          await clientsRef
            .where(
              "phone",
              "==",
              phoneWithoutPlus
            )
            .limit(1)
            .get();
      }

      /*
      |--------------------------------------------------------------------------
      | Клиент существует → обновляем
      |--------------------------------------------------------------------------
      */

      let clientId;
      let clientData;

      if (!snapshot.empty) {
        const clientDoc =
          snapshot.docs[0];

        clientId =
          clientDoc.id;

        clientData =
          clientDoc.data();

        await clientDoc.ref.update({
          name:
            customer.name ||
            clientData.name ||
            "",

          phone:
            customer.phone ||
            clientData.phone ||
            customerPhone,

          points,

          birthDay:
            customer.birthDay ||
            null,

          address:
            customer.address ||
            "",

          updatedFrom1C:
            new Date(),

          oneCSyncedAt:
            new Date(),
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Клиента ещё нет → создаём
      |--------------------------------------------------------------------------
      */

      else {
        const newClientRef =
          clientsRef.doc();

        clientId =
          newClientRef.id;

        clientData = {
          name:
            customer.name || "",

          phone:
            customer.phone ||
            customerPhone,

          points,

          status:
            "ACTIVE",

          birthDay:
            customer.birthDay ||
            null,

          address:
            customer.address ||
            "",

          createdAt:
            new Date(),

          updatedFrom1C:
            new Date(),

          oneCSyncedAt:
            new Date(),
        };

        await newClientRef.set(
          clientData
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Возвращаем клиенту сайта
      |--------------------------------------------------------------------------
      */

      return res.json({
        success: true,

        client: {
          id: clientId,

          name:
            customer.name || "",

          phone:
            customer.phone ||
            customerPhone,

          points,

          birthDay:
            customer.birthDay ||
            null,

          address:
            customer.address ||
            "",
        },

        source: "1C",
      });

    } catch (error) {
      console.error(
        "Ошибка синхронизации клиента 1С → Firebase:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Ошибка получения клиента из 1С",

        error:
          error?.message ||
          String(error),
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET /api/1c/clients
|
| Получение всех клиентов
|--------------------------------------------------------------------------
*/

app.get("/api/1c/clients", async (req, res) => {
  if (!check1CAccess(req, res)) {
    return;
  }

  try {
    const snapshot = await db
      .collection("clients")
      .get();

    const clients = [];

    snapshot.forEach((doc) => {
      const data = doc.data();

      clients.push({
        id: doc.id,
        name: data.name || "",
        phone: data.phone || "",
        points: Number(data.points || 0),
        status: data.status || "NEW CLIENT",
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : data.createdAt || null,
      });
    });

    res.json({
      success: true,
      count: clients.length,
      clients,
    });
  } catch (error) {
    console.error(
      "Ошибка выгрузки клиентов для 1С:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Ошибка получения клиентов",
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET /api/1c/client?phone=...
|
| Поиск клиента по номеру телефона
|--------------------------------------------------------------------------
*/

app.get("/api/1c/client", async (req, res) => {
  if (!check1CAccess(req, res)) {
    return;
  }

  try {
    let phone = String(
      req.query.phone || ""
    ).trim();

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Не указан телефон",
      });
    }

    if (!phone.startsWith("+")) {
      phone = "+" + phone;
    }

    const snapshot = await db
      .collection("clients")
      .where("phone", "==", phone)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        message: "Клиент не найден",
      });
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    res.json({
      success: true,
      client: {
        id: doc.id,
        name: data.name || "",
        phone: data.phone || "",
        points: Number(data.points || 0),
        status: data.status || "NEW CLIENT",
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : data.createdAt || null,
      },
    });
  } catch (error) {
    console.error(
      "Ошибка поиска клиента:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Ошибка поиска клиента",
    });
  }
});

/*
|--------------------------------------------------------------------------
| POST /api/1c/bonus/add
|
| Начисление бонусов клиенту из 1С
|
| Body:
|
| {
|   "phone": "+79064142361",
|   "points": 500,
|   "reason": "Покупка"
| }
|--------------------------------------------------------------------------
*/

app.post("/api/1c/bonus/add", async (req, res) => {
  if (!check1CAccess(req, res)) {
    return;
  }

  try {
    let phone = String(
      req.body.phone || ""
    ).trim();

    const points = Number(req.body.points);
    const reason =
      String(req.body.reason || "").trim() ||
      "Начисление бонусов из 1С";

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Не указан телефон",
      });
    }

    if (!phone.startsWith("+")) {
      phone = "+" + phone;
    }

    if (
      !Number.isFinite(points) ||
      points <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Количество бонусов должно быть больше 0",
      });
    }

    const snapshot = await db
      .collection("clients")
      .where("phone", "==", phone)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        message: "Клиент не найден",
      });
    }

    const clientDoc = snapshot.docs[0];
    const clientRef = clientDoc.ref;
    const client = clientDoc.data();

    const currentPoints =
      Number(client.points || 0);

    const newPoints =
      currentPoints + points;

    await clientRef.update({
      points: newPoints,
    });

    await clientRef
      .collection("operations")
      .add({
        type: "add",
        points,
        reason,
        source: "1C",
        date: new Date(),
      });

    res.json({
      success: true,
      message: "Бонусы начислены",
      client: {
        id: clientDoc.id,
        name: client.name || "",
        phone: client.phone || phone,
      },
      operation: {
        type: "add",
        points,
        reason,
      },
      previousPoints: currentPoints,
      points: newPoints,
    });
  } catch (error) {
    console.error(
      "Ошибка начисления бонусов из 1С:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Ошибка начисления бонусов",
    });
  }
});

/*
|--------------------------------------------------------------------------
| POST /api/1c/bonus/remove
|
| Списание бонусов клиенту из 1С
|
| Body:
|
| {
|   "phone": "+79064142361",
|   "points": 500,
|   "reason": "Оплата бонусами"
| }
|--------------------------------------------------------------------------
*/

app.post(
  "/api/1c/bonus/remove",
  async (req, res) => {
    if (!check1CAccess(req, res)) {
      return;
    }

    try {
      let phone = String(
        req.body.phone || ""
      ).trim();

      const points = Number(
        req.body.points
      );

      const reason =
        String(
          req.body.reason || ""
        ).trim() ||
        "Списание бонусов из 1С";

      if (!phone) {
        return res.status(400).json({
          success: false,
          message: "Не указан телефон",
        });
      }

      if (!phone.startsWith("+")) {
        phone = "+" + phone;
      }

      if (
        !Number.isFinite(points) ||
        points <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Количество бонусов должно быть больше 0",
        });
      }

      const snapshot = await db
        .collection("clients")
        .where("phone", "==", phone)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return res.status(404).json({
          success: false,
          message: "Клиент не найден",
        });
      }

      const clientDoc =
        snapshot.docs[0];

      const clientRef =
        clientDoc.ref;

      const client =
        clientDoc.data();

      const currentPoints =
        Number(client.points || 0);

      if (points > currentPoints) {
        return res.status(400).json({
          success: false,
          message: "Недостаточно бонусов",
          points: currentPoints,
        });
      }

      const newPoints =
        currentPoints - points;

      await clientRef.update({
        points: newPoints,
      });

      await clientRef
        .collection("operations")
        .add({
          type: "remove",
          points,
          reason,
          source: "1C",
          date: new Date(),
        });

      res.json({
        success: true,
        message: "Бонусы списаны",
        client: {
          id: clientDoc.id,
          name: client.name || "",
          phone: client.phone || phone,
        },
        operation: {
          type: "remove",
          points,
          reason,
        },
        previousPoints: currentPoints,
        points: newPoints,
      });
    } catch (error) {
      console.error(
        "Ошибка списания бонусов из 1С:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Ошибка списания бонусов",
      });
    }
  }
);
/*
|--------------------------------------------------------------------------
| MOYSKLAD → FIREBASE
|
| Синхронизация товаров
|--------------------------------------------------------------------------
*/

let syncInProgress = false;

async function upsertProductToPostgres(product) {
  const normalized = {
    id: String(product.id),
    title: product.title || product.name || "",
    name: product.name || product.title || "",
    price: Number(product.price || 0),
    images: Array.isArray(product.images) ? product.images : [],
    category: product.category || "",
    badge: product.badge == null ? null : String(product.badge),
    rating: Number(product.rating || 0),
    reviews: Number(product.reviews || 0),
    delivery: product.delivery || "Уточняется",
    inStock: Boolean(product.inStock),
    stock: Number(product.stock || 0),
    reserve: Number(product.reserve || 0),
    inTransit: Number(product.inTransit || 0),
    quantity: Number(product.quantity || 0),
    description: product.description || "",
    memory: product.memory || "",
    color: product.color || "",
    warranty: product.warranty || "",
    type: product.type || null,
    product: product.product == null ? null : String(product.product),
    characteristics: Array.isArray(product.characteristics)
      ? product.characteristics
      : [],
    variantsCount: Number(product.variantsCount || 0),
    weight: product.weight == null ? null : Number(product.weight),
    volume: product.volume == null ? null : Number(product.volume),
    article: product.article || null,
    code: product.code || null,
    externalCode: product.externalCode || null,
    barcode: product.barcode || null,
    archived: Boolean(product.archived),
    hidden: Boolean(product.hidden),
    buyPrice: product.buyPrice == null ? null : Number(product.buyPrice),
    syncedAt: new Date(),
  };

  await pgQuery(
    `
    INSERT INTO products (
      id, title, name, price, images, category, badge, rating, reviews,
      delivery, in_stock, stock, reserve, in_transit, quantity, description,
      memory, color, warranty, type, product, characteristics, variants_count,
      weight, volume, article, code, external_code, barcode, archived,
      hidden, buy_price, synced_at, raw
    )
    VALUES (
      $1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,
      $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22::jsonb,$23,
      $24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      name = EXCLUDED.name,
      price = EXCLUDED.price,
      images = EXCLUDED.images,
      category = EXCLUDED.category,
      badge = EXCLUDED.badge,
      rating = EXCLUDED.rating,
      reviews = EXCLUDED.reviews,
      delivery = EXCLUDED.delivery,
      in_stock = EXCLUDED.in_stock,
      stock = EXCLUDED.stock,
      reserve = EXCLUDED.reserve,
      in_transit = EXCLUDED.in_transit,
      quantity = EXCLUDED.quantity,
      description = EXCLUDED.description,
      memory = EXCLUDED.memory,
      color = EXCLUDED.color,
      warranty = EXCLUDED.warranty,
      type = EXCLUDED.type,
      product = EXCLUDED.product,
      characteristics = EXCLUDED.characteristics,
      variants_count = EXCLUDED.variants_count,
      weight = EXCLUDED.weight,
      volume = EXCLUDED.volume,
      article = EXCLUDED.article,
      code = EXCLUDED.code,
      external_code = EXCLUDED.external_code,
      barcode = EXCLUDED.barcode,
      archived = EXCLUDED.archived,
      hidden = EXCLUDED.hidden,
      buy_price = EXCLUDED.buy_price,
      synced_at = EXCLUDED.synced_at,
      raw = EXCLUDED.raw
    `,
    [
      normalized.id,
      normalized.title,
      normalized.name,
      normalized.price,
      JSON.stringify(normalized.images),
      normalized.category,
      normalized.badge,
      normalized.rating,
      normalized.reviews,
      normalized.delivery,
      normalized.inStock,
      normalized.stock,
      normalized.reserve,
      normalized.inTransit,
      normalized.quantity,
      normalized.description,
      normalized.memory,
      normalized.color,
      normalized.warranty,
      normalized.type,
      normalized.product,
      JSON.stringify(normalized.characteristics),
      normalized.variantsCount,
      normalized.weight,
      normalized.volume,
      normalized.article,
      normalized.code,
      normalized.externalCode,
      normalized.barcode,
      normalized.archived,
      normalized.hidden,
      normalized.buyPrice,
      normalized.syncedAt,
      product,
    ]
  );
}


async function syncMoySkladToFirebase() {
  if (syncInProgress) {
    console.log(
      "Синхронизация уже выполняется. Пропускаем новый запуск."
    );

    return {
      success: false,
      skipped: true,
      message: "Синхронизация уже выполняется",
    };
  }

  syncInProgress = true;

  console.log("");
  console.log("======================================");
  console.log("MOYSKLAD → FIREBASE: СИНХРОНИЗАЦИЯ");
  console.log("======================================");

  try {
    console.log(
      "1. Получаем товары из МойСклад..."
    );

    const moySkladProducts =
      await getProducts();

    console.log(
      `2. Получено товаров из МойСклад: ${moySkladProducts.length}`
    );

    const productsCollection =
      db.collection("products");

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const product of moySkladProducts) {
      try {
        if (!product.id) {
          console.log(
            "Пропущен товар без ID:",
            product.name
          );

          skipped++;
          continue;
        }

        const productRef =
          productsCollection.doc(
            String(product.id)
          );

        const productDoc =
          await productRef.get();

        const firebaseProduct = {
          id: String(product.id),

          title:
            product.name || "",

          description:
            product.description || "",

          price:
            Number(product.price || 0),

          category:
            product.category || "",

          article:
            product.article || null,

          code:
            product.code || null,

          externalCode:
            product.externalCode || null,

          barcode:
            product.barcode || null,

          stock:
            Number(product.stock || 0),

          reserve:
            Number(product.reserve || 0),

          inTransit:
            Number(product.inTransit || 0),

          quantity:
            Number(product.quantity || 0),

          inStock:
            Number(product.quantity || 0) > 0,

          images:
            product.images || [],

          /*
           * ВАЖНО:
           * hidden НЕ перезаписываем,
           * если товар уже существует.
           */

          hidden:
            productDoc.exists
              ? Boolean(
                  productDoc.data().hidden ??
                  false
                )
              : false,

          rating:
            Number(product.rating || 0),

          reviews:
            Number(product.reviews || 0),

          badge:
            product.badge || null,

          delivery:
            product.delivery ||
            "Уточняется",

          updated:
            product.updated || null,

          syncedAt:
            new Date(),
        };

        if (!productDoc.exists) {
          await productRef.set(
            firebaseProduct
          );

          created++;

          console.log(
            `Создан: ${product.name}`
          );
        } else {
          await productRef.update(
            firebaseProduct
          );

          updated++;

          console.log(
            `Обновлён: ${product.name}`
          );
        }

        // Phase 3: dual-write Firebase + PostgreSQL.
        // Firebase remains the current source for the frontend for now.
        try {
          await upsertProductToPostgres({
            ...firebaseProduct,
            hidden: firebaseProduct.hidden,
            memory: product.memory,
            color: product.color,
            warranty: product.warranty,
            variantsCount: product.variantsCount,
            weight: product.weight,
            volume: product.volume,
            type: product.type,
            product: product.product,
            characteristics: product.characteristics,
            buyPrice: product.buyPrice,
            archived: product.archived,
          });
        } catch (postgresError) {
          console.error(
            `PostgreSQL dual-write failed for ${product.name}:`,
            postgresError?.message || postgresError
          );
        }
      } catch (productError) {
        skipped++;

        console.error(
          `Ошибка сохранения товара ${product.name}:`,
          productError?.message ||
            productError
        );
      }
    }

    console.log("");
    console.log(
      "СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА"
    );
    console.log(
      `Создано: ${created}`
    );
    console.log(
      `Обновлено: ${updated}`
    );
    console.log(
      `Пропущено: ${skipped}`
    );
    console.log(
      `Всего из МойСклад: ${moySkladProducts.length}`
    );
    console.log(
      "======================================"
    );
    console.log("");

    return {
      success: true,
      moySkladCount:
        moySkladProducts.length,
      created,
      updated,
      skipped,
    };
  } catch (error) {
    console.error(
      "Ошибка синхронизации МойСклад → Firebase:",
      error?.response?.data ||
        error?.message ||
        error
    );

    throw error;
  } finally {
    syncInProgress = false;
  }
}

/*
|--------------------------------------------------------------------------
| GET /api/moysklad/products
|
| Ручной запуск синхронизации
|--------------------------------------------------------------------------
*/

app.get(
  "/api/moysklad/products",
  async (req, res) => {
    try {
      const result =
        await syncMoySkladToFirebase();

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          "Ошибка синхронизации товаров",
        error:
          error?.message ||
          String(error),
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| АВТОМАТИЧЕСКАЯ СИНХРОНИЗАЦИЯ
|
| Каждые 30 минут
|--------------------------------------------------------------------------
*/

const SYNC_INTERVAL =
  30 * 60 * 1000;

async function startAutoSync() {
  console.log(
    "Запускаем первоначальную синхронизацию..."
  );

  try {
    await syncMoySkladToFirebase();
  } catch (error) {
    console.error(
      "Первоначальная синхронизация не удалась:",
      error?.message ||
        error
    );
  }

  setInterval(
    async () => {
      console.log("");
      console.log(
        "⏰ Прошло 30 минут. Запускаем автоматическую синхронизацию..."
      );

      try {
        await syncMoySkladToFirebase();
      } catch (error) {
        console.error(
          "Автоматическая синхронизация завершилась ошибкой:",
          error?.message ||
            error
        );
      }
    },
    SYNC_INTERVAL
  );
}


app.get("/api/health/postgres", async (req, res) => {
  try {
    const result = await checkPostgres();
    res.json({
      success: true,
      postgres: result,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("PostgreSQL health check failed:", error);
    res.status(503).json({
      success: false,
      message: "PostgreSQL недоступен",
      error: error?.message || String(error),
    });
  }
});

/*
|--------------------------------------------------------------------------
| Запуск production API
|--------------------------------------------------------------------------
*/

app.listen(
  PORT,
  "0.0.0.0",
  async () => {
    console.log(
      `Production API запущен на порту ${PORT}`
    );

    await startAutoSync();
  }
);