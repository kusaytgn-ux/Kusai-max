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
        sort_order,
        created_at,
        updated_at
      FROM product_groups
      WHERE parent_id IS NULL
      ORDER BY
        sort_order ASC,
        name ASC
    `);

    const groups = result.rows.map(
      (group) => ({
        id: group.id,
        name: group.name,
        slug: group.slug,
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

      const existingResult =
        await pgQuery(
          `
          SELECT id
          FROM product_groups
          WHERE name = $1
          AND parent_id IS NULL
          LIMIT 1
          `,
          [groupName]
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
          NULL,
          $4
        )
        RETURNING *
        `,
        [
          id,
          groupName,
          slug
            ? String(slug).trim()
            : null,
          Number(sortOrder) || 0,
        ]
      );

      const group = result.rows[0];

      return res.status(201).json({
        success: true,
        message: "Группа создана",

        group: {
          id: group.id,
          name: group.name,
          slug: group.slug,
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

      const current =
        existingResult.rows[0];

      const newName =
        name !== undefined
          ? String(name).trim()
          : current.name;

      const newSlug =
        slug !== undefined
          ? String(slug).trim() || null
          : current.slug;

      const newSortOrder =
        sortOrder !== undefined
          ? Number(sortOrder) || 0
          : current.sort_order;

      if (!newName) {
        return res.status(400).json({
          success: false,
          message:
            "Введите название группы",
        });
      }

      const duplicateResult =
        await pgQuery(
          `
          SELECT id
          FROM product_groups
          WHERE name = $1
          AND parent_id IS NULL
          AND id != $2
          LIMIT 1
          `,
          [
            newName,
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
          sort_order = $4,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [
          id,
          newName,
          newSlug,
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

      const productsResult =
        await pgQuery(
          `
          SELECT id
          FROM products
          WHERE group_id = $1
          LIMIT 1
          `,
          [id]
        );

      if (
        productsResult.rows.length > 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Нельзя удалить группу, пока в ней есть товары",
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
        message: "Группа удалена",
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
// PRODUCT SUBGROUPS
// POSTGRESQL
// =====================================================

// =====================================================
// GET ALL SUBGROUPS
// =====================================================

app.get(
  "/api/product-subgroups",
  async (req, res) => {
    try {
      const result = await pgQuery(`
        SELECT
          ps.id,
          ps.group_id,
          ps.name,
          ps.created_at,
          pg.name AS group_name
        FROM product_subgroups ps
        JOIN product_groups pg
          ON pg.id = ps.group_id
        ORDER BY
          pg.name ASC,
          ps.name ASC
      `);

      const subgroups =
        result.rows.map(
          (subgroup) => ({
            id: subgroup.id,
            groupId: subgroup.group_id,
            groupName: subgroup.group_name,
            name: subgroup.name,
            createdAt:
              subgroup.created_at,
          })
        );

      return res.json({
        success: true,
        count: subgroups.length,
        subgroups,
      });
    } catch (error) {
      console.error(
        "GET PRODUCT SUBGROUPS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка загрузки подгрупп",
        error: error.message,
      });
    }
  }
);

// =====================================================
// GET SUBGROUPS BY GROUP
// =====================================================

app.get(
  "/api/product-groups/:id/subgroups",
  async (req, res) => {
    try {
      const { id: groupId } =
        req.params;

      const result = await pgQuery(
        `
        SELECT
          id,
          group_id,
          name,
          created_at
        FROM product_subgroups
        WHERE group_id = $1
        ORDER BY name ASC
        `,
        [groupId]
      );

      const subgroups =
        result.rows.map(
          (subgroup) => ({
            id: subgroup.id,
            groupId: subgroup.group_id,
            name: subgroup.name,
            createdAt:
              subgroup.created_at,
          })
        );

      return res.json({
        success: true,
        count: subgroups.length,
        subgroups,
      });
    } catch (error) {
      console.error(
        "GET GROUP SUBGROUPS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка загрузки подгрупп",
        error: error.message,
      });
    }
  }
);

// =====================================================
// CREATE SUBGROUP
// POSTGRESQL
// =====================================================

app.post(
  "/api/product-groups/:id/subgroups",
  async (req, res) => {
    try {
      const { id: groupId } = req.params;

      const { name } = req.body || {};

      if (!name || !String(name).trim()) {
        return res.status(400).json({
          success: false,
          message: "Введите название подгруппы",
        });
      }

      // Проверяем существование группы
      const groupResult = await pgQuery(
        `
        SELECT id
        FROM product_groups
        WHERE id = $1
        LIMIT 1
        `,
        [groupId]
      );

      if (groupResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Группа не найдена",
        });
      }

      const subgroupName = String(name).trim();

      // Проверяем дубликат
      const duplicateResult = await pgQuery(
        `
        SELECT id
        FROM product_subgroups
        WHERE group_id = $1
        AND name = $2
        LIMIT 1
        `,
        [
          groupId,
          subgroupName,
        ]
      );

      if (duplicateResult.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Такая подгруппа уже существует",
        });
      }

      // Создаем подгруппу
      const result = await pgQuery(
        `
        INSERT INTO product_subgroups (
          id,
          group_id,
          name,
          created_at
        )
        VALUES (
          gen_random_uuid(),
          $1,
          $2,
          NOW()
        )
        RETURNING *
        `,
        [
          groupId,
          subgroupName,
        ]
      );

      const subgroup = result.rows[0];

      return res.status(201).json({
        success: true,
        message: "Подгруппа успешно создана",

        subgroup: {
          id: subgroup.id,
          groupId: subgroup.group_id,
          name: subgroup.name,
          createdAt: subgroup.created_at,
        },
      });

    } catch (error) {
      console.error(
        "CREATE SUBGROUP ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Ошибка создания подгруппы",
        error: error.message,
      });
    }
  }
);

// =====================================================
// GET ALL SUBGROUPS
// =====================================================

app.get(
  "/api/product-subgroups",
  async (req, res) => {
    try {
      const result = await pgQuery(`
        SELECT
          ps.id,
          ps.group_id,
          ps.name,
          ps.created_at,
          pg.name AS group_name
        FROM product_subgroups ps
        JOIN product_groups pg
          ON pg.id = ps.group_id
        ORDER BY
          pg.name ASC,
          ps.name ASC
      `);

      const subgroups =
        result.rows.map((item) => ({
          id: item.id,
          groupId: item.group_id,
          groupName: item.group_name,
          name: item.name,
          createdAt: item.created_at,
        }));

      return res.json({
        success: true,
        count: subgroups.length,
        subgroups,
      });

    } catch (error) {
      console.error(
        "GET SUBGROUPS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка загрузки подгрупп",
        error: error.message,
      });
    }
  }
);

// =====================================================
// GET GROUP SUBGROUPS
// =====================================================

app.get(
  "/api/product-groups/:id/subgroups",
  async (req, res) => {
    try {
      const { id: groupId } = req.params;

      const result = await pgQuery(
        `
        SELECT
          id,
          group_id,
          name,
          created_at
        FROM product_subgroups
        WHERE group_id = $1
        ORDER BY name ASC
        `,
        [groupId]
      );

      const subgroups =
        result.rows.map((item) => ({
          id: item.id,
          groupId: item.group_id,
          name: item.name,
          createdAt: item.created_at,
        }));

      return res.json({
        success: true,
        count: subgroups.length,
        subgroups,
      });

    } catch (error) {
      console.error(
        "GET GROUP SUBGROUPS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка загрузки подгрупп",
        error: error.message,
      });
    }
  }
);



// =====================================================
// UPDATE SUBGROUP
// =====================================================

app.patch(
  "/api/product-subgroups/:id",
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        name,
        groupId,
      } = req.body || {};

      const existingResult =
        await pgQuery(
          `
          SELECT *
          FROM product_subgroups
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
            "Подгруппа не найдена",
        });
      }

      const current =
        existingResult.rows[0];

      const newName =
        name !== undefined
          ? String(name).trim()
          : current.name;

      const newGroupId =
        groupId !== undefined
          ? groupId
          : current.group_id;

      if (!newName) {
        return res.status(400).json({
          success: false,
          message:
            "Введите название подгруппы",
        });
      }

      const groupResult =
        await pgQuery(
          `
          SELECT id
          FROM product_groups
          WHERE id = $1
          LIMIT 1
          `,
          [newGroupId]
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

      const duplicateResult =
        await pgQuery(
          `
          SELECT id
          FROM product_subgroups
          WHERE group_id = $1
          AND name = $2
          AND id != $3
          LIMIT 1
          `,
          [
            newGroupId,
            newName,
            id,
          ]
        );

      if (
        duplicateResult.rows.length > 0
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Такая подгруппа уже существует",
        });
      }

      const result =
        await pgQuery(
          `
          UPDATE product_subgroups
          SET
            name = $2,
            group_id = $3
          WHERE id = $1
          RETURNING *
          `,
          [
            id,
            newName,
            newGroupId,
          ]
        );

      const subgroup =
        result.rows[0];

      return res.json({
        success: true,
        message:
          "Подгруппа обновлена",

        subgroup: {
          id: subgroup.id,
          groupId: subgroup.group_id,
          name: subgroup.name,
          createdAt:
            subgroup.created_at,
        },
      });
    } catch (error) {
      console.error(
        "UPDATE SUBGROUP ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка обновления подгруппы",
        error: error.message,
      });
    }
  }
);

// =====================================================
// DELETE SUBGROUP
// =====================================================

app.delete(
  "/api/product-subgroups/:id",
  async (req, res) => {
    try {
      const { id } = req.params;

      const productsResult =
        await pgQuery(
          `
          SELECT id
          FROM products
          WHERE subgroup_id = $1
          LIMIT 1
          `,
          [id]
        );

      if (
        productsResult.rows.length > 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Нельзя удалить подгруппу, пока в ней есть товары",
        });
      }

      const result =
        await pgQuery(
          `
          DELETE FROM product_subgroups
          WHERE id = $1
          RETURNING id
          `,
          [id]
        );

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Подгруппа не найдена",
        });
      }

      return res.json({
        success: true,
        message:
          "Подгруппа удалена",
      });
    } catch (error) {
      console.error(
        "DELETE SUBGROUP ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка удаления подгруппы",
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
    const groupsResult =
      await pgQuery(`
        SELECT
          id,
          name,
          slug,
          sort_order
        FROM product_groups
        WHERE parent_id IS NULL
        ORDER BY
          sort_order ASC,
          name ASC
      `);

    const categories = [];

    for (const group of groupsResult.rows) {
      const subgroupsResult =
        await pgQuery(
          `
          SELECT
            id,
            name
          FROM product_subgroups
          WHERE group_id = $1
          ORDER BY name ASC
          `,
          [group.id]
        );

      categories.push({
        id: group.id,
        name: group.name,
        slug: group.slug,
        sortOrder: group.sort_order,

        subgroups:
          subgroupsResult.rows.map(
            (subgroup) => ({
              id: subgroup.id,
              name: subgroup.name,
            })
          ),
      });
    }

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
// DATABASE DEBUG
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
    console.error(
      "DATABASE TABLES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Ошибка получения таблиц",
      error: error.message,
    });
  }
});

app.get(
  "/api/debug/products-columns",
  async (req, res) => {
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
        message:
          "Ошибка получения структуры products",
        error: error.message,
      });
    }
  }
);

app.get("/api/debug/columns", async (req, res) => {
  try {
    const { table } = req.query;

    if (!table) {
      return res.status(400).json({
        success: false,
        message: "Укажите table",
      });
    }

    const result = await pgQuery(
      `
      SELECT
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = $1
      ORDER BY ordinal_position
      `,
      [table]
    );

    return res.json({
      success: true,
      table,
      columns: result.rows,
    });
  } catch (error) {
    console.error(
      "Ошибка получения колонок:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Ошибка получения структуры таблицы",
      error: error.message,
    });
  }
});

// =====================================================
// ADD GROUP_ID TO PRODUCTS
// =====================================================

app.post(
  "/api/debug/add-products-group-id",
  async (req, res) => {
    try {
      await pgQuery(`
        ALTER TABLE products
        ADD COLUMN IF NOT EXISTS group_id UUID
      `);

      return res.json({
        success: true,
        message:
          "Колонка group_id успешно добавлена в products",
      });
    } catch (error) {
      console.error(
        "ADD GROUP_ID ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка добавления group_id",
        error: error.message,
      });
    }
  }
);

// =====================================================
// ADD SUBGROUP_ID TO PRODUCTS
// =====================================================

app.post(
  "/api/debug/add-products-subgroup-id",
  async (req, res) => {
    try {
      await pgQuery(`
        ALTER TABLE products
        ADD COLUMN IF NOT EXISTS subgroup_id UUID
      `);

      return res.json({
        success: true,
        message:
          "Колонка subgroup_id успешно добавлена в products",
      });
    } catch (error) {
      console.error(
        "ADD SUBGROUP_ID ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка добавления subgroup_id",
        error: error.message,
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
      SELECT
        id,
        title,
        name,
        price,
        images,

        group_id,
        subgroup_id,

        category,
        category_group,
        category_path,
        category_leaf,

        badge,
        rating,
        reviews,
        delivery,

        in_stock,
        stock,
        reserve,
        in_transit,
        quantity,

        description,
        memory,
        color,
        warranty,
        type,
        product,
        characteristics,
        variants_count,

        weight,
        volume,

        article,
        code,
        external_code,
        barcode,

        archived,
        updated_at,
        hidden,
        buy_price,
        synced_at

      FROM products

      WHERE archived IS NOT TRUE
      AND hidden IS NOT TRUE

      ORDER BY updated_at DESC NULLS LAST
    `);

    const products =
      result.rows.map((item) => ({
        id: item.id,

        title:
          item.title ||
          item.name ||
          "",

        name:
          item.name ||
          item.title ||
          "",

        price:
          Number(item.price || 0),

        images:
          Array.isArray(item.images)
            ? item.images
            : [],

        // Группа

        groupId:
          item.group_id || null,

        // Подгруппа

        subgroupId:
          item.subgroup_id || null,

        // Старые категории

        category:
          item.category || "",

        categoryGroup:
          item.category_group || "",

        categoryPath:
          item.category_path || [],

        categoryLeaf:
          item.category_leaf || "",

        badge:
          item.badge || "",

        rating:
          Number(item.rating || 0),

        reviews:
          Number(item.reviews || 0),

        delivery:
          item.delivery || "",

        inStock:
          Boolean(item.in_stock),

        stock:
          Number(item.stock || 0),

        reserve:
          Number(item.reserve || 0),

        inTransit:
          Number(item.in_transit || 0),

        quantity:
          Number(item.quantity || 0),

        description:
          item.description || "",

        memory:
          item.memory || "",

        color:
          item.color || "",

        warranty:
          item.warranty || "",

        type:
          item.type || "",

        product:
          item.product || "",

        characteristics:
          item.characteristics || {},

        variantsCount:
          Number(
            item.variants_count || 0
          ),

        weight: item.weight
          ? Number(item.weight)
          : null,

        volume: item.volume
          ? Number(item.volume)
          : null,

        article:
          item.article || "",

        code:
          item.code || "",

        externalCode:
          item.external_code || "",

        barcode:
          item.barcode || "",

        archived:
          Boolean(item.archived),

        hidden:
          Boolean(item.hidden),

        buyPrice: item.buy_price
          ? Number(item.buy_price)
          : null,

        updatedAt:
          item.updated_at,

        syncedAt:
          item.synced_at,
      }));

    return res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error(
      "GET PRODUCTS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Ошибка загрузки товаров",
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

// =====================================================
// START SERVER
// =====================================================

const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `🚀 KUSAI MAX API запущен на порту ${PORT}`
  );

  console.log(
    `📡 http://localhost:${PORT}`
  );
});

export default app;