import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";

import { db } from "./firebaseAdmin.js";
import { calculateBonusDiscount } from "./bonus.js";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

const ONE_C_API_KEY =
  process.env.ONE_C_API_KEY || "KUSAI-MAX-1C-KEY-2026";

function validatePhone(phone) {
  const regex = /^\+7\d{10}$/;
  return regex.test(phone);
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

/* =========================================================
   HEALTH CHECK
========================================================= */

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

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "KUSAI MAX API работает",
    serverTime: new Date().toISOString(),
  });
});

/* =========================================================
   1C
========================================================= */

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
      return res.json({
        success: false,
        message: "Клиент не найден",
      });
    }

    const clientDoc = snapshot.docs[0];
    const data = clientDoc.data();

    res.json({
      success: true,
      client: {
        id: clientDoc.id,
        name: data.name || "",
        phone: data.phone || "",
        points: Number(data.points || 0),
        bonuses: Number(data.bonuses || 0),
        status: data.status || "MAX GOLD",
      },
    });
  } catch (error) {
    console.error("Ошибка поиска клиента для 1С:", error);

    res.status(500).json({
      success: false,
      message: "Ошибка сервера",
    });
  }
});

app.get("/api/1c/clients", async (req, res) => {
  if (!check1CAccess(req, res)) {
    return;
  }

  try {
    const snapshot = await db.collection("clients").get();

    const clients = snapshot.docs.map((clientDoc) => {
      const data = clientDoc.data();

      return {
        id: clientDoc.id,
        name: data.name || "",
        phone: data.phone || "",
        points: Number(data.points || 0),
        bonuses: Number(data.bonuses || 0),
        status: data.status || "MAX GOLD",
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : data.createdAt || null,
      };
    });

    res.json({
      success: true,
      count: clients.length,
      clients,
    });
  } catch (error) {
    console.error("Ошибка выгрузки клиентов для 1С:", error);

    res.status(500).json({
      success: false,
      message: "Ошибка получения клиентов",
    });
  }
});

/* =========================================================
   CLIENTS
========================================================= */

app.get("/api/clients", async (req, res) => {
  try {
    const snapshot = await db.collection("clients").get();

    const clients = snapshot.docs.map((clientDoc) => {
      const data = clientDoc.data();

      return {
        id: clientDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : data.createdAt || null,
      };
    });

    res.json({
      success: true,
      count: clients.length,
      clients,
    });
  } catch (error) {
    console.error("Ошибка получения клиентов:", error);

    res.status(500).json({
      success: false,
      message: "Ошибка получения клиентов",
    });
  }
});

app.get("/api/clients/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const clientDoc = await db
      .collection("clients")
      .doc(id)
      .get();

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
        ...data,
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : data.createdAt || null,
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

app.post("/api/clients", async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Введите имя и телефон",
      });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        message:
          "Телефон должен начинаться с +7 и содержать 11 цифр",
      });
    }

    const existingSnapshot = await db
      .collection("clients")
      .where("phone", "==", phone)
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      return res.status(409).json({
        success: false,
        message:
          "Клиент с таким номером телефона уже существует",
      });
    }

    const welcomeBonus = 100000;

    const clientRef = db.collection("clients").doc();

    const client = {
      name,
      phone,
      login: name,
      points: welcomeBonus,
      bonuses: welcomeBonus,
      orders: 0,
      status: "NEW CLIENT",
      role: "user",
      createdAt: new Date(),
      source: "api",
      welcomeBonus: true,
    };

    await clientRef.set(client);

    await clientRef.collection("operations").add({
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

app.patch("/api/clients/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, points, bonuses, status } = req.body;

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

    if (bonuses !== undefined) {
      updates.bonuses = Number(bonuses);
    }

    if (status !== undefined) {
      updates.status = status;
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

/* =========================================================
   CLIENT PROFILE
========================================================= */

app.get("/api/clients/:id/profile", async (req, res) => {
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

    const operationsSnapshot = await clientRef
      .collection("operations")
      .orderBy("date", "desc")
      .get();

    const operations = operationsSnapshot.docs.map(
      (operationDoc) => {
        const data = operationDoc.data();

        return {
          id: operationDoc.id,
          type: data.type,
          points: Number(data.points || 0),
          reason: data.reason || "",
          date: data.date?.toDate
            ? data.date.toDate().toISOString()
            : data.date || null,
        };
      }
    );

    const client = clientDoc.data();

    res.json({
      success: true,
      client: {
        id: clientDoc.id,
        ...client,
        createdAt: client.createdAt?.toDate
          ? client.createdAt.toDate().toISOString()
          : client.createdAt || null,
        operations,
      },
    });
  } catch (error) {
    console.error("Ошибка получения профиля:", error);

    res.status(500).json({
      success: false,
      message: "Ошибка получения профиля",
    });
  }
});

/* =========================================================
   OPERATIONS
========================================================= */

app.get("/api/clients/:id/operations", async (req, res) => {
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

    const snapshot = await clientRef
      .collection("operations")
      .orderBy("date", "desc")
      .get();

    const operations = snapshot.docs.map((operationDoc) => {
      const data = operationDoc.data();

      return {
        id: operationDoc.id,
        type: data.type,
        points: Number(data.points || 0),
        reason: data.reason || "",
        date: data.date?.toDate
          ? data.date.toDate().toISOString()
          : null,
      };
    });

    res.json({
      success: true,
      operations,
    });
  } catch (error) {
    console.error("Ошибка получения истории:", error);

    res.status(500).json({
      success: false,
      message: "Ошибка получения истории",
    });
  }
});

/* =========================================================
   BONUS ADD
========================================================= */

app.post("/api/clients/:id/bonus/add", async (req, res) => {
  try {
    const { id } = req.params;
    const { points, reason } = req.body;

    const amount = Number(points);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Некорректное количество бонусов",
      });
    }

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
    const newPoints = currentPoints + amount;

    await clientRef.update({
      points: newPoints,
      bonuses: newPoints,
    });

    await clientRef.collection("operations").add({
      type: "add",
      points: amount,
      reason: reason || "Начисление бонусов",
      date: new Date(),
    });

    res.json({
      success: true,
      message: "Бонусы начислены",
      points: newPoints,
    });
  } catch (error) {
    console.error("Ошибка начисления бонусов:", error);

    res.status(500).json({
      success: false,
      message: "Ошибка начисления бонусов",
    });
  }
});

/* =========================================================
   BONUS REMOVE
========================================================= */

app.post("/api/clients/:id/bonus/remove", async (req, res) => {
  try {
    const { id } = req.params;
    const { points, reason } = req.body;

    const amount = Number(points);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Некорректное количество бонусов",
      });
    }

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

    if (amount > currentPoints) {
      return res.status(400).json({
        success: false,
        message: "Недостаточно бонусов",
      });
    }

    const newPoints = currentPoints - amount;

    await clientRef.update({
      points: newPoints,
      bonuses: newPoints,
    });

    await clientRef.collection("operations").add({
      type: "remove",
      points: amount,
      reason: reason || "Списание бонусов",
      date: new Date(),
    });

    res.json({
      success: true,
      message: "Бонусы списаны",
      points: newPoints,
    });
  } catch (error) {
    console.error("Ошибка списания бонусов:", error);

    res.status(500).json({
      success: false,
      message: "Ошибка списания бонусов",
    });
  }
});

/* =========================================================
   AUTH CLIENT
========================================================= */

app.post("/api/auth/login", async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Введите имя и телефон",
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
        success: false,
        message: "Клиент не найден",
      });
    }

    const clientDoc = snapshot.docs[0];
    const clientData = clientDoc.data();

    res.json({
      success: true,
      client: {
        id: clientDoc.id,
        name: clientData.name,
        phone: clientData.phone,
        points: Number(clientData.points || 0),
        bonuses: Number(clientData.bonuses || 0),
        status: clientData.status || "MAX START",
        orders: Number(clientData.orders || 0),
        createdAt: clientData.createdAt?.toDate
          ? clientData.createdAt.toDate().toISOString()
          : clientData.createdAt || null,
      },
    });
  } catch (error) {
    console.error("Ошибка входа клиента:", error);

    res.status(500).json({
      success: false,
      message: "Ошибка входа",
    });
  }
});

app.post("/api/auth", async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Введите имя и телефон",
      });
    }

    const snapshot = await db
      .collection("clients")
      .where("phone", "==", phone)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const clientDoc = snapshot.docs[0];
      const clientData = clientDoc.data();

      return res.json({
        success: true,
        isNew: false,
        client: {
          id: clientDoc.id,
          ...clientData,
          createdAt: clientData.createdAt?.toDate
            ? clientData.createdAt.toDate().toISOString()
            : clientData.createdAt || null,
        },
      });
    }

    const welcomeBonus = 100000;

    const clientRef = db.collection("clients").doc();

    const client = {
      name,
      phone,
      login: name,
      points: welcomeBonus,
      bonuses: welcomeBonus,
      orders: 0,
      status: "NEW CLIENT",
      role: "user",
      createdAt: new Date(),
      source: "telegram",
      welcomeBonus: true,
    };

    await clientRef.set(client);

    await clientRef.collection("operations").add({
      type: "add",
      points: welcomeBonus,
      reason: "Приветственные бонусы",
      date: new Date(),
    });

    res.json({
      success: true,
      isNew: true,
      client: {
        id: clientRef.id,
        ...client,
        createdAt: client.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Ошибка авторизации:", error);

    res.status(500).json({
      success: false,
      message: "Ошибка авторизации",
    });
  }
});

/* =========================================================
   ADMIN LOGIN
   ВАЖНО:
   используем коллекцию adminUsers,
   потому что именно там у тебя находится администратор.
========================================================= */

app.post("/api/admin/login", async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({
        success: false,
        message: "Введите логин и пароль",
      });
    }

    const snapshot = await db
      .collection("adminUsers")
      .where("login", "==", login)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(401).json({
        success: false,
        message: "Неверный логин или пароль",
      });
    }

    const adminDoc = snapshot.docs[0];
    const admin = adminDoc.data();

    if (!admin.passwordHash) {
      console.error(
        "У администратора отсутствует passwordHash"
      );

      return res.status(500).json({
        success: false,
        message: "У администратора не настроен пароль",
      });
    }

    const passwordValid = await bcrypt.compare(
      password,
      admin.passwordHash
    );

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: "Неверный логин или пароль",
      });
    }

    return res.json({
      success: true,
      admin: {
        id: adminDoc.id,
        login: admin.login,
        name: admin.name || "Administrator",
        role: "admin",
      },
    });
  } catch (error) {
    console.error(
      "Ошибка входа администратора:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Ошибка сервера",
    });
  }
});

/* =========================================================
   BONUS CALCULATOR
========================================================= */

app.post("/api/bonus/calculate", async (req, res) => {
  try {
    const {
      price,
      category,
      clientPoints,
    } = req.body;

    const result = calculateBonusDiscount({
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
      message: "Ошибка расчёта бонусов",
    });
  }
});

/* =========================================================
   404
========================================================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
    path: req.path,
  });
});

/* =========================================================
   VERCEL
========================================================= */

// Для Vercel НЕ используем app.listen().
export default app;