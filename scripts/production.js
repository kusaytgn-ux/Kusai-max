import "dotenv/config";
import express from "express";
import cors from "cors";
import { db } from "../api/firebaseAdmin.js";
import {
  getProducts,
  getProductById,
  testMoySklad,
} from "../api/moysklad.js";

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
| Получение товаров из МойСклад
| и сохранение в коллекцию products
|--------------------------------------------------------------------------
*/

app.get("/api/moysklad/products", async (req, res) => {
  console.log("");
  console.log("======================================");
  console.log("MOYSKLAD → FIREBASE: СИНХРОНИЗАЦИЯ");
  console.log("======================================");

  try {
    console.log("1. Получаем товары из МойСклад...");

    const moySkladProducts = await getProducts();

    console.log(
      `2. Получено товаров из МойСклад: ${moySkladProducts.length}`
    );

    const productsCollection = db.collection("products");

    let created = 0;
    let updated = 0;
    let skipped = 0;

    /*
    |--------------------------------------------------------------------------
    | Сохраняем товары
    |--------------------------------------------------------------------------
    */

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
          productsCollection.doc(String(product.id));

        const productDoc =
          await productRef.get();

        /*
        |--------------------------------------------------------------------------
        | Формируем товар Firebase
        |--------------------------------------------------------------------------
        |
        | Картинки пока НЕ добавляем.
        |
        */

        const firebaseProduct = {
          id: String(product.id),

          title: product.name || "",

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

          /*
          |--------------------------------------------------------------------------
          | Пока картинок нет
          |--------------------------------------------------------------------------
          */

          images: [],

          /*
          |--------------------------------------------------------------------------
          | Скрытие товара
          |--------------------------------------------------------------------------
          |
          | Главное:
          | новый товар автоматически hidden: false
          |
          */

          hidden: false,

          /*
          |--------------------------------------------------------------------------
          | Дополнительные поля для сайта
          |--------------------------------------------------------------------------
          */

          rating:
            product.rating || 0,

          reviews:
            product.reviews || 0,

          badge:
            product.badge || null,

          delivery:
            product.delivery || "Уточняется",

          updated:
            product.updated || null,

          syncedAt:
            new Date(),
        };

        /*
        |--------------------------------------------------------------------------
        | Создание / обновление
        |--------------------------------------------------------------------------
        */

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

      } catch (productError) {

        skipped++;

        console.error(
          `Ошибка сохранения товара ${product.name}:`,
          productError.message
        );
      }
    }

    console.log("");
    console.log("======================================");
    console.log("СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА");
    console.log("======================================");

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

    console.log("======================================");
    console.log("");

    res.json({
      success: true,

      message:
        "Товары успешно синхронизированы с Firebase",

      moySkladCount:
        moySkladProducts.length,

      created,

      updated,

      skipped,
    });

  } catch (error) {

    console.error(
      "Ошибка синхронизации МойСклад → Firebase:",
      error
    );

    res.status(500).json({

      success: false,

      message:
        "Ошибка синхронизации товаров",

      error:
        error?.message || String(error),

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
  () => {
    console.log(
      `Production API запущен на порту ${PORT}`
    );
  }
);