import "dotenv/config";
import express from "express";
import cors from "cors";
import { db } from "../api/firebaseAdmin.js";

const app = express();

const PORT = process.env.PORT || 3002;

// Ключ для доступа 1С
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
| Проверка доступа 1С
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
| Проверка соединения 1С с KUSAI MAX API
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
| Получение всех клиентов из Firestore
|--------------------------------------------------------------------------
*/

app.get("/api/1c/clients", async (req, res) => {
  if (!check1CAccess(req, res)) {
    return;
  }

  try {
    const snapshot = await db.collection("clients").get();

    const clients = [];

    snapshot.forEach((doc) => {
      const data = doc.data();

      clients.push({
        id: doc.id,
        name: data.name || "",
        phone: data.phone || "",
        points: Number(data.points || 0),
        status: data.status || "MAX GOLD",

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
    console.error("Ошибка получения клиентов для 1С:", error);

    res.status(500).json({
      success: false,
      message: "Ошибка получения клиентов",
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET /api/1c/client?phone=+79991234567
|
| Поиск одного клиента по телефону
|--------------------------------------------------------------------------
*/

app.get("/api/1c/client", async (req, res) => {
  if (!check1CAccess(req, res)) {
    return;
  }

  try {
    let phone = String(req.query.phone || "").trim();

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
        status: data.status || "MAX GOLD",

        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : data.createdAt || null,
      },
    });
  } catch (error) {
    console.error("Ошибка поиска клиента для 1С:", error);

    res.status(500).json({
      success: false,
      message: "Ошибка поиска клиента",
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET /api/1c/client/:id
|
| Получение клиента по ID Firestore
|--------------------------------------------------------------------------
*/

app.get("/api/1c/client/:id", async (req, res) => {
  if (!check1CAccess(req, res)) {
    return;
  }

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

    const data = clientDoc.data();

    res.json({
      success: true,

      client: {
        id: clientDoc.id,
        name: data.name || "",
        phone: data.phone || "",
        points: Number(data.points || 0),
        status: data.status || "MAX GOLD",

        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : data.createdAt || null,
      },
    });
  } catch (error) {
    console.error("Ошибка получения клиента для 1С:", error);

    res.status(500).json({
      success: false,
      message: "Ошибка получения клиента",
    });
  }
});

/*
|--------------------------------------------------------------------------
| Обработка неизвестных маршрутов
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Метод API не найден",
    path: req.originalUrl,
  });
});

/*
|--------------------------------------------------------------------------
| Запуск сервера
|--------------------------------------------------------------------------
*/

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Production API запущен на порту ${PORT}`
  );
});