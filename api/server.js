import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import { db } from "./firebaseAdmin.js";
import { calculateBonusDiscount } from "./bonus.js";
import { query as pgQuery } from "./postgres.js";

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
// HELPERS
// =====================================================

const ONE_C_API_KEY =
  process.env.ONE_C_API_KEY ||
  "KUSAI-MAX-1C-KEY-2026";

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
  let value = String(phone || "").replace(/\D/g, "");

  if (value.startsWith("8") && value.length === 11) {
    value = "7" + value.slice(1);
  }

  if (value.length === 10) {
    value = "7" + value;
  }

  return "+" + value;
}

function formatClient(client) {
  return {
    id: client.id,
    name: client.name || "",
    phone: client.phone || "",
    points: Number(client.points || 0),
    bonuses: Number(
      client.bonuses ??
      client.points ??
      0
    ),
    orders: Number(client.orders || 0),
    status: client.status || "NEW CLIENT",
    role: client.role || "user",
    createdAt: client.created_at || null,
    updatedAt: client.updated_at || null,
  };
}

// =====================================================
// HEALTH
// =====================================================

app.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "KUSAI MAX API работает",
    serverTime: new Date().toISOString(),
  });
});

app.get("/api", (req, res) => {
  return res.json({
    success: true,
    message: "KUSAI MAX API работает",
  });
});

app.get("/api/health", async (req, res) => {
  try {
    await pgQuery("SELECT NOW()");

    return res.json({
      success: true,
      message: "KUSAI MAX API подключен",
      database: "PostgreSQL подключен",
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Ошибка подключения к PostgreSQL",
      error: error.message,
    });
  }
});

// =====================================================
// ADMIN LOGIN
// FIREBASE
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
      .where(
        "login",
        "==",
        String(login).trim()
      )
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
        message:
          "У администратора не настроен пароль",
      });
    }

    const passwordValid =
      await bcrypt.compare(
        String(password),
        String(admin.passwordHash)
      );

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: "Неверный логин или пароль",
      });
    }

    return res.json({
      success: true,
      message: "Вход выполнен",

      admin: {
        id: adminDoc.id,
        login: admin.login,
        name:
          admin.name ||
          "Administrator",
        role:
          admin.role ||
          "admin",
      },
    });
  } catch (error) {
    console.error(
      "ADMIN LOGIN ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Ошибка сервера",
    });
  }
});

// =====================================================
// PRODUCT GROUPS
// POSTGRESQL
// =====================================================

// =====================================================
// GET ALL PRODUCT GROUPS
// =====================================================

app.get("/api/product-groups", async (req, res) => {
  try {
    const result = await pgQuery(`
      SELECT
        id,
        name,
        slug,
        parent_id,
        sort_order,
        created_at,
        updated_at
      FROM product_groups
      ORDER BY
        parent_id NULLS FIRST,
        sort_order ASC,
        name ASC
    `);

    const groups = result.rows.map(
      (group) => ({
        id: group.id,
        name: group.name,
        slug: group.slug,
        parentId: group.parent_id,
        sortOrder: group.sort_order,
        createdAt: group.created_at,
        updatedAt: group.updated_at,
      })
    );

    return res.json({
      success: true,
      groups,
    });
  } catch (error) {
    console.error(
      "GET PRODUCT GROUPS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Ошибка загрузки групп",
      error: error.message,
    });
  }
});

// =====================================================
// GET ONE PRODUCT GROUP
// =====================================================

app.get(
  "/api/product-groups/:id",
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pgQuery(
        `
        SELECT
          id,
          name,
          slug,
          parent_id,
          sort_order,
          created_at,
          updated_at
        FROM product_groups
        WHERE id = $1
        LIMIT 1
        `,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Группа не найдена",
        });
      }

      const group = result.rows[0];

      return res.json({
        success: true,

        group: {
          id: group.id,
          name: group.name,
          slug: group.slug,
          parentId: group.parent_id,
          sortOrder: group.sort_order,
          createdAt: group.created_at,
          updatedAt: group.updated_at,
        },
      });
    } catch (error) {
      console.error(
        "GET PRODUCT GROUP ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка получения группы",
        error: error.message,
      });
    }
  }
);

// =====================================================
// CREATE PRODUCT GROUP
// =====================================================

app.post(
  "/api/product-groups",
  async (req, res) => {
    try {
      const {
        name,
        slug,
        parentId,
        sortOrder,
      } = req.body || {};

      if (
        !name ||
        !String(name).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Введите название группы",
        });
      }

      const groupName =
        String(name).trim();

      const normalizedParentId =
        parentId &&
        String(parentId).trim()
          ? String(parentId).trim()
          : null;

      if (normalizedParentId) {
        const parentResult =
          await pgQuery(
            `
            SELECT id
            FROM product_groups
            WHERE id = $1
            LIMIT 1
            `,
            [normalizedParentId]
          );

        if (
          parentResult.rows.length === 0
        ) {
          return res.status(404).json({
            success: false,
            message:
              "Родительская группа не найдена",
          });
        }
      }

      const existingResult =
        await pgQuery(
          `
          SELECT id
          FROM product_groups
          WHERE name = $1
          AND parent_id
              IS NOT DISTINCT FROM $2
          LIMIT 1
          `,
          [
            groupName,
            normalizedParentId,
          ]
        );

      if (
        existingResult.rows.length > 0
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Такая группа уже существует",
        });
      }

      const id = crypto.randomUUID();

      const result = await pgQuery(
        `
        INSERT INTO product_groups (
          id,
          name,
          slug,
          parent_id,
          sort_order
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5
        )
        RETURNING *
        `,
        [
          id,
          groupName,
          slug
            ? String(slug).trim()
            : null,
          normalizedParentId,
          Number(sortOrder) || 0,
        ]
      );

      const group = result.rows[0];

      return res.status(201).json({
        success: true,

        message:
          normalizedParentId
            ? "Подгруппа создана"
            : "Группа создана",

        group: {
          id: group.id,
          name: group.name,
          slug: group.slug,
          parentId: group.parent_id,
          sortOrder: group.sort_order,
          createdAt: group.created_at,
          updatedAt: group.updated_at,
        },
      });
    } catch (error) {
      console.error(
        "CREATE PRODUCT GROUP ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка создания группы",
        error: error.message,
      });
    }
  }
);

// =====================================================
// UPDATE PRODUCT GROUP
// =====================================================

app.patch(
  "/api/product-groups/:id",
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        name,
        slug,
        parentId,
        sortOrder,
      } = req.body || {};

      const existingResult =
        await pgQuery(
          `
          SELECT *
          FROM product_groups
          WHERE id = $1
          LIMIT 1
          `,
          [id]
        );

      if (
        existingResult.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Группа не найдена",
        });
      }

      const existingGroup =
        existingResult.rows[0];

      let newParentId =
        existingGroup.parent_id;

      if (parentId !== undefined) {
        newParentId =
          parentId === null ||
          parentId === ""
            ? null
            : parentId;
      }

      if (
        newParentId &&
        String(newParentId) === String(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Группа не может быть родителем самой себе",
        });
      }

      if (newParentId) {
        const parentResult =
          await pgQuery(
            `
            SELECT id
            FROM product_groups
            WHERE id = $1
            LIMIT 1
            `,
            [newParentId]
          );

        if (
          parentResult.rows.length === 0
        ) {
          return res.status(404).json({
            success: false,
            message:
              "Родительская группа не найдена",
          });
        }
      }

      const newName =
        name !== undefined
          ? String(name).trim()
          : existingGroup.name;

      if (!newName) {
        return res.status(400).json({
          success: false,
          message:
            "Введите название группы",
        });
      }

      const newSlug =
        slug !== undefined
          ? String(slug).trim() || null
          : existingGroup.slug;

      const newSortOrder =
        sortOrder !== undefined
          ? Number(sortOrder) || 0
          : existingGroup.sort_order;

      const duplicateResult =
        await pgQuery(
          `
          SELECT id
          FROM product_groups
          WHERE name = $1
          AND parent_id
              IS NOT DISTINCT FROM $2
          AND id != $3
          LIMIT 1
          `,
          [
            newName,
            newParentId,
            id,
          ]
        );

      if (
        duplicateResult.rows.length > 0
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Такая группа уже существует",
        });
      }

      const result = await pgQuery(
        `
        UPDATE product_groups
        SET
          name = $2,
          slug = $3,
          parent_id = $4,
          sort_order = $5,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [
          id,
          newName,
          newSlug,
          newParentId,
          newSortOrder,
        ]
      );

      const group = result.rows[0];

      return res.json({
        success: true,
        message:
          "Группа обновлена",

        group: {
          id: group.id,
          name: group.name,
          slug: group.slug,
          parentId: group.parent_id,
          sortOrder: group.sort_order,
          createdAt: group.created_at,
          updatedAt: group.updated_at,
        },
      });
    } catch (error) {
      console.error(
        "UPDATE PRODUCT GROUP ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка обновления группы",
        error: error.message,
      });
    }
  }
);

// =====================================================
// DELETE PRODUCT GROUP
// =====================================================

app.delete(
  "/api/product-groups/:id",
  async (req, res) => {
    try {
      const { id } = req.params;

      const groupResult =
        await pgQuery(
          `
          SELECT id
          FROM product_groups
          WHERE id = $1
          LIMIT 1
          `,
          [id]
        );

      if (
        groupResult.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Группа не найдена",
        });
      }

      const childrenResult =
        await pgQuery(
          `
          SELECT id
          FROM product_groups
          WHERE parent_id = $1
          LIMIT 1
          `,
          [id]
        );

      if (
        childrenResult.rows.length > 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Нельзя удалить группу, пока в ней есть подгруппы",
        });
      }

      await pgQuery(
        `
        DELETE FROM product_groups
        WHERE id = $1
        `,
        [id]
      );

      return res.json({
        success: true,
        message:
          "Группа удалена",
      });
    } catch (error) {
      console.error(
        "DELETE PRODUCT GROUP ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка удаления группы",
        error: error.message,
      });
    }
  }
);

// =====================================================
// CATEGORIES
// =====================================================

app.get("/api/categories", async (req, res) => {
  try {
    const result = await pgQuery(`
      SELECT
        id,
        name,
        slug,
        parent_id,
        sort_order
      FROM product_groups
      ORDER BY
        parent_id NULLS FIRST,
        sort_order ASC,
        name ASC
    `);

    const categories =
      result.rows.map((group) => ({
        id: group.id,
        name: group.name,
        slug: group.slug,
        parentId: group.parent_id,
        sortOrder: group.sort_order,
      }));

    return res.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error(
      "GET CATEGORIES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Ошибка загрузки категорий",
      error: error.message,
    });
  }
});

// =====================================================
// CLIENTS
// POSTGRESQL
// =====================================================

// =====================================================
// GET ALL CLIENTS
// =====================================================

app.get("/api/clients", async (req, res) => {
  try {
    const result = await pgQuery(`
      SELECT
        id,
        name,
        phone,
        points,
        bonuses,
        orders,
        status,
        role,
        created_at,
        updated_at
      FROM clients
      ORDER BY created_at DESC
    `);

    const clients =
      result.rows.map(formatClient);

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
      error: error.message,
    });
  }
});

// =====================================================
// GET CLIENT
// =====================================================

app.get(
  "/api/clients/:id",
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pgQuery(
        `
        SELECT
          id,
          name,
          phone,
          points,
          bonuses,
          orders,
          status,
          role,
          created_at,
          updated_at
        FROM clients
        WHERE id = $1
        LIMIT 1
        `,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Клиент не найден",
        });
      }

      return res.json({
        success: true,
        client: formatClient(
          result.rows[0]
        ),
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
        error: error.message,
      });
    }
  }
);

// =====================================================
// GET CLIENT PROFILE
// =====================================================

app.get(
  "/api/clients/:id/profile",
  async (req, res) => {
    try {
      const { id } = req.params;

      const clientResult =
        await pgQuery(
          `
          SELECT *
          FROM clients
          WHERE id = $1
          LIMIT 1
          `,
          [id]
        );

      if (
        clientResult.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Клиент не найден",
        });
      }

      const operationsResult =
        await pgQuery(
          `
          SELECT
            id,
            type,
            points,
            reason,
            created_at
          FROM client_operations
          WHERE client_id = $1
          ORDER BY created_at DESC
          `,
          [id]
        );

      const operations =
        operationsResult.rows.map(
          (operation) => ({
            id: operation.id,
            type: operation.type,
            points: Number(
              operation.points || 0
            ),
            reason:
              operation.reason || "",
            date:
              operation.created_at ||
              null,
          })
        );

      return res.json({
        success: true,

        client: {
          ...formatClient(
            clientResult.rows[0]
          ),
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
        error: error.message,
      });
    }
  }
);

// =====================================================
// GET CLIENT OPERATIONS
// =====================================================

app.get(
  "/api/clients/:id/operations",
  async (req, res) => {
    try {
      const { id } = req.params;

      const clientResult =
        await pgQuery(
          `
          SELECT id
          FROM clients
          WHERE id = $1
          LIMIT 1
          `,
          [id]
        );

      if (
        clientResult.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Клиент не найден",
        });
      }

      const result = await pgQuery(
        `
        SELECT
          id,
          type,
          points,
          reason,
          created_at
        FROM client_operations
        WHERE client_id = $1
        ORDER BY created_at DESC
        `,
        [id]
      );

      const operations =
        result.rows.map(
          (operation) => ({
            id: operation.id,
            type: operation.type,
            points: Number(
              operation.points || 0
            ),
            reason:
              operation.reason || "",
            date:
              operation.created_at ||
              null,
          })
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
        error: error.message,
      });
    }
  }
);

// =====================================================
// CREATE CLIENT
// =====================================================

app.post("/api/clients", async (req, res) => {
  try {
    const { name, phone } =
      req.body || {};

    if (
      !name ||
      !String(name).trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Введите имя",
      });
    }

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Введите телефон",
      });
    }

    const normalizedPhone =
      normalizePhone(phone);

    const existingResult =
      await pgQuery(
        `
        SELECT id
        FROM clients
        WHERE phone = $1
        LIMIT 1
        `,
        [normalizedPhone]
      );

    if (
      existingResult.rows.length > 0
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Клиент с таким номером телефона уже существует",
      });
    }

    const clientId =
      crypto.randomUUID();

    const welcomeBonus = 100000;

    const result = await pgQuery(
      `
      INSERT INTO clients (
        id,
        name,
        phone,
        points,
        bonuses,
        orders,
        status,
        role,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        NOW(),
        NOW()
      )
      RETURNING *
      `,
      [
        clientId,
        String(name).trim(),
        normalizedPhone,
        welcomeBonus,
        welcomeBonus,
        0,
        "NEW CLIENT",
        "user",
      ]
    );

    const client = result.rows[0];

    await pgQuery(
      `
      INSERT INTO client_operations (
        id,
        client_id,
        type,
        points,
        reason,
        created_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        NOW()
      )
      `,
      [
        crypto.randomUUID(),
        clientId,
        "add",
        welcomeBonus,
        "Приветственные бонусы",
      ]
    );

    return res.status(201).json({
      success: true,
      client: formatClient(client),
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
      error: error.message,
    });
  }
});

// =====================================================
// UPDATE CLIENT
// =====================================================

app.patch(
  "/api/clients/:id",
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        name,
        phone,
        points,
        bonuses,
        status,
        orders,
      } = req.body || {};

      const existingResult =
        await pgQuery(
          `
          SELECT *
          FROM clients
          WHERE id = $1
          LIMIT 1
          `,
          [id]
        );

      if (
        existingResult.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Клиент не найден",
        });
      }

      const current =
        existingResult.rows[0];

      const newName =
        name !== undefined
          ? String(name).trim()
          : current.name;

      const newPhone =
        phone !== undefined
          ? normalizePhone(phone)
          : current.phone;

      const newPoints =
        points !== undefined
          ? Number(points)
          : Number(current.points || 0);

      const newBonuses =
        bonuses !== undefined
          ? Number(bonuses)
          : Number(
              current.bonuses ||
              newPoints
            );

      const newStatus =
        status !== undefined
          ? String(status)
          : current.status;

      const newOrders =
        orders !== undefined
          ? Number(orders)
          : Number(current.orders || 0);

      if (
        phone !== undefined &&
        newPhone !== current.phone
      ) {
        const phoneResult =
          await pgQuery(
            `
            SELECT id
            FROM clients
            WHERE phone = $1
            AND id != $2
            LIMIT 1
            `,
            [newPhone, id]
          );

        if (
          phoneResult.rows.length > 0
        ) {
          return res.status(409).json({
            success: false,
            message:
              "Клиент с таким номером уже существует",
          });
        }
      }

      const result = await pgQuery(
        `
        UPDATE clients
        SET
          name = $2,
          phone = $3,
          points = $4,
          bonuses = $5,
          status = $6,
          orders = $7,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [
          id,
          newName,
          newPhone,
          newPoints,
          newBonuses,
          newStatus,
          newOrders,
        ]
      );

      return res.json({
        success: true,
        client: formatClient(
          result.rows[0]
        ),
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
        error: error.message,
      });
    }
  }
);

// =====================================================
// ADD BONUS
// =====================================================

app.post(
  "/api/clients/:id/bonus/add",
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        points,
        reason,
      } = req.body || {};

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

      const clientResult =
        await pgQuery(
          `
          SELECT *
          FROM clients
          WHERE id = $1
          LIMIT 1
          `,
          [id]
        );

      if (
        clientResult.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Клиент не найден",
        });
      }

      const client =
        clientResult.rows[0];

      const currentPoints =
        Number(
          client.points || 0
        );

      const currentBonuses =
        Number(
          client.bonuses ??
          currentPoints
        );

      const newPoints =
        currentPoints + amount;

      const newBonuses =
        currentBonuses + amount;

      await pgQuery(
        `
        UPDATE clients
        SET
          points = $2,
          bonuses = $3,
          updated_at = NOW()
        WHERE id = $1
        `,
        [
          id,
          newPoints,
          newBonuses,
        ]
      );

      await pgQuery(
        `
        INSERT INTO client_operations (
          id,
          client_id,
          type,
          points,
          reason,
          created_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          NOW()
        )
        `,
        [
          crypto.randomUUID(),
          id,
          "add",
          amount,
          reason ||
            "Начисление бонусов",
        ]
      );

      return res.json({
        success: true,
        message:
          "Бонусы начислены",
        points: newPoints,
        bonuses: newBonuses,
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
        error: error.message,
      });
    }
  }
);

// =====================================================
// REMOVE BONUS
// =====================================================

app.post(
  "/api/clients/:id/bonus/remove",
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        points,
        reason,
      } = req.body || {};

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

      const clientResult =
        await pgQuery(
          `
          SELECT *
          FROM clients
          WHERE id = $1
          LIMIT 1
          `,
          [id]
        );

      if (
        clientResult.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Клиент не найден",
        });
      }

      const client =
        clientResult.rows[0];

      const currentPoints =
        Number(
          client.points || 0
        );

      const currentBonuses =
        Number(
          client.bonuses ??
          currentPoints
        );

      if (
        amount > currentBonuses
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Недостаточно бонусов",
        });
      }

      const newPoints =
        Math.max(
          0,
          currentPoints - amount
        );

      const newBonuses =
        currentBonuses - amount;

      await pgQuery(
        `
        UPDATE clients
        SET
          points = $2,
          bonuses = $3,
          updated_at = NOW()
        WHERE id = $1
        `,
        [
          id,
          newPoints,
          newBonuses,
        ]
      );

      await pgQuery(
        `
        INSERT INTO client_operations (
          id,
          client_id,
          type,
          points,
          reason,
          created_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          NOW()
        )
        `,
        [
          crypto.randomUUID(),
          id,
          "remove",
          amount,
          reason ||
            "Списание бонусов",
        ]
      );

      return res.json({
        success: true,
        message:
          "Бонусы списаны",
        points: newPoints,
        bonuses: newBonuses,
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
        error: error.message,
      });
    }
  }
);

// =====================================================
// BONUS CALCULATOR
// =====================================================

app.post(
  "/api/bonus/calculate",
  async (req, res) => {
    try {
      const {
        price,
        category,
        clientPoints,
      } = req.body || {};

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

// =====================================================
// 1C TEST
// =====================================================

app.get(
  "/api/1c/test",
  (req, res) => {
    if (!check1CAccess(req, res)) {
      return;
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

// =====================================================
// 1C GET CLIENT
// =====================================================

app.get(
  "/api/1c/client",
  async (req, res) => {
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
          message:
            "Не указан телефон",
        });
      }

      phone =
        normalizePhone(phone);

      const result =
        await pgQuery(
          `
          SELECT
            id,
            name,
            phone,
            points,
            bonuses,
            status,
            created_at
          FROM clients
          WHERE phone = $1
          LIMIT 1
          `,
          [phone]
        );

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Клиент не найден",
        });
      }

      const client =
        result.rows[0];

      return res.json({
        success: true,

        client: {
          id: client.id,

          name:
            client.name || "",

          phone:
            client.phone || "",

          points: Number(
            client.bonuses ??
            client.points ??
            0
          ),

          bonuses: Number(
            client.bonuses ??
            0
          ),

          status:
            client.status ||
            "NEW CLIENT",

          createdAt:
            client.created_at
              ? new Date(
                  client.created_at
                ).toISOString()
              : null,
        },
      });
    } catch (error) {
      console.error(
        "Ошибка поиска клиента:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка поиска клиента",

        error:
          error?.message ||
          String(error),
      });
    }
  }
);

// =====================================================
// PRODUCTS
// POSTGRESQL
// =====================================================

// =====================================================
// GET ALL PRODUCTS
// =====================================================

app.get("/api/products", async (req, res) => {
  try {
    const result = await pgQuery(`
      SELECT *
      FROM products
      ORDER BY created_at DESC
    `);

    const products = result.rows.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description || "",
      price: Number(product.price || 0),
      oldPrice: product.old_price
        ? Number(product.old_price)
        : null,
      groupId: product.group_id || null,
      brand: product.brand || "",
      model: product.model || "",
      color: product.color || "",
      memory: product.memory || "",
      sim: product.sim || "",
      images: product.images || [],
      status: product.status || "available",
      quantity: Number(product.quantity || 0),
      createdAt: product.created_at,
      updatedAt: product.updated_at,
    }));

    return res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("GET PRODUCTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Ошибка загрузки товаров",
      error: error.message,
    });
  }
});
// =====================================================
// DATABASE TABLES DEBUG
// =====================================================

app.get("/api/debug/tables", async (req, res) => {
  try {
    const result = await pgQuery(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    return res.json({
      success: true,
      tables: result.rows.map(
        (row) => row.table_name
      ),
    });
  } catch (error) {
    console.error("DATABASE TABLES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Ошибка получения таблиц",
      error: error.message,
    });
  }
});

// =====================================================
// PRODUCTS TABLE DEBUG
// =====================================================

app.get("/api/debug/products-columns", async (req, res) => {
  try {
    const result = await pgQuery(`
      SELECT
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'products'
      ORDER BY ordinal_position
    `);

    return res.json({
      success: true,
      columns: result.rows,
    });
  } catch (error) {
    console.error(
      "PRODUCTS COLUMNS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Ошибка получения структуры products",
      error: error.message,
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 KUSAI MAX API запущен на порту ${PORT}`);
  console.log(`📡 http://localhost:${PORT}`);
});

export default app;