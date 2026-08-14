import "dotenv/config";
import express from "express";
import cors from "cors";
import { db } from "./firebaseAdmin.js";
import { calculateBonusDiscount } from "./bonus.js";
import bcrypt from "bcryptjs";

import {
  getProducts,
  getProductById,
  testMoySklad,
} from "./moysklad.js";

function validatePhone(phone) {

  const regex = /^\+7\d{10}$/;

  return regex.test(phone);

}

// =================================
// СИНХРОНИЗАЦИЯ ТОВАРОВ С FIREBASE
// =================================

async function syncMoySkladProductsToFirebase() {
  console.log("======================================");
  console.log("FIREBASE: НАЧАЛО СИНХРОНИЗАЦИИ ТОВАРОВ");
  console.log("======================================");

  try {
    // ---------------------------------
    // 1. Получаем товары из МойСклад
    // ---------------------------------

    console.log("1. Получаем товары из МойСклад...");

    const products = await getProducts();

    console.log(
      `2. Получено товаров из МойСклад: ${products.length}`
    );

    if (!products.length) {
      return {
        success: true,
        count: 0,
        created: 0,
        updated: 0,
        message: "МойСклад не вернул товары",
      };
    }

    // ---------------------------------
    // 2. Собираем ID товаров
    // ---------------------------------

    const productIds = products
      .map((product) => product?.id)
      .filter(Boolean);

    console.log(
      `3. ID товаров собрано: ${productIds.length}`
    );

    // ---------------------------------
    // 3. Получаем существующие товары
    //    из Firebase пачками
    // ---------------------------------

    console.log(
      "4. Получаем существующие товары из Firebase..."
    );

    const existingProducts = new Map();

    const firestoreReadBatchSize = 300;

    for (
      let i = 0;
      i < productIds.length;
      i += firestoreReadBatchSize
    ) {
      const idsChunk = productIds.slice(
        i,
        i + firestoreReadBatchSize
      );

      const refs = idsChunk.map((id) =>
        db.collection("products").doc(id)
      );

      const snapshots =
        await db.getAll(...refs);

      for (const snapshot of snapshots) {
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
      `5. Существующих товаров в Firebase: ${existingProducts.size}`
    );

    // ---------------------------------
    // 4. Записываем товары
    // ---------------------------------

    let created = 0;
    let updated = 0;

    const firestoreWriteBatchSize = 400;

    for (
      let i = 0;
      i < products.length;
      i += firestoreWriteBatchSize
    ) {
      const chunk = products.slice(
        i,
        i + firestoreWriteBatchSize
      );

      const batch = db.batch();

      for (const product of chunk) {
        if (!product?.id) {
          continue;
        }

        const productRef = db
          .collection("products")
          .doc(product.id);

        const existingProduct =
          existingProducts.get(product.id);

        // ---------------------------------
        // Сохраняем данные сайта
        // ---------------------------------

        const firebaseProduct = {
          // Постоянный ID МойСклад
          id: product.id,

          // Основная информация
          title: product.name || "",
          name: product.name || "",

          description:
            product.description || "",

          category:
            product.category || null,

          // Цена
          price:
            Number(product.price || 0),

          // Идентификаторы
          article:
            product.article || null,

          code:
            product.code || null,

          externalCode:
            product.externalCode || null,

          barcode:
            product.barcode || null,

          // Остатки
          stock:
            Number(product.stock || 0),

          reserve:
            Number(product.reserve || 0),

          inTransit:
            Number(product.inTransit || 0),

          quantity:
            Number(product.quantity || 0),

          // Наличие
          inStock:
            Number(product.stock || 0) > 0 ||
            Number(product.quantity || 0) > 0,

          // Архив
          archived:
            Boolean(product.archived),

          // Характеристики
          characteristics:
            Array.isArray(product.characteristics)
              ? product.characteristics
              : [],

          // Варианты
          variantsCount:
            Number(product.variantsCount || 0),

          // Вес
          weight:
            product.weight ?? null,

          // Объём
          volume:
            product.volume ?? null,

          // Дата обновления МойСклад
          updated:
            product.updated || null,

          // ---------------------------------
          // Поля сайта
          // ---------------------------------

          // Сохраняем существующий hidden.
          // Для нового товара false.
          hidden:
            existingProduct
              ? Boolean(
                  existingProduct.hidden ?? false
                )
              : false,

          // Картинки пока не загружаем.
          // Если они уже были добавлены вручную —
          // сохраняем их.
          images:
            existingProduct?.images || [],

          // Рейтинг сохраняем.
          rating:
            existingProduct
              ? Number(
                  existingProduct.rating || 0
                )
              : 0,

          // Отзывы сохраняем.
          reviews:
            existingProduct
              ? Number(
                  existingProduct.reviews || 0
                )
              : 0,

          // Доставка сохраняется,
          // если она уже была в Firebase.
          delivery:
            existingProduct?.delivery ||
            "Уточняется",
        };

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

    // ---------------------------------
    // 5. Результат
    // ---------------------------------

    console.log("======================================");
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
    console.log("======================================");

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
      error.response?.data ||
      error.message ||
      error
    );

    throw error;
  }
}

const app = express();

const PORT = process.env.PORT || 3001;
const ONE_C_API_KEY =
  process.env.ONE_C_API_KEY ||
  "KUSAI-MAX-1C-KEY-2026";

app.use(cors());
app.use(express.json());

function check1CAccess(req, res) {

  const apiKey = req.headers["x-api-key"];


  if (apiKey !== ONE_C_API_KEY) {

    res.status(403).json({
      success: false,
      message: "Нет доступа"
    });

    return false;
  }


  return true;
}

// --------------------------------
// Проверка соединения для 1С
// --------------------------------

app.get("/api/1c/test", (req, res) => {

  const apiKey = req.headers["x-api-key"];


  if (apiKey !== ONE_C_API_KEY) {

    return res.status(403).json({
      success: false,
      message: "Нет доступа"
    });

  }


  res.json({
    success: true,
    message: "KUSAI MAX API подключен",
    serverTime: new Date().toISOString()
  });

});

app.get("/api/1c/client", async (req, res) => {

  try {

    let phone = String(req.query.phone || "").trim();

    if (!phone.startsWith("+")) {
      phone = "+" + phone;
    }


    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Не указан телефон"
      });
    }


    const snapshot = await db
      .collection("clients")
      .where("phone", "==", phone)
      .limit(1)
      .get();


    if (snapshot.empty) {

      return res.json({
        success: false,
        message: "Клиент не найден"
      });

    }


    const doc = snapshot.docs[0];
    const data = doc.data();


    res.json({

      success: true,

      client: {

        id: doc.id,

        name: data.name,

        phone: data.phone,

        points: data.points || 0,

        status: data.status || "MAX GOLD"

      }

    });


  } catch (error) {

    console.error(
      "Ошибка поиска клиента:",
      error
    );


    res.status(500).json({
      success: false,
      message: "Ошибка сервера"
    });

  }

});

/*
--------------------------------
API ДЛЯ 1С
Получение клиентов KUSAI MAX
--------------------------------
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
        name: data.name,
        phone: data.phone,
        points: data.points || 0,
        createdAt: data.createdAt
          ? data.createdAt.toDate()
          : null
      });


    });


    res.json({
      success: true,
      count: clients.length,
      clients
    });


  } catch (error) {

    console.error(
      "Ошибка выгрузки клиентов для 1С:",
      error
    );


    res.status(500).json({
      success: false,
      message: "Ошибка получения клиентов"
    });

  }
});


/*
|--------------------------------------------------------------------------
| Проверка API
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "KUSAI MAX REST API работает",
  });
});

app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "KUSAI MAX API работает",
  });
});

/*
|--------------------------------------------------------------------------
| GET /api/clients
| Получить всех клиентов из Firebase
|--------------------------------------------------------------------------
*/

app.get("/api/client", async (req,res)=>{

try {

const { phone } = req.query;


if (!phone){
return res.status(400).json({
success:false,
message:"Не указан телефон"
});
}


// GET /api/clients/phone/:phone
// Найти клиента по номеру телефона

app.get("/api/clients/phone/:phone", async (req, res) => {
  try {
    const { phone } = req.params;

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

    res.json({
      success: true,
      client: {
        id: clientDoc.id,
        ...clientDoc.data(),
      },
    });

  } catch (error) {
    console.error("Ошибка поиска клиента:", error);

    res.status(500).json({
      success: false,
      message: "Ошибка поиска клиента",
    });
  }
});


const snapshot = await db
.collection("clients")
.where("phone","==",phone)
.limit(1)
.get();


if(snapshot.empty){

return res.status(404).json({
success:false,
message:"Клиент не найден"
});

}


const doc = snapshot.docs[0];


res.json({
success:true,
client:{
id:doc.id,
...doc.data()
}
});


}catch(error){

console.error(error);

res.status(500).json({
success:false,
message:"Ошибка поиска клиента"
});

}

});
/*
|--------------------------------------------------------------------------
| GET /api/clients/:id
| Получить одного клиента
|--------------------------------------------------------------------------
*/

app.get("/api/clients/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const clientRef = db.collection("clients").doc(id);
    const clientDoc = await clientRef.get();

    if (!clientDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Клиент не найден",
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
    console.error("Ошибка получения клиента:", error);

    res.status(500).json({
      success: false,
      message: "Ошибка получения клиента",
    });
  }
});

app.get("/api/clients/:id/profile", async (req, res) => {

  try {

    const { id } = req.params;


    const clientRef = db
      .collection("clients")
      .doc(id);


    const clientDoc = await clientRef.get();


    if (!clientDoc.exists) {

      return res.status(404).json({

        success:false,

        message:"Клиент не найден"

      });

    }


    const operationsSnapshot = await clientRef
      .collection("operations")
      .orderBy("date", "desc")
      .get();



    const operations = operationsSnapshot.docs.map(doc => {

      const data = doc.data();


      return {

        id: doc.id,

        ...data,

        date:
          data.date?.toDate
          ? data.date.toDate().toISOString()
          : data.date

      };

    });



    const client = clientDoc.data();



    res.json({

      success:true,

      client:{

        id: clientDoc.id,

        ...client,

        createdAt:
          client.createdAt?.toDate
          ? client.createdAt.toDate().toISOString()
          : client.createdAt,

        operations

      }

    });



  } catch(error) {

    console.error(
      "Ошибка профиля:",
      error
    );


    res.status(500).json({

      success:false,

      message:"Ошибка получения профиля"

    });

  }

});


/*
|--------------------------------------------------------------------------
| POST /api/clients
| Создать клиента в Firebase
|--------------------------------------------------------------------------
*/

app.post("/api/clients", async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (!name || !phone) {

      return res.status(400).json({
        success:false,
        message:"Введите имя и телефон"
      });

    }


    if (!validatePhone(phone)) {

      return res.status(400).json({

        success:false,

        message:"Телефон должен начинаться с +7 и содержать 11 цифр"

      });

    }

    /*
     * Проверяем, существует ли клиент
     * с таким номером телефона.
     */

    const existingSnapshot = await db
      .collection("clients")
      .where("phone", "==", phone)
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      return res.status(409).json({
        success: false,
        message: "Клиент с таким номером телефона уже существует",
      });
    }

    /*
     * Создаём новый документ.
     */

    const clientRef = db.collection("clients").doc();

    const welcomeBonus = 100000;


    const client = {
      name,
      phone,
      points: welcomeBonus,
      createdAt: new Date(),
    };

    await clientRef.set(client);


    // Создаем приветственную операцию

    const operationRef =
      clientRef.collection("operations").doc();


    await operationRef.set({

      type: "add",

      points: welcomeBonus,

      reason: "Приветственные бонусы",

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
    console.error("Ошибка создания клиента:", error);

    res.status(500).json({
      success: false,
      message: "Ошибка создания клиента",
    });
  }
});

/*
|--------------------------------------------------------------------------
| PATCH /api/clients/:id
| Обновить данные клиента
|--------------------------------------------------------------------------
*/

app.patch("/api/clients/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, points } = req.body;

    const clientRef = db.collection("clients").doc(id);

    const clientDoc = await clientRef.get();

    if (!clientDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Клиент не найден",
      });
    }

    const updates = {};

    if (name !== undefined) {
      updates.name = name;
    }

    if (phone !== undefined) {
      updates.phone = phone;
    }

    if (points !== undefined) {
      updates.points = Number(points);
    }

    await clientRef.update(updates);

    const updatedDoc = await clientRef.get();

    res.json({
      success: true,
      client: {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      },
    });
  } catch (error) {
    console.error("Ошибка обновления клиента:", error);

    res.status(500).json({
      success: false,
      message: "Ошибка обновления клиента",
    });
  }
});

// GET /api/clients/phone/:phone
// Поиск клиента по номеру телефона

app.get("/api/clients/phone/:phone", async (req, res) => {
  try {
    const { phone } = req.params;

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

    res.json({
      success: true,
      client: {
        id: clientDoc.id,
        ...clientDoc.data(),
      },
    });

  } catch (error) {
    console.error("Ошибка поиска клиента:", error);

    res.status(500).json({
      success: false,
      message: "Ошибка поиска клиента",
    });
  }
});

// POST /api/clients/:id/bonus/add
// Начисление бонусов клиенту

app.post("/api/clients/:id/bonus/add", async (req, res) => {
  try {
    const { id } = req.params;
    const { points, reason } = req.body;

    const clientRef = db.collection("clients").doc(id);

    const clientDoc = await clientRef.get();

    if (!clientDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Клиент не найден",
      });
    }


    const client = clientDoc.data();

    const newPoints =
      Number(client.points || 0) + Number(points);


    await clientRef.update({
      points: newPoints,
    });


    await clientRef
      .collection("operations")
      .add({
        type: "add",
        points: Number(points),
        reason: reason || "Начисление бонусов",
        date: new Date(),
      });


    res.json({
      success: true,
      message: "Бонусы начислены",
      points: newPoints,
    });


  } catch (error) {

    console.error(
      "Ошибка начисления бонусов:",
      error
    );

    res.status(500).json({
      success:false,
      message:"Ошибка начисления бонусов",
    });
  }
});

// POST /api/clients/:id/bonus/remove
// Списание бонусов клиента

app.post("/api/clients/:id/bonus/remove", async (req, res) => {
  try {
    const { id } = req.params;
    const { points, reason } = req.body;


    const clientRef = db.collection("clients").doc(id);

    const clientDoc = await clientRef.get();


    if (!clientDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Клиент не найден",
      });
    }


    const client = clientDoc.data();


    const currentPoints = Number(client.points || 0);
    const removePoints = Number(points);


    if (removePoints > currentPoints) {
      return res.status(400).json({
        success: false,
        message: "Недостаточно бонусов",
      });
    }


    const newPoints = currentPoints - removePoints;


    await clientRef.update({
      points: newPoints,
    });


    await clientRef
      .collection("operations")
      .add({
        type: "remove",
        points: removePoints,
        reason: reason || "Списание бонусов",
        date: new Date(),
      });


    res.json({
      success: true,
      message: "Бонусы списаны",
      points: newPoints,
    });


  } catch (error) {

    console.error(
      "Ошибка списания бонусов:",
      error
    );


    res.status(500).json({
      success:false,
      message:"Ошибка списания бонусов",
    });

  }
});

/*
|--------------------------------------------------------------------------
| Запуск сервера
|--------------------------------------------------------------------------
*/

// GET /api/clients/:id/operations
// История бонусных операций клиента

app.get("/api/clients/:id/operations", async (req, res) => {
  try {
    const { id } = req.params;

    const clientRef = db
      .collection("clients")
      .doc(id);


    const clientDoc = await clientRef.get();


    if (!clientDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Клиент не найден",
      });
    }


    const snapshot = await clientRef
      .collection("operations")
      .orderBy("date", "desc")
      .get();


    const operations = snapshot.docs.map(doc => {

      const data = doc.data();

      return {
        id: doc.id,
        type: data.type,
        points: data.points,
        reason: data.reason,
        date: data.date?.toDate()
          ? data.date.toDate().toISOString()
          : null,
      };

    });


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
      success:false,
      message:"Ошибка получения истории",
    });

  }
});

// GET /api/clients/:id/profile
// Полный профиль клиента

app.get("/api/clients/:id/profile", async (req, res) => {
  try {
    const { id } = req.params;


    const clientRef = db
      .collection("clients")
      .doc(id);


    const clientDoc = await clientRef.get();


    if (!clientDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Клиент не найден",
      });
    }


    const clientData = clientDoc.data();


    const operationsSnapshot = await clientRef
      .collection("operations")
      .orderBy("date", "desc")
      .get();


    const operations = operationsSnapshot.docs.map(doc => {

      const data = doc.data();


      return {
        id: doc.id,
        type: data.type,
        points: data.points,
        reason: data.reason,
        date: data.date?.toDate()
          ? data.date.toDate().toISOString()
          : null,
      };

    });


    res.json({

      success: true,

      client: {
        id: clientDoc.id,
        name: clientData.name,
        phone: clientData.phone,
        points: clientData.points || 0,
        createdAt: clientData.createdAt?.toDate
          ? clientData.createdAt.toDate().toISOString()
          : null,

        operations,

      }

    });


  } catch (error) {

    console.error(
      "Ошибка получения профиля клиента:",
      error
    );


    res.status(500).json({
      success:false,
      message:"Ошибка получения профиля клиента",
    });

  }
});

// Расчёт бонусной скидки

app.post("/api/bonus/calculate", async (req,res)=>{

try {


const {
price,
category,
clientPoints
}=req.body;



const result =
calculateBonusDiscount({

price,
category,
clientPoints

});



res.json({

success:true,

result

});



}
catch(error){

console.error(
"Ошибка расчёта бонусов:",
error
);


res.status(500).json({

success:false,

message:"Ошибка расчёта бонусов"

});

}


});




app.post("/api/auth/login", async (req, res) => {

  try {

    const { name, phone } = req.body;


    if (!name || !phone) {

      return res.status(400).json({
        success:false,
        message:"Введите имя и телефон"
      });

    }


    const snapshot = await db
      .collection("clients")
      .where("phone", "==", phone)
      .where("name", "==", name)
      .limit(1)
      .get();



    if (snapshot.empty) {

      return res.status(404).json({

        success:false,

        message:"Клиент не найден"

      });

    }



    const clientDoc = snapshot.docs[0];


    const clientData = clientDoc.data();


    res.json({

      success:true,

      client:{

        id: clientDoc.id,

        name: clientData.name,

        phone: clientData.phone,

        points: clientData.points,

        createdAt:
          clientData.createdAt?.toDate
          ? clientData.createdAt.toDate().toISOString()
          : clientData.createdAt

      }

    });



  } catch(error) {


    console.error(
      "Ошибка входа:",
      error
    );


    res.status(500).json({

      success:false,

      message:"Ошибка входа"

    });


  }

});


app.post("/api/auth", async (req, res) => {

  try {

    const { name, phone } = req.body;


    if (!name || !phone) {

      return res.status(400).json({
        success:false,
        message:"Введите имя и телефон"
      });

    }


    // ищем клиента

    const snapshot = await db
      .collection("clients")
      .where("phone", "==", phone)
      .limit(1)
      .get();



    // ==========================
    // Клиент уже существует
    // ==========================

    if (!snapshot.empty) {


      const clientDoc = snapshot.docs[0];

      const clientData = clientDoc.data();


      return res.json({

        success:true,

        isNew:false,

        client:{

          id:clientDoc.id,

          ...clientData,

          createdAt:
          clientData.createdAt?.toDate
          ? clientData.createdAt.toDate().toISOString()
          : clientData.createdAt

        }

      });

    }



    // ==========================
    // Новый клиент
    // ==========================


    const welcomeBonus = 100000;


    const clientRef =
      db.collection("clients").doc();



    const client = {

      name,

      phone,

      points:welcomeBonus,

      createdAt:new Date()

    };


    await clientRef.set(client);



    // история бонусов

    const operationRef =
      clientRef.collection("operations").doc();



    await operationRef.set({

      type:"add",

      points:welcomeBonus,

      reason:"Приветственные бонусы",

      date:new Date()

    });



    res.json({

      success:true,

      isNew:true,

      client:{

        id:clientRef.id,

        ...client,

        createdAt:
        client.createdAt.toISOString()

      }

    });



  } catch(error) {


    console.error(
      "Ошибка авторизации:",
      error
    );


    res.status(500).json({

      success:false,

      message:"Ошибка авторизации"

    });

  }

});

// =================================
// Вход администратора через Firebase
// =================================

app.post("/api/admin/login", async (req, res) => {

  try {

    const {
      login,
      password
    } = req.body;


    if (!login || !password) {

      return res.status(400).json({

        success:false,

        message:"Введите логин и пароль"

      });

    }



    const snapshot =
      await db
        .collection("admins")
        .where(
          "login",
          "==",
          login
        )
        .limit(1)
        .get();



    if(snapshot.empty){

      return res.status(401).json({

        success:false,

        message:"Администратор не найден"

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



    if(!passwordCorrect){

      return res.status(401).json({

        success:false,

        message:"Неверный пароль"

      });

    }



    res.json({

      success:true,

      admin:{

        id:adminDoc.id,

        name:admin.name,

        login:admin.login,

        role:"admin"

      }

    });



  } catch(error){


    console.error(
      "Ошибка входа администратора:",
      error
    );


    res.status(500).json({

      success:false,

      message:"Ошибка сервера"

    });


  }

});

// =================================
// MOYSKLAD
// =================================

// Проверка соединения с МойСклад
app.get("/api/moysklad/test", async (req, res) => {
  try {
    const result = await testMoySklad();

    res.json({
      success: true,
      message: "МойСклад подключен",
      ...result,
    });

  } catch (error) {
    console.error(
      "Ошибка подключения к МойСклад:",
      error.response?.data || error.message
    );

    res.status(500).json({
      success: false,
      message: "Ошибка подключения к МойСклад",
      error:
        error.response?.data ||
        error.message,
    });
  }
});


// Получить весь ассортимент
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
        error.response?.data ||
        error.message
      );

      res.status(500).json({

        success: false,

        message:
          "Ошибка получения товаров из МойСклад",

        error:
          error.response?.data ||
          error.message,

      });

    }
  }
);


// Получить один товар
app.get(
  "/api/moysklad/products/:id",
  async (req, res) => {

    try {

      const { id } =
        req.params;

      const product =
        await getProductById(id);

      res.json({

        success: true,

        product,

      });

    } catch (error) {

      console.error(
        "Ошибка получения товара из МойСклад:",
        error.response?.data ||
        error.message
      );

      if (
        error.response?.status === 404
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
          error.response?.data ||
          error.message,

      });

    }
  }
);

// =================================
// POST /api/moysklad/sync
// Синхронизация МойСклад -> Firebase
// =================================

app.post(
  "/api/moysklad/sync",
  async (req, res) => {
    try {
      const result =
        await syncMoySkladProductsToFirebase();

      res.json(result);

    } catch (error) {
      console.error(
        "Ошибка синхронизации МойСклад -> Firebase:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Ошибка синхронизации товаров",
        error:
          error.response?.data ||
          error.message,
      });
    }
  }
);

app.listen(PORT, () => {
  console.log(
    `KUSAI MAX API запущен: http://localhost:${PORT}`
  );
});