import {
  getOneCCustomer,
} from "./oneC.js";
import "dotenv/config";
import {
  findProductImages,
} from "./imageParser.js";

import {
  query,
} from "./postgres.js";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";

import { db } from "./firebaseAdmin.js";
import { calculateBonusDiscount } from "./bonus.js";

import {
  getProducts,
  getProductById,
  testMoySklad,
} from "./moysklad.js";

const app = express();

const PORT = process.env.PORT || 3001;

const ONE_C_API_KEY =
  process.env.ONE_C_API_KEY ||
  "KUSAI-MAX-1C-KEY-2026";

const PRODUCTS_COLLECTION = "products";
const CLIENTS_COLLECTION = "clients";
const ADMINS_COLLECTION = "admins";

app.use(cors());
app.use(express.json());

app.get(
  "/api/debug/1c/client",
  async (req, res) => {
    try {
      const phone = req.query.phone;

      if (!phone) {
        return res.status(400).json({
          success: false,
          message: "Не указан телефон",
        });
      }

      const customer =
        await getOneCCustomer(phone);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Клиент не найден",
        });
      }

      const qr = customer.customerQR;

      console.log("QR TYPE:", typeof qr);
      console.log("QR IS BUFFER:", Buffer.isBuffer(qr));
      console.log(
        "QR LENGTH:",
        qr?.length
      );

      res.json({
        success: true,

        customer: {
          ...customer,

          customerQRInfo: {
            exists: !!qr,
            type: typeof qr,
            isBuffer: Buffer.isBuffer(qr),
            length: qr?.length || 0,
            firstBytes: qr
              ? String(qr).slice(0, 50)
              : null,
          },
        },
      });

    } catch (error) {

      console.error(
        "Ошибка получения клиента из 1С:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
|--------------------------------------------------------------------------
*/

function validatePhone(phone) {
  const normalized = String(phone || "").trim();

  return /^\+7\d{10}$/.test(normalized);
}


function check1CAccess(req, res) {
  const apiKey = req.headers["x-api-key"];

  if (apiKey !== ONE_C_API_KEY) {
    res.status(403).json({
      success: false,
      message: "Нет доступа",
    });

    return false;
  }

  return true;
}

function normalizePhone(phone) {
  let value = String(phone || "")
    .replace(/\D/g, "");

  if (!value) {
    return "";
  }

  if (value.startsWith("8") && value.length === 11) {
    value = "7" + value.slice(1);
  }

  if (value.startsWith("9") && value.length === 10) {
    value = "7" + value;
  }

  if (
    !value.startsWith("7") ||
    value.length !== 11
  ) {
    return "";
  }

  return value;
}

async function findClientByPhone(phone) {
  const normalized =
    normalizePhone(phone);

  if (!normalized) {
    return null;
  }

  const phoneVariants = [
    normalized,
    "+" + normalized,
    "8" + normalized.slice(1),
    normalized.slice(1),
  ];

  const snapshot = await db
    .collection("clients")
    .where(
      "phone",
      "in",
      phoneVariants
    )
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0];
}

function serializeFirestoreValue(value) {
  if (!value) {
    return value;
  }

  if (
    typeof value.toDate === "function"
  ) {
    return value.toDate().toISOString();
  }

  return value;
}
app.post(
  "/api/images/find/:productId",
  async (req, res) => {
    try {
      const {
        productId,
      } = req.params;

      const result =
        await query(
          `
          SELECT *
          FROM products
          WHERE id = $1
          LIMIT 1
          `,
          [productId]
        );

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Товар не найден",
        });
      }

      const product =
        result.rows[0];

      const imageResult =
        await findProductImages(
          product
        );

      /*
       * Сохраняем найденные изображения
       */

      await query(
        `
        UPDATE products
        SET
          images = $1,
          updated_at = NOW()
        WHERE id = $2
        `,
        [
          imageResult.images,
          productId,
        ]
      );

      res.json({
        success: true,
        productId,
        images:
          imageResult.images,
        matches:
          imageResult.matches,
      });
    } catch (error) {
      console.error(
        "IMAGE PARSER ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка поиска изображений",
        error:
          error.message,
      });
    }
  }
);
/*
|--------------------------------------------------------------------------
| НОРМАЛИЗАЦИЯ ТОВАРА МойСклад → Firebase
|--------------------------------------------------------------------------
|
| Здесь формируется единая структура товара для сайта.
|--------------------------------------------------------------------------
*/

function buildFirebaseProduct(
  product,
  existingProduct = null
) {
  const price = Number(
    product.price || 0
  );

  const stock = Number(
    product.stock || 0
  );

  const quantity = Number(
    product.quantity || 0
  );

  const reserve = Number(
    product.reserve || 0
  );

  const inTransit = Number(
    product.inTransit || 0
  );

  const characteristics =
    Array.isArray(product.characteristics)
      ? product.characteristics
      : [];

  /*
   * Автоматически вытаскиваем характеристики
   * МойСклад в отдельные поля.
   */
  const characteristicMap = {};

  for (const characteristic of characteristics) {
    if (!characteristic) {
      continue;
    }

    const name =
      characteristic.name ||
      characteristic.type ||
      characteristic.title;

    const value =
      characteristic.value ??
      characteristic.valueName ??
      characteristic.text;

    if (name && value !== undefined) {
      characteristicMap[
        String(name).trim()
      ] = value;
    }
  }

  /*
   * Сохраняем поля сайта, которые не приходят
   * из МойСклад.
   */
  const images =
    Array.isArray(existingProduct?.images)
      ? existingProduct.images
      : [];

  const rating = Number(
    existingProduct?.rating || 0
  );

  const reviews = Number(
    existingProduct?.reviews || 0
  );

  const delivery =
    existingProduct?.delivery ||
    "Уточняется";

  const hidden =
    existingProduct?.hidden !== undefined
      ? Boolean(existingProduct.hidden)
      : false;

  /*
   * Полная структура товара.
   */
  return {
    /*
    |--------------------------------------------------------------------------
    | ID
    |--------------------------------------------------------------------------
    */

    id: String(product.id),

    /*
    |--------------------------------------------------------------------------
    | Основная информация
    |--------------------------------------------------------------------------
    */

    title: String(
      product.name || ""
    ),

    name: String(
      product.name || ""
    ),

    description: String(
      product.description || ""
    ),

    category:
      product.category || null,

    /*
    |--------------------------------------------------------------------------
    | Цена
    |--------------------------------------------------------------------------
    */

    price,

    minPrice:
      Number(product.minPrice || 0),

    buyPrice:
      Number(product.buyPrice || 0),

    /*
    |--------------------------------------------------------------------------
    | Артикулы / коды
    |--------------------------------------------------------------------------
    */

    article:
      product.article || null,

    code:
      product.code || null,

    externalCode:
      product.externalCode || null,

    barcode:
      product.barcode || null,

    /*
    |--------------------------------------------------------------------------
    | Остатки
    |--------------------------------------------------------------------------
    */

    stock,

    reserve,

    inTransit,

    quantity,

    /*
    |--------------------------------------------------------------------------
    | Наличие
    |--------------------------------------------------------------------------
    */

    inStock:
      stock > 0 ||
      quantity > 0,

    /*
    |--------------------------------------------------------------------------
    | Состояние товара
    |--------------------------------------------------------------------------
    */

    archived:
      Boolean(product.archived),

    hidden,

    /*
    |--------------------------------------------------------------------------
    | Характеристики
    |--------------------------------------------------------------------------
    */

    characteristics,

    characteristicMap,

    variantsCount:
      Number(product.variantsCount || 0),

    /*
    |--------------------------------------------------------------------------
    | Физические параметры
    |--------------------------------------------------------------------------
    */

    weight:
      product.weight ?? null,

    volume:
      product.volume ?? null,

    /*
    |--------------------------------------------------------------------------
    | Служебная информация МойСклад
    |--------------------------------------------------------------------------
    */

    updated:
      product.updated || null,

    /*
    |--------------------------------------------------------------------------
    | Поля сайта
    |--------------------------------------------------------------------------
    */

    images,

    rating,

    reviews,

    delivery,

    /*
    |--------------------------------------------------------------------------
    | Дополнительные поля сайта
    |--------------------------------------------------------------------------
    |
    | Эти поля можно использовать ProductCard/ProductPage.
    */

    memory:
      existingProduct?.memory ||
      characteristicMap["Память"] ||
      characteristicMap["Объем памяти"] ||
      "",

    color:
      existingProduct?.color ||
      characteristicMap["Цвет"] ||
      "",

    warranty:
      existingProduct?.warranty ||
      characteristicMap["Гарантия"] ||
      "",

    brand:
      existingProduct?.brand ||
      null,

    /*
    |--------------------------------------------------------------------------
    | Дата синхронизации
    |--------------------------------------------------------------------------
    */

    syncedAt:
      new Date(),
  };
}

/*
|--------------------------------------------------------------------------
| СИНХРОНИЗАЦИЯ МойСклад → Firebase
|--------------------------------------------------------------------------
*/

async function syncMoySkladProductsToFirebase() {
  console.log(
    "======================================"
  );

  console.log(
    "FIREBASE: НАЧАЛО СИНХРОНИЗАЦИИ ТОВАРОВ"
  );

  console.log(
    "======================================"
  );

  try {
    /*
    |--------------------------------------------------------------------------
    | 1. Получаем товары из МойСклад
    |--------------------------------------------------------------------------
    */

    console.log(
      "1. Получаем товары из МойСклад..."
    );

    const products =
      await getProducts();

    console.log(
      `2. Получено товаров из МойСклад: ${products.length}`
    );

    if (!products.length) {
      return {
        success: true,
        count: 0,
        created: 0,
        updated: 0,
        message:
          "МойСклад не вернул товары",
      };
    }

    /*
    |--------------------------------------------------------------------------
    | 2. ID товаров
    |--------------------------------------------------------------------------
    */

    const productIds =
      products
        .map(
          (product) =>
            product?.id
        )
        .filter(Boolean);

    console.log(
      `3. ID товаров собрано: ${productIds.length}`
    );

    /*
    |--------------------------------------------------------------------------
    | 3. Читаем существующие товары Firebase
    |--------------------------------------------------------------------------
    */

    console.log(
      "4. Получаем существующие товары из Firebase..."
    );

    const existingProducts =
      new Map();

    const firestoreReadBatchSize =
      300;

    for (
      let i = 0;
      i < productIds.length;
      i += firestoreReadBatchSize
    ) {
      const idsChunk =
        productIds.slice(
          i,
          i + firestoreReadBatchSize
        );

      const refs =
        idsChunk.map((id) =>
          db
            .collection(
              PRODUCTS_COLLECTION
            )
            .doc(id)
        );

      const snapshots =
        await db.getAll(...refs);

      for (
        const snapshot of snapshots
      ) {
        if (snapshot.exists) {
          existingProducts.set(
            snapshot.id,
            snapshot.data()
          );
        }
      }

      console.log(
        `Firebase: проверено ${Math.min(
          i + idsChunk.length,
          productIds.length
        )} / ${productIds.length}`
      );
    }

    console.log(
      `5. Существующих товаров: ${existingProducts.size}`
    );

    /*
    |--------------------------------------------------------------------------
    | 4. Запись товаров
    |--------------------------------------------------------------------------
    */

    let created = 0;
    let updated = 0;

    const firestoreWriteBatchSize =
      400;

    for (
      let i = 0;
      i < products.length;
      i += firestoreWriteBatchSize
    ) {
      const chunk =
        products.slice(
          i,
          i + firestoreWriteBatchSize
        );

      const batch =
        db.batch();

      for (
        const product of chunk
      ) {
        if (!product?.id) {
          continue;
        }

        const productRef =
          db
            .collection(
              PRODUCTS_COLLECTION
            )
            .doc(
              String(product.id)
            );

        const existingProduct =
          existingProducts.get(
            String(product.id)
          ) || null;

        /*
        |--------------------------------------------------------------------------
        | Формируем правильную структуру
        |--------------------------------------------------------------------------
        */

        const firebaseProduct =
          buildFirebaseProduct(
            product,
            existingProduct
          );

        /*
        |--------------------------------------------------------------------------
        | Сохраняем
        |--------------------------------------------------------------------------
        |
        | merge: true позволяет сохранить поля,
        | которые были добавлены вручную в Firebase.
        |--------------------------------------------------------------------------
        */

        batch.set(
          productRef,
          firebaseProduct,
          {
            merge: true,
          }
        );

        if (existingProduct) {
          updated++;
        } else {
          created++;
        }
      }

      await batch.commit();

      console.log(
        `Firebase: записано ${Math.min(
          i + chunk.length,
          products.length
        )} / ${products.length}`
      );
    }

    /*
    |--------------------------------------------------------------------------
    | 5. Результат
    |--------------------------------------------------------------------------
    */

    console.log(
      "======================================"
    );

    console.log(
      "FIREBASE: СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА"
    );

    console.log(
      `Всего товаров: ${products.length}`
    );

    console.log(
      `Создано: ${created}`
    );

    console.log(
      `Обновлено: ${updated}`
    );

    console.log(
      "======================================"
    );

    return {
      success: true,
      count: products.length,
      created,
      updated,
    };
  } catch (error) {
    console.error(
      "FIREBASE: ОШИБКА СИНХРОНИЗАЦИИ:"
    );

    console.error(
      error?.response?.data ||
        error?.message ||
        error
    );

    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| БАЗОВЫЕ API
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.json({
    success: true,
    message:
      "KUSAI MAX REST API работает",
  });
});

app.get("/api", (req, res) => {
  res.json({
    success: true,
    message:
      "KUSAI MAX API работает",
  });
});

/*
|--------------------------------------------------------------------------
| 1С
|--------------------------------------------------------------------------
*/

app.get(
  "/api/1c/test",
  (req, res) => {
    if (!check1CAccess(req, res)) {
      return;
    }

    res.json({
      success: true,
      message:
        "KUSAI MAX API подключен",
      serverTime:
        new Date().toISOString(),
    });
  }
);

/*
|--------------------------------------------------------------------------
| Клиент для 1С
|--------------------------------------------------------------------------
*/

app.get(
  "/api/1c/client",
  async (req, res) => {
    try {
      if (!check1CAccess(req, res)) {
        return;
      }

      const phone =
        normalizePhone(
          req.query.phone
        );

      if (!phone) {
        return res.status(400).json({
          success: false,
          message:
            "Не указан телефон",
        });
      }

      const snapshot =
        await db
          .collection(
            CLIENTS_COLLECTION
          )
          .where(
            "phone",
            "==",
            phone
          )
          .limit(1)
          .get();

      if (snapshot.empty) {
        return res.json({
          success: false,
          message:
            "Клиент не найден",
        });
      }

      const clientDoc =
        snapshot.docs[0];

      const data =
        clientDoc.data();

      res.json({
        success: true,

        client: {
          id: clientDoc.id,
          name: data.name || "",
          phone:
            data.phone || phone,
          points:
            Number(
              data.points || 0
            ),
          status:
            data.status ||
            "MAX GOLD",
        },
      });
    } catch (error) {
      console.error(
        "Ошибка поиска клиента:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка сервера",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Все клиенты для 1С
|--------------------------------------------------------------------------
*/

app.get(
  "/api/1c/clients",
  async (req, res) => {
    if (!check1CAccess(req, res)) {
      return;
    }

    try {
      const snapshot =
        await db
          .collection(
            CLIENTS_COLLECTION
          )
          .get();

      const clients =
        snapshot.docs.map(
          (clientDoc) => {
            const data =
              clientDoc.data();

            return {
              id: clientDoc.id,
              name:
                data.name || "",
              phone:
                data.phone || "",
              points:
                Number(
                  data.points || 0
                ),
              createdAt:
                serializeFirestoreValue(
                  data.createdAt
                ),
            };
          }
        );

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
        message:
          "Ошибка получения клиентов",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| CLIENTS
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| GET /api/client?phone=
|--------------------------------------------------------------------------
*/

app.get(
  "/api/client",
  async (req, res) => {
    try {
      const phone =
        normalizePhone(
          req.query.phone
        );

      if (!phone) {
        return res.status(400).json({
          success: false,
          message:
            "Не указан телефон",
        });
      }

      const snapshot =
        await db
          .collection(
            CLIENTS_COLLECTION
          )
          .where(
            "phone",
            "==",
            phone
          )
          .limit(1)
          .get();

      if (snapshot.empty) {
        return res.status(404).json({
          success: false,
          message:
            "Клиент не найден",
        });
      }

      const clientDoc =
        snapshot.docs[0];

      res.json({
        success: true,

        client: {
          id: clientDoc.id,
          ...clientDoc.data(),
        },
      });
    } catch (error) {
      console.error(
        "Ошибка поиска клиента:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка поиска клиента",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET /api/clients/:id
|--------------------------------------------------------------------------
*/

app.get(
  "/api/clients/:id",
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const clientRef =
        db
          .collection(
            CLIENTS_COLLECTION
          )
          .doc(id);

      const clientDoc =
        await clientRef.get();

      if (!clientDoc.exists) {
        return res.status(404).json({
          success: false,
          message:
            "Клиент не найден",
        });
      }

      res.json({
        success: true,

        client: {
          id: clientDoc.id,
          ...clientDoc.data(),
        },
      });
    } catch (error) {
      console.error(
        "Ошибка получения клиента:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка получения клиента",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET /api/clients/phone/:phone
|--------------------------------------------------------------------------
*/

app.get(
  "/api/clients/phone/:phone",
  async (req, res) => {
    try {
      const phone =
        normalizePhone(
          req.params.phone
        );

      const snapshot =
        await db
          .collection(
            CLIENTS_COLLECTION
          )
          .where(
            "phone",
            "==",
            phone
          )
          .limit(1)
          .get();

      if (snapshot.empty) {
        return res.status(404).json({
          success: false,
          message:
            "Клиент не найден",
        });
      }

      const clientDoc =
        snapshot.docs[0];

      res.json({
        success: true,

        client: {
          id: clientDoc.id,
          ...clientDoc.data(),
        },
      });
    } catch (error) {
      console.error(
        "Ошибка поиска клиента:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка поиска клиента",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET /api/clients/:id/profile
|--------------------------------------------------------------------------
*/

app.get(
  "/api/clients/:id/profile",
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const clientRef =
        db
          .collection(
            CLIENTS_COLLECTION
          )
          .doc(id);

      const clientDoc =
        await clientRef.get();

      if (!clientDoc.exists) {
        return res.status(404).json({
          success: false,
          message:
            "Клиент не найден",
        });
      }

      const operationsSnapshot =
        await clientRef
          .collection("operations")
          .orderBy(
            "date",
            "desc"
          )
          .get();

      const operations =
        operationsSnapshot.docs.map(
          (operationDoc) => {
            const data =
              operationDoc.data();

            return {
              id: operationDoc.id,
              ...data,
              date:
                serializeFirestoreValue(
                  data.date
                ),
            };
          }
        );

      const client =
        clientDoc.data();

      res.json({
        success: true,

        client: {
          id: clientDoc.id,
          ...client,

          createdAt:
            serializeFirestoreValue(
              client.createdAt
            ),

          operations,
        },
      });
    } catch (error) {
      console.error(
        "Ошибка профиля:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка получения профиля",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| POST /api/clients
|--------------------------------------------------------------------------
*/

app.post(
  "/api/clients",
  async (req, res) => {
    try {
      const name =
        String(
          req.body.name || ""
        ).trim();

      const phone =
        normalizePhone(
          req.body.phone
        );

      if (!name || !phone) {
        return res.status(400).json({
          success: false,
          message:
            "Введите имя и телефон",
        });
      }

      if (!validatePhone(phone)) {
        return res.status(400).json({
          success: false,
          message:
            "Телефон должен начинаться с +7 и содержать 11 цифр",
        });
      }

      const existingSnapshot =
        await db
          .collection(
            CLIENTS_COLLECTION
          )
          .where(
            "phone",
            "==",
            phone
          )
          .limit(1)
          .get();

      if (!existingSnapshot.empty) {
        return res.status(409).json({
          success: false,
          message:
            "Клиент с таким номером телефона уже существует",
        });
      }

      const clientRef =
        db
          .collection(
            CLIENTS_COLLECTION
          )
          .doc();

      const welcomeBonus =
        100000;

      const client = {
        name,
        phone,
        points: welcomeBonus,
        createdAt: new Date(),
      };

      await clientRef.set(
        client
      );

      await clientRef
        .collection("operations")
        .doc()
        .set({
          type: "add",
          points: welcomeBonus,
          reason:
            "Приветственные бонусы",
          date: new Date(),
        });

      res.status(201).json({
        success: true,

        client: {
          id: clientRef.id,
          ...client,
        },
      });
    } catch (error) {
      console.error(
        "Ошибка создания клиента:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка создания клиента",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| PATCH /api/clients/:id
|--------------------------------------------------------------------------
*/

app.patch(
  "/api/clients/:id",
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const {
        name,
        phone,
        points,
      } = req.body;

      const clientRef =
        db
          .collection(
            CLIENTS_COLLECTION
          )
          .doc(id);

      const clientDoc =
        await clientRef.get();

      if (!clientDoc.exists) {
        return res.status(404).json({
          success: false,
          message:
            "Клиент не найден",
        });
      }

      const updates = {};

      if (name !== undefined) {
        updates.name = String(
          name
        ).trim();
      }

      if (phone !== undefined) {
        const normalizedPhone =
          normalizePhone(
            phone
          );

        if (
          !validatePhone(
            normalizedPhone
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Некорректный телефон",
          });
        }

        updates.phone =
          normalizedPhone;
      }

      if (points !== undefined) {
        updates.points =
          Number(points);
      }

      await clientRef.update(
        updates
      );

      const updatedDoc =
        await clientRef.get();

      res.json({
        success: true,

        client: {
          id: updatedDoc.id,
          ...updatedDoc.data(),
        },
      });
    } catch (error) {
      console.error(
        "Ошибка обновления клиента:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка обновления клиента",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| BONUS
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Начисление бонусов
|--------------------------------------------------------------------------
*/

app.post(
  "/api/clients/:id/bonus/add",
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const {
        points,
        reason,
      } = req.body;

      const amount =
        Number(points);

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Некорректное количество бонусов",
        });
      }

      const clientRef =
        db
          .collection(
            CLIENTS_COLLECTION
          )
          .doc(id);

      const clientDoc =
        await clientRef.get();

      if (!clientDoc.exists) {
        return res.status(404).json({
          success: false,
          message:
            "Клиент не найден",
        });
      }

      const client =
        clientDoc.data();

      const currentPoints =
        Number(
          client.points || 0
        );

      const newPoints =
        currentPoints + amount;

      await clientRef.update({
        points: newPoints,
      });

      await clientRef
        .collection("operations")
        .add({
          type: "add",
          points: amount,
          reason:
            reason ||
            "Начисление бонусов",
          date: new Date(),
        });

      res.json({
        success: true,
        message:
          "Бонусы начислены",
        points: newPoints,
      });
    } catch (error) {
      console.error(
        "Ошибка начисления бонусов:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка начисления бонусов",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Списание бонусов
|--------------------------------------------------------------------------
*/

app.post(
  "/api/clients/:id/bonus/remove",
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const {
        points,
        reason,
      } = req.body;

      const amount =
        Number(points);

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Некорректное количество бонусов",
        });
      }

      const clientRef =
        db
          .collection(
            CLIENTS_COLLECTION
          )
          .doc(id);

      const clientDoc =
        await clientRef.get();

      if (!clientDoc.exists) {
        return res.status(404).json({
          success: false,
          message:
            "Клиент не найден",
        });
      }

      const client =
        clientDoc.data();

      const currentPoints =
        Number(
          client.points || 0
        );

      if (
        amount >
        currentPoints
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Недостаточно бонусов",
        });
      }

      const newPoints =
        currentPoints - amount;

      await clientRef.update({
        points: newPoints,
      });

      await clientRef
        .collection("operations")
        .add({
          type: "remove",
          points: amount,
          reason:
            reason ||
            "Списание бонусов",
          date: new Date(),
        });

      res.json({
        success: true,
        message:
          "Бонусы списаны",
        points: newPoints,
      });
    } catch (error) {
      console.error(
        "Ошибка списания бонусов:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка списания бонусов",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| История бонусных операций
|--------------------------------------------------------------------------
*/

app.get(
  "/api/clients/:id/operations",
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const clientRef =
        db
          .collection(
            CLIENTS_COLLECTION
          )
          .doc(id);

      const clientDoc =
        await clientRef.get();

      if (!clientDoc.exists) {
        return res.status(404).json({
          success: false,
          message:
            "Клиент не найден",
        });
      }

      const snapshot =
        await clientRef
          .collection("operations")
          .orderBy(
            "date",
            "desc"
          )
          .get();

      const operations =
        snapshot.docs.map(
          (operationDoc) => {
            const data =
              operationDoc.data();

            return {
              id: operationDoc.id,
              type: data.type,
              points: data.points,
              reason: data.reason,
              date:
                serializeFirestoreValue(
                  data.date
                ),
            };
          }
        );

      res.json({
        success: true,
        operations,
      });
    } catch (error) {
      console.error(
        "Ошибка получения истории:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка получения истории",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| BONUS CALCULATE
|--------------------------------------------------------------------------
*/

app.post(
  "/api/bonus/calculate",
  async (req, res) => {
    try {
      const {
        price,
        category,
        clientPoints,
      } = req.body;

      const result =
        calculateBonusDiscount({
          price,
          category,
          clientPoints,
        });

      res.json({
        success: true,
        result,
      });
    } catch (error) {
      console.error(
        "Ошибка расчёта бонусов:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка расчёта бонусов",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| AUTH
|--------------------------------------------------------------------------
*/

app.post(
  "/api/auth/login",
  async (req, res) => {
    try {
      const name =
        String(
          req.body.name || ""
        ).trim();

      const phone =
        normalizePhone(
          req.body.phone
        );

      if (!name || !phone) {
        return res.status(400).json({
          success: false,
          message:
            "Введите имя и телефон",
        });
      }

      const snapshot =
        await db
          .collection(
            CLIENTS_COLLECTION
          )
          .where(
            "phone",
            "==",
            phone
          )
          .where(
            "name",
            "==",
            name
          )
          .limit(1)
          .get();

      if (snapshot.empty) {
        return res.status(404).json({
          success: false,
          message:
            "Клиент не найден",
        });
      }

      const clientDoc =
        snapshot.docs[0];

      const clientData =
        clientDoc.data();

      res.json({
        success: true,

        client: {
          id: clientDoc.id,
          name:
            clientData.name,
          phone:
            clientData.phone,
          points:
            Number(
              clientData.points || 0
            ),
          createdAt:
            serializeFirestoreValue(
              clientData.createdAt
            ),
        },
      });
    } catch (error) {
      console.error(
        "Ошибка входа:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка входа",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| AUTH / регистрация или вход
|--------------------------------------------------------------------------
*/

app.post(
  "/api/auth",
  async (req, res) => {
    try {
      const name =
        String(
          req.body.name || ""
        ).trim();

      const phone =
        normalizePhone(
          req.body.phone
        );

      if (!name || !phone) {
        return res.status(400).json({
          success: false,
          message:
            "Введите имя и телефон",
        });
      }

      if (!validatePhone(phone)) {
        return res.status(400).json({
          success: false,
          message:
            "Некорректный телефон",
        });
      }

      const snapshot =
        await db
          .collection(
            CLIENTS_COLLECTION
          )
          .where(
            "phone",
            "==",
            phone
          )
          .limit(1)
          .get();

      /*
      |--------------------------------------------------------------------------
      | Клиент существует
      |--------------------------------------------------------------------------
      */

      if (!snapshot.empty) {
        const clientDoc =
          snapshot.docs[0];

        const clientData =
          clientDoc.data();

        return res.json({
          success: true,
          isNew: false,

          client: {
            id: clientDoc.id,
            ...clientData,

            createdAt:
              serializeFirestoreValue(
                clientData.createdAt
              ),
          },
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Новый клиент
      |--------------------------------------------------------------------------
      */

      const welcomeBonus =
        100000;

      const clientRef =
        db
          .collection(
            CLIENTS_COLLECTION
          )
          .doc();

      const client = {
        name,
        phone,
        points: welcomeBonus,
        createdAt: new Date(),
      };

      await clientRef.set(
        client
      );

      await clientRef
        .collection("operations")
        .doc()
        .set({
          type: "add",
          points: welcomeBonus,
          reason:
            "Приветственные бонусы",
          date: new Date(),
        });

      res.json({
        success: true,
        isNew: true,

        client: {
          id: clientRef.id,
          ...client,
          createdAt:
            client.createdAt.toISOString(),
        },
      });
    } catch (error) {
      console.error(
        "Ошибка авторизации:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка авторизации",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| ADMIN LOGIN
|--------------------------------------------------------------------------
*/

app.post(
  "/api/admin/login",
  async (req, res) => {
    try {
      const {
        login,
        password,
      } = req.body;

      if (!login || !password) {
        return res.status(400).json({
          success: false,
          message:
            "Введите логин и пароль",
        });
      }

      const snapshot =
        await db
          .collection(
            ADMINS_COLLECTION
          )
          .where(
            "login",
            "==",
            login
          )
          .limit(1)
          .get();

      if (snapshot.empty) {
        return res.status(401).json({
          success: false,
          message:
            "Администратор не найден",
        });
      }

      const adminDoc =
        snapshot.docs[0];

      const admin =
        adminDoc.data();

      const passwordCorrect =
        await bcrypt.compare(
          password,
          admin.passwordHash
        );

      if (!passwordCorrect) {
        return res.status(401).json({
          success: false,
          message:
            "Неверный пароль",
        });
      }

      res.json({
        success: true,

        admin: {
          id: adminDoc.id,
          name:
            admin.name || "",
          login:
            admin.login || login,
          role: "admin",
        },
      });
    } catch (error) {
      console.error(
        "Ошибка входа администратора:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка сервера",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| MOYSKLAD TEST
|--------------------------------------------------------------------------
*/

app.get(
  "/api/moysklad/test",
  async (req, res) => {
    try {
      const result =
        await testMoySklad();

      res.json({
        success: true,
        message:
          "МойСклад подключен",
        ...result,
      });
    } catch (error) {
      console.error(
        "Ошибка подключения к МойСклад:",
        error?.response?.data ||
          error?.message ||
          error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка подключения к МойСклад",
        error:
          error?.response?.data ||
          error?.message,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| MOYSKLAD PRODUCTS
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Получить весь ассортимент
|--------------------------------------------------------------------------
*/

app.get(
  "/api/moysklad/products",
  async (req, res) => {
    try {
      const products =
        await getProducts();

      res.json({
        success: true,
        count: products.length,
        products,
      });
    } catch (error) {
      console.error(
        "Ошибка получения товаров из МойСклад:",
        error?.response?.data ||
          error?.message ||
          error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка получения товаров из МойСклад",
        error:
          error?.response?.data ||
          error?.message,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Получить один товар
|--------------------------------------------------------------------------
*/

app.get(
  "/api/moysklad/products/:id",
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const product =
        await getProductById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Товар не найден в МойСклад",
        });
      }

      res.json({
        success: true,
        product,
      });
    } catch (error) {
      console.error(
        "Ошибка получения товара из МойСклад:",
        error?.response?.data ||
          error?.message ||
          error
      );

      if (
        error?.response?.status ===
        404
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Товар не найден в МойСклад",
        });
      }

      res.status(500).json({
        success: false,
        message:
          "Ошибка получения товара",
        error:
          error?.response?.data ||
          error?.message,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| СИНХРОНИЗАЦИЯ МойСклад → Firebase
|--------------------------------------------------------------------------
*/

app.post(
  "/api/moysklad/sync",
  async (req, res) => {
    try {
      const result =
        await syncMoySkladProductsToFirebase();

      res.json(result);
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
          error?.response?.data ||
          error?.message,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| АВТОМАТИЧЕСКАЯ СИНХРОНИЗАЦИЯ
|--------------------------------------------------------------------------
*/

const SYNC_INTERVAL = 30 * 60 * 1000; // 30 минут

async function runAutomaticSync() {
  console.log(
    "⏰ Автоматическая синхронизация МойСклад → Firebase"
  );

  try {
    const result =
      await syncMoySkladProductsToFirebase();

    console.log(
      "✅ Автоматическая синхронизация завершена:",
      result
    );
  } catch (error) {
    console.error(
      "❌ Ошибка автоматической синхронизации:",
      error
    );
  }
}

/*
|--------------------------------------------------------------------------
| ЗАПУСК
|--------------------------------------------------------------------------
*/

app.listen(
  PORT,
  async () => {
    console.log(
      `KUSAI MAX API запущен: http://localhost:${PORT}`
    );

    /*
     * Синхронизируем товары сразу после запуска сервера.
     */
    await runAutomaticSync();

    /*
     * Затем повторяем синхронизацию каждые 30 минут.
     */
    setInterval(
      runAutomaticSync,
      SYNC_INTERVAL
    );
  }
);