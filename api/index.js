
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";

import { db } from "./firebaseAdmin.js";
import { calculateBonusDiscount } from "./bonus.js";

const app = express();

// ======================================================
// CORS
// ======================================================

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-API-Key",
    ],
  })
);

app.use(express.json());

// ======================================================
// HEALTH
// ======================================================

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

// ======================================================
// ADMIN LOGIN — ПРОВЕРКА МАРШРУТА
// ======================================================

app.get("/api/admin/login", (req, res) => {
  res.json({
    success: true,
    message: "Маршрут авторизации администратора работает",
    method: "POST",
    collection: "adminUsers",
  });
});

// ======================================================
// ADMIN LOGIN — POST
// ======================================================

app.post("/api/admin/login", async (req, res) => {
  console.log("=================================");
  console.log("ADMIN LOGIN REQUEST");
  console.log("=================================");

  try {
    console.log("Body:", {
      login: req.body?.login,
      passwordProvided:
        typeof req.body?.password === "string" &&
        req.body.password.length > 0,
    });

    const login =
      typeof req.body?.login === "string"
        ? req.body.login.trim()
        : "";

    const password =
      typeof req.body?.password === "string"
        ? req.body.password
        : "";

    if (!login || !password) {
      console.log("ADMIN LOGIN: empty credentials");

      return res.status(400).json({
        success: false,
        message: "Введите логин и пароль",
      });
    }

    // ==================================================
    // Ищем администратора
    // ==================================================

    console.log(
      "Searching adminUsers for login:",
      login
    );

    const snapshot = await db
      .collection("adminUsers")
      .where("login", "==", login)
      .limit(1)
      .get();

    console.log(
      "Admin documents found:",
      snapshot.size
    );

    if (snapshot.empty) {
      console.log(
        "ADMIN LOGIN: administrator not found"
      );

      return res.status(401).json({
        success: false,
        message: "Неверный логин или пароль",
      });
    }

    const adminDoc = snapshot.docs[0];
    const admin = adminDoc.data();

    console.log("Admin document:", {
      id: adminDoc.id,
      login: admin.login,
      name: admin.name,
      role: admin.role,
      hasPasswordHash:
        typeof admin.passwordHash === "string" &&
        admin.passwordHash.length > 0,
    });

    // ==================================================
    // Проверяем passwordHash
    // ==================================================

    if (
      !admin.passwordHash ||
      typeof admin.passwordHash !== "string"
    ) {
      console.error(
        "ADMIN LOGIN ERROR: passwordHash отсутствует"
      );

      return res.status(500).json({
        success: false,
        message:
          "У администратора не настроен пароль",
      });
    }

    // ==================================================
    // Проверяем пароль
    // ==================================================

    let passwordValid = false;

    try {
      passwordValid = await bcrypt.compare(
        password,
        admin.passwordHash
      );
    } catch (bcryptError) {
      console.error(
        "BCRYPT ERROR:",
        bcryptError
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка проверки пароля",
      });
    }

    console.log(
      "Password valid:",
      passwordValid
    );

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: "Неверный логин или пароль",
      });
    }

    // ==================================================
    // Успешный вход
    // ==================================================

    console.log(
      "ADMIN LOGIN SUCCESS:",
      login
    );

    return res.status(200).json({
      success: true,

      message: "Вход выполнен",

      admin: {
        id: adminDoc.id,
        login: admin.login,
        name:
          admin.name ||
          "Administrator",
        role: "admin",
      },
    });
  } catch (error) {
    console.error(
      "================================="
    );

    console.error(
      "ADMIN LOGIN SERVER ERROR:"
    );

    console.error(error);

    console.error(
      "================================="
    );

    return res.status(500).json({
      success: false,
      message: "Ошибка сервера",
    });
  }
});

// ======================================================
// GET CLIENT BY ID
// ======================================================

app.get(
  "/api/clients/:id",
  async (req, res) => {
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
      console.error(
        "GET CLIENT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка получения клиента",
      });
    }
  }
);

// ======================================================
// GET CLIENT BY PHONE
// ======================================================

app.get(
  "/api/clients/phone/:phone",
  async (req, res) => {
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

      const clientDoc =
        snapshot.docs[0];

      return res.json({
        success: true,
        client: {
          id: clientDoc.id,
          ...clientDoc.data(),
        },
      });
    } catch (error) {
      console.error(
        "GET CLIENT BY PHONE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка поиска клиента",
      });
    }
  }
);

// ======================================================
// GET ALL CLIENTS
// ======================================================

app.get(
  "/api/clients",
  async (req, res) => {
    try {
      const snapshot = await db
        .collection("clients")
        .get();

      const clients =
        snapshot.docs.map(
          (clientDoc) => {
            const data =
              clientDoc.data();

            return {
              id: clientDoc.id,
              ...data,

              createdAt:
                data.createdAt?.toDate
                  ? data.createdAt
                      .toDate()
                      .toISOString()
                  : data.createdAt ??
                    null,
            };
          }
        );

      return res.json({
        success: true,
        count: clients.length,
        clients,
      });
    } catch (error) {
      console.error(
        "GET ALL CLIENTS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка получения клиентов",
      });
    }
  }
);

// ======================================================
// GET CLIENT PROFILE
// ======================================================

app.get(
  "/api/clients/:id/profile",
  async (req, res) => {
    try {
      const { id } = req.params;

      const clientRef = db
        .collection("clients")
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
          .orderBy("date", "desc")
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
                data.date?.toDate
                  ? data.date
                      .toDate()
                      .toISOString()
                  : data.date ??
                    null,
            };
          }
        );

      const client =
        clientDoc.data();

      return res.json({
        success: true,

        client: {
          id: clientDoc.id,
          ...client,

          createdAt:
            client.createdAt?.toDate
              ? client.createdAt
                  .toDate()
                  .toISOString()
              : client.createdAt ??
                null,

          operations,
        },
      });
    } catch (error) {
      console.error(
        "GET CLIENT PROFILE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка получения профиля клиента",
      });
    }
  }
);

// ======================================================
// GET OPERATIONS
// ======================================================

app.get(
  "/api/clients/:id/operations",
  async (req, res) => {
    try {
      const { id } = req.params;

      const clientRef = db
        .collection("clients")
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
          .orderBy("date", "desc")
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
                data.date?.toDate
                  ? data.date
                      .toDate()
                      .toISOString()
                  : data.date ??
                    null,
            };
          }
        );

      return res.json({
        success: true,
        operations,
      });
    } catch (error) {
      console.error(
        "GET OPERATIONS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка получения истории",
      });
    }
  }
);

// ======================================================
// CREATE CLIENT
// ======================================================

app.post(
  "/api/clients",
  async (req, res) => {
    try {
      const { name, phone } =
        req.body;

      if (!name || !phone) {
        return res.status(400).json({
          success: false,
          message:
            "Введите имя и телефон",
        });
      }

      const existingSnapshot =
        await db
          .collection("clients")
          .where(
            "phone",
            "==",
            phone
          )
          .limit(1)
          .get();

      if (
        !existingSnapshot.empty
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Клиент с таким номером телефона уже существует",
        });
      }

      const welcomeBonus =
        100000;

      const clientRef =
        db.collection("clients").doc();

      const client = {
        name,
        phone,

        points:
          welcomeBonus,

        bonuses:
          welcomeBonus,

        orders: 0,

        status:
          "NEW CLIENT",

        role: "user",

        createdAt:
          new Date(),
      };

      await clientRef.set(
        client
      );

      await clientRef
        .collection("operations")
        .add({
          type: "add",

          points:
            welcomeBonus,

          reason:
            "Приветственные бонусы",

          date:
            new Date(),
        });

      return res.status(201).json({
        success: true,

        client: {
          id: clientRef.id,
          ...client,

          createdAt:
            client.createdAt
              .toISOString(),
        },
      });
    } catch (error) {
      console.error(
        "CREATE CLIENT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка создания клиента",
      });
    }
  }
);

// ======================================================
// UPDATE CLIENT
// ======================================================

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
        bonuses,
        status,
        orders,
      } = req.body;

      const clientRef =
        db
          .collection("clients")
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
        updates.name = name;
      }

      if (phone !== undefined) {
        updates.phone = phone;
      }

      if (points !== undefined) {
        updates.points =
          Number(points);
      }

      if (bonuses !== undefined) {
        updates.bonuses =
          Number(bonuses);
      }

      if (status !== undefined) {
        updates.status = status;
      }

      if (orders !== undefined) {
        updates.orders =
          Number(orders);
      }

      await clientRef.update(
        updates
      );

      const updatedDoc =
        await clientRef.get();

      return res.json({
        success: true,

        client: {
          id: updatedDoc.id,
          ...updatedDoc.data(),
        },
      });
    } catch (error) {
      console.error(
        "UPDATE CLIENT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка обновления клиента",
      });
    }
  }
);

// ======================================================
// ADD BONUS
// ======================================================

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
        !Number.isFinite(
          amount
        ) ||
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
          .collection("clients")
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
        currentPoints +
        amount;

      await clientRef.update({
        points: newPoints,
        bonuses: newPoints,
      });

      await clientRef
        .collection("operations")
        .add({
          type: "add",

          points: amount,

          reason:
            reason ||
            "Начисление бонусов",

          date:
            new Date(),
        });

      return res.json({
        success: true,
        message:
          "Бонусы начислены",
        points: newPoints,
      });
    } catch (error) {
      console.error(
        "ADD BONUS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка начисления бонусов",
      });
    }
  }
);

// ======================================================
// REMOVE BONUS
// ======================================================

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
        !Number.isFinite(
          amount
        ) ||
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
          .collection("clients")
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
        currentPoints -
        amount;

      await clientRef.update({
        points: newPoints,
        bonuses: newPoints,
      });

      await clientRef
        .collection("operations")
        .add({
          type: "remove",

          points: amount,

          reason:
            reason ||
            "Списание бонусов",

          date:
            new Date(),
        });

      return res.json({
        success: true,

        message:
          "Бонусы списаны",

        points:
          newPoints,
      });
    } catch (error) {
      console.error(
        "REMOVE BONUS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка списания бонусов",
      });
    }
  }
);

// ======================================================
// BONUS CALCULATOR
// ======================================================

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

      return res.json({
        success: true,
        result,
      });
    } catch (error) {
      console.error(
        "BONUS CALCULATION ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка расчёта бонусов",
      });
    }
  }
);

// ======================================================
// 1C
// ======================================================

const ONE_C_API_KEY =
  process.env.ONE_C_API_KEY ||
  "KUSAI-MAX-1C-KEY-2026";

// ------------------------------------------------------
// 1C TEST
// ------------------------------------------------------

app.get(
  "/api/1c/test",
  (req, res) => {
    const apiKey =
      req.headers["x-api-key"];

    if (
      apiKey !==
      ONE_C_API_KEY
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Нет доступа",
      });
    }

    return res.json({
      success: true,

      message:
        "KUSAI MAX API подключен",

      serverTime:
        new Date().toISOString(),
    });
  }
);

// ------------------------------------------------------
// 1C CLIENTS
// ------------------------------------------------------

app.get(
  "/api/1c/clients",
  async (req, res) => {
    const apiKey =
      req.headers["x-api-key"];

    if (
      apiKey !==
      ONE_C_API_KEY
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Нет доступа",
      });
    }

    try {
      const snapshot =
        await db
          .collection("clients")
          .get();

      const clients =
        snapshot.docs.map(
          (clientDoc) => {
            const data =
              clientDoc.data();

            return {
              id: clientDoc.id,

              name:
                data.name,

              phone:
                data.phone,

              points:
                data.points || 0,

              createdAt:
                data.createdAt
                  ?.toDate
                  ? data.createdAt
                      .toDate()
                      .toISOString()
                  : null,
            };
          }
        );

      return res.json({
        success: true,

        count:
          clients.length,

        clients,
      });
    } catch (error) {
      console.error(
        "1C CLIENTS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка получения клиентов",
      });
    }
  }
);

// ------------------------------------------------------
// 1C CLIENT
// ------------------------------------------------------

app.get(
  "/api/1c/client",
  async (req, res) => {
    const apiKey =
      req.headers["x-api-key"];

    if (
      apiKey !==
      ONE_C_API_KEY
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Нет доступа",
      });
    }

    try {
      let phone =
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

      if (
        !phone.startsWith("+")
      ) {
        phone = "+" + phone;
      }

      const snapshot =
        await db
          .collection("clients")
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

      return res.json({
        success: true,

        client: {
          id: clientDoc.id,

          name:
            data.name,

          phone:
            data.phone,

          points:
            data.points || 0,

          status:
            data.status ||
            "MAX GOLD",
        },
      });
    } catch (error) {
      console.error(
        "1C CLIENT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка сервера",
      });
    }
  }
);

// ======================================================
// UNKNOWN ROUTE
// ======================================================

app.use(
  (req, res) => {
    res.status(404).json({
      success: false,
      message:
        "API route not found",
      path: req.path,
    });
  }
);

// ======================================================
// VERCEL
// ======================================================

export default app;

