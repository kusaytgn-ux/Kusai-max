import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";

import { db } from "./firebaseAdmin.js";
import { calculateBonusDiscount } from "./bonus.js";

const app = express();

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

// =====================================================
// HEALTH
// =====================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "KUSAI MAX API работает",
    serverTime: new Date().toISOString(),
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
    message: "KUSAI MAX API подключен",
    serverTime: new Date().toISOString(),
  });
});

// =====================================================
// ADMIN LOGIN
// =====================================================

app.post("/api/admin/login", async (req, res) => {
  try {
    const { login, password } = req.body || {};

    if (!login || !password) {
      return res.status(400).json({
        success: false,
        message: "Введите логин и пароль",
      });
    }

    const snapshot = await db
      .collection("adminUsers")
      .where("login", "==", String(login).trim())
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
      return res.status(500).json({
        success: false,
        message: "У администратора не настроен пароль",
      });
    }

    const passwordValid = await bcrypt.compare(
      String(password),
      String(admin.passwordHash)
    );

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: "Неверный логин или пароль",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Вход выполнен",
      admin: {
        id: adminDoc.id,
        login: admin.login,
        name: admin.name || "Administrator",
        role: admin.role || "admin",
      },
    });
  } catch (error) {
    console.error("ADMIN LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Ошибка сервера",
    });
  }
});

// =====================================================
// PRODUCT GROUPS
// =====================================================

// GET ALL GROUPS

app.get("/api/product-groups", async (req, res) => {
  try {
    const snapshot = await db
      .collection("productGroups")
      .get();

    const groups = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : data.createdAt ?? null,
      };
    });

    return res.json({
      success: true,
      groups,
    });
  } catch (error) {
    console.error("GET PRODUCT GROUPS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Ошибка загрузки групп",
    });
  }
});

// CREATE GROUP

app.post("/api/product-groups", async (req, res) => {
  try {
    const { name } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Введите название группы",
      });
    }

    const groupName = String(name).trim();

    const existingSnapshot = await db
      .collection("productGroups")
      .where("name", "==", groupName)
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      return res.status(409).json({
        success: false,
        message: "Такая группа уже существует",
      });
    }

    const group = {
      name: groupName,
      createdAt: new Date(),
    };

    const groupRef = await db
      .collection("productGroups")
      .add(group);

    return res.status(201).json({
      success: true,
      message: "Группа создана",
      group: {
        id: groupRef.id,
        ...group,
        createdAt: group.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("CREATE PRODUCT GROUP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Ошибка создания группы",
    });
  }
});

// UPDATE GROUP

app.patch("/api/product-groups/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Введите название группы",
      });
    }

    const groupRef = db
      .collection("productGroups")
      .doc(id);

    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Группа не найдена",
      });
    }

    await groupRef.update({
      name: String(name).trim(),
    });

    const updatedDoc = await groupRef.get();

    return res.json({
      success: true,
      message: "Группа обновлена",
      group: {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      },
    });
  } catch (error) {
    console.error("UPDATE PRODUCT GROUP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Ошибка обновления группы",
    });
  }
});

// DELETE GROUP

app.delete("/api/product-groups/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const groupRef = db
      .collection("productGroups")
      .doc(id);

    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Группа не найдена",
      });
    }

    await groupRef.delete();

    return res.json({
      success: true,
      message: "Группа удалена",
    });
  } catch (error) {
    console.error("DELETE PRODUCT GROUP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Ошибка удаления группы",
    });
  }
});

// =====================================================
// CATEGORIES
// Временная совместимость со старым фронтендом
// =====================================================

app.get("/api/categories", async (req, res) => {
  try {
    const snapshot = await db
      .collection("productGroups")
      .get();

    const categories = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error("GET CATEGORIES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Ошибка загрузки категорий",
    });
  }
});

// =====================================================
// GET ALL CLIENTS
// =====================================================

app.get("/api/clients", async (req, res) => {
  try {
    const snapshot = await db
      .collection("clients")
      .get();

    const clients = snapshot.docs.map((clientDoc) => {
      const data = clientDoc.data();

      return {
        id: clientDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : data.createdAt ?? null,
      };
    });

    return res.json({
      success: true,
      count: clients.length,
      clients,
    });
  } catch (error) {
    console.error("GET ALL CLIENTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Ошибка получения клиентов",
    });
  }
});

// =====================================================
// GET CLIENT
// =====================================================

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

    return res.json({
      success: true,
      client: {
        id: clientDoc.id,
        ...clientDoc.data(),
      },
    });
  } catch (error) {
    console.error("GET CLIENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Ошибка получения клиента",
    });
  }
});

// =====================================================
// GET CLIENT PROFILE
// =====================================================

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

    const operationsSnapshot = await clientRef
      .collection("operations")
      .orderBy("date", "desc")
      .get();

    const operations = operationsSnapshot.docs.map(
      (operationDoc) => {
        const data = operationDoc.data();

        return {
          id: operationDoc.id,
          ...data,
          date: data.date?.toDate
            ? data.date.toDate().toISOString()
            : data.date ?? null,
        };
      }
    );

    const client = clientDoc.data();

    return res.json({
      success: true,
      client: {
        id: clientDoc.id,
        ...client,
        createdAt: client.createdAt?.toDate
          ? client.createdAt.toDate().toISOString()
          : client.createdAt ?? null,
        operations,
      },
    });
  } catch (error) {
    console.error("GET CLIENT PROFILE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Ошибка получения профиля клиента",
    });
  }
});

// =====================================================
// GET OPERATIONS
// =====================================================

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

    const operations = snapshot.docs.map(
      (operationDoc) => {
        const data = operationDoc.data();

        return {
          id: operationDoc.id,
          type: data.type,
          points: data.points,
          reason: data.reason,
          date: data.date?.toDate
            ? data.date.toDate().toISOString()
            : null,
        };
      }
    );

    return res.json({
      success: true,
      operations,
    });
  } catch (error) {
    console.error("GET OPERATIONS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Ошибка получения истории",
    });
  }
});

// =====================================================
// CREATE CLIENT
// =====================================================

app.post("/api/clients", async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Введите имя и телефон",
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
        message: "Клиент с таким номером телефона уже существует",
      });
    }

    const welcomeBonus = 100000;

    const clientRef = db
      .collection("clients")
      .doc();

    const client = {
      name,
      phone,
      points: welcomeBonus,
      bonuses: welcomeBonus,
      orders: 0,
      status: "NEW CLIENT",
      role: "user",
      createdAt: new Date(),
    };

    await clientRef.set(client);

    await clientRef
      .collection("operations")
      .add({
        type: "add",
        points: welcomeBonus,
        reason: "Приветственные бонусы",
        date: new Date(),
      });

    return res.status(201).json({
      success: true,
      client: {
        id: clientRef.id,
        ...client,
        createdAt: client.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("CREATE CLIENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Ошибка создания клиента",
    });
  }
});

// =====================================================
// UPDATE CLIENT
// =====================================================

app.patch("/api/clients/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      phone,
      points,
      bonuses,
      status,
      orders,
    } = req.body;

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

    const updates = {};

    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (points !== undefined) updates.points = Number(points);
    if (bonuses !== undefined) updates.bonuses = Number(bonuses);
    if (status !== undefined) updates.status = status;
    if (orders !== undefined) updates.orders = Number(orders);

    await clientRef.update(updates);

    const updatedDoc = await clientRef.get();

    return res.json({
      success: true,
      client: {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      },
    });
  } catch (error) {
    console.error("UPDATE CLIENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Ошибка обновления клиента",
    });
  }
});

// =====================================================
// ADD BONUS
// =====================================================

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

    const client = clientDoc.data();

    const currentPoints = Number(client.points || 0);
    const newPoints = currentPoints + amount;

    await clientRef.update({
      points: newPoints,
      bonuses: newPoints,
    });

    await clientRef
      .collection("operations")
      .add({
        type: "add",
        points: amount,
        reason: reason || "Начисление бонусов",
        date: new Date(),
      });

    return res.json({
      success: true,
      message: "Бонусы начислены",
      points: newPoints,
    });
  } catch (error) {
    console.error("ADD BONUS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Ошибка начисления бонусов",
    });
  }
});

// =====================================================
// REMOVE BONUS
// =====================================================

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

    await clientRef
      .collection("operations")
      .add({
        type: "remove",
        points: amount,
        reason: reason || "Списание бонусов",
        date: new Date(),
      });

    return res.json({
      success: true,
      message: "Бонусы списаны",
      points: newPoints,
    });
  } catch (error) {
    console.error("REMOVE BONUS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Ошибка списания бонусов",
    });
  }
});

// =====================================================
// BONUS CALCULATOR
// =====================================================

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

    return res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("BONUS CALCULATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Ошибка расчёта бонусов",
    });
  }
});

// =====================================================
// 1C
// =====================================================

const ONE_C_API_KEY =
  process.env.ONE_C_API_KEY ||
  "KUSAI-MAX-1C-KEY-2026";

app.get("/api/1c/test", (req, res) => {
  const apiKey = req.headers["x-api-key"];

  if (apiKey !== ONE_C_API_KEY) {
    return res.status(403).json({
      success: false,
      message: "Нет доступа",
    });
  }

  return res.json({
    success: true,
    message: "KUSAI MAX API подключен",
    serverTime: new Date().toISOString(),
  });
});

app.get("/api/1c/clients", async (req, res) => {
  const apiKey = req.headers["x-api-key"];

  if (apiKey !== ONE_C_API_KEY) {
    return res.status(403).json({
      success: false,
      message: "Нет доступа",
    });
  }

  try {
    const snapshot = await db
      .collection("clients")
      .get();

    const clients = snapshot.docs.map((clientDoc) => {
      const data = clientDoc.data();

      return {
        id: clientDoc.id,
        name: data.name,
        phone: data.phone,
        points: data.points || 0,
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : null,
      };
    });

    return res.json({
      success: true,
      count: clients.length,
      clients,
    });
  } catch (error) {
    console.error("1C CLIENTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Ошибка получения клиентов",
    });
  }
});

// =====================================================
// UNKNOWN ROUTE
// =====================================================

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API route not found",
    path: req.path,
  });
});

export default app;