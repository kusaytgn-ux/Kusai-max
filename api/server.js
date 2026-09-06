import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import { db } from "./firebaseAdmin.js";
import { calculateBonusDiscount } from "./bonus.js";
import { query as pgQuery } from "./postgres.js";

const app = express();

// =====================================================
// TRADE-IN TABLE
// =====================================================

async function initializeTradeInTable() {
  try {
    await pgQuery(`
      CREATE TABLE IF NOT EXISTS trade_in (
        id UUID PRIMARY KEY,

        title TEXT NOT NULL,

        description TEXT NOT NULL DEFAULT '',

        price NUMERIC NOT NULL DEFAULT 0,

        memory TEXT NOT NULL DEFAULT '',

        color TEXT NOT NULL DEFAULT '',

        condition TEXT NOT NULL DEFAULT '',

        warranty TEXT NOT NULL DEFAULT '',

        images JSONB NOT NULL DEFAULT '[]'::jsonb,

        status TEXT NOT NULL DEFAULT 'available',

        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pgQuery(`
      CREATE INDEX IF NOT EXISTS idx_trade_in_created_at
      ON trade_in(created_at DESC)
    `);

    console.log("вњ… РўР°Р±Р»РёС†Р° trade_in РіРѕС‚РѕРІР°");

  } catch (error) {
    console.error(
      "вќЊ РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ С‚Р°Р±Р»РёС†С‹ trade_in:",
      error
    );

    throw error;
  }
}

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
      message: "РќРµС‚ РґРѕСЃС‚СѓРїР°",
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

    status:
      client.status ||
      "NEW CLIENT",

    role:
      client.role ||
      "user",

    createdAt:
      client.created_at ||
      null,

    updatedAt:
      client.updated_at ||
      null,
  };
}

// =====================================================
// HEALTH
// =====================================================

app.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "KUSAI MAX API СЂР°Р±РѕС‚Р°РµС‚",
    serverTime: new Date().toISOString(),
  });
});

app.get("/api", (req, res) => {
  return res.json({
    success: true,
    message: "KUSAI MAX API СЂР°Р±РѕС‚Р°РµС‚",
  });
});

app.get("/api/health", async (req, res) => {
  try {
    await pgQuery("SELECT NOW()");

    return res.json({
      success: true,
      message: "KUSAI MAX API РїРѕРґРєР»СЋС‡РµРЅ",
      database: "PostgreSQL РїРѕРґРєР»СЋС‡РµРЅ",
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "РћС€РёР±РєР° РїРѕРґРєР»СЋС‡РµРЅРёСЏ Рє PostgreSQL",
      error: error.message,
    });
  }
});

// =====================================================
// CLIENT LOGIN / REGISTRATION
// POSTGRESQL
// =====================================================

app.post("/api/auth/login", async (req, res) => {
  try {
    const body = req.body || {};

    const name = String(
      body.name ||
      body.firstName ||
      body.first_name ||
      body.username ||
      ""
    ).trim();

    const phone = String(
      body.phone ||
      body.phoneNumber ||
      body.phone_number ||
      ""
    ).trim();

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Р’РІРµРґРёС‚Рµ РЅРѕРјРµСЂ С‚РµР»РµС„РѕРЅР°",
      });
    }

    const normalizedPhone = normalizePhone(phone);

    // РС‰РµРј СЃСѓС‰РµСЃС‚РІСѓСЋС‰РµРіРѕ РєР»РёРµРЅС‚Р°
    const existingResult = await pgQuery(
      `
      SELECT *
      FROM clients
      WHERE phone = $1
      LIMIT 1
      `,
      [normalizedPhone]
    );

    // ==========================================
    // РљР›РР•РќРў РќРђР™Р”Р•Рќ вЂ” Р’РҐРћР”
    // ==========================================

    if (existingResult.rows.length > 0) {
      return res.status(200).json({
        success: true,
        message: "Р’С…РѕРґ РІС‹РїРѕР»РЅРµРЅ",
        isNewClient: false,
        client: formatClient(existingResult.rows[0]),
      });
    }

    // ==========================================
    // РќРћР’Р«Р™ РљР›РР•РќРў
    // ==========================================

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Р’РІРµРґРёС‚Рµ РёРјСЏ РґР»СЏ СЂРµРіРёСЃС‚СЂР°С†РёРё",
      });
    }

    const clientId = crypto.randomUUID();
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
        0,
        'NEW CLIENT',
        'user',
        NOW(),
        NOW()
      )
      RETURNING *
      `,
      [
        clientId,
        name,
        normalizedPhone,
        welcomeBonus,
        welcomeBonus,
      ]
    );

    const client = result.rows[0];

    // Р—Р°РїРёСЃС‹РІР°РµРј РїСЂРёРІРµС‚СЃС‚РІРµРЅРЅС‹Рµ Р±РѕРЅСѓСЃС‹
    try {
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
          'add',
          $3,
          'РџСЂРёРІРµС‚СЃС‚РІРµРЅРЅС‹Рµ Р±РѕРЅСѓСЃС‹',
          NOW()
        )
        `,
        [
          crypto.randomUUID(),
          clientId,
          welcomeBonus,
        ]
      );
    } catch (operationError) {
      console.error(
        "WELCOME BONUS OPERATION ERROR:",
        operationError
      );
    }

    return res.status(201).json({
      success: true,
      message: "Р РµРіРёСЃС‚СЂР°С†РёСЏ СѓСЃРїРµС€РЅРѕ Р·Р°РІРµСЂС€РµРЅР°",
      isNewClient: true,
      client: formatClient(client),
    });

  } catch (error) {
    console.error(
      "CLIENT LOGIN ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "РћС€РёР±РєР° РІС…РѕРґР° РёР»Рё СЂРµРіРёСЃС‚СЂР°С†РёРё",
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
    const { login, password } =
      req.body || {};

    if (!login || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Р’РІРµРґРёС‚Рµ Р»РѕРіРёРЅ Рё РїР°СЂРѕР»СЊ",
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
        message:
          "РќРµРІРµСЂРЅС‹Р№ Р»РѕРіРёРЅ РёР»Рё РїР°СЂРѕР»СЊ",
      });
    }

    const adminDoc =
      snapshot.docs[0];

    const admin =
      adminDoc.data();

    if (!admin.passwordHash) {
      return res.status(500).json({
        success: false,
        message:
          "РЈ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР° РЅРµ РЅР°СЃС‚СЂРѕРµРЅ РїР°СЂРѕР»СЊ",
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
        message:
          "РќРµРІРµСЂРЅС‹Р№ Р»РѕРіРёРЅ РёР»Рё РїР°СЂРѕР»СЊ",
      });
    }

    return res.json({
      success: true,
      message: "Р’С…РѕРґ РІС‹РїРѕР»РЅРµРЅ",

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
      message: "РћС€РёР±РєР° СЃРµСЂРІРµСЂР°",
    });
  }
});

// =====================================================
// PRODUCT GROUPS
// =====================================================

// =====================================================
// GET ALL PRODUCT GROUPS
// =====================================================

app.get(
  "/api/product-groups",
  async (req, res) => {
    try {
      const result =
        await pgQuery(`
          SELECT
            id,
            name,
            slug,
            sort_order,
            created_at,
            updated_at
          FROM product_groups
          ORDER BY
            sort_order ASC,
            name ASC
        `);

      const groups =
        result.rows.map((group) => ({
          id: group.id,
          name: group.name,
          slug: group.slug,
          sortOrder:
            Number(group.sort_order || 0),
          createdAt:
            group.created_at,
          updatedAt:
            group.updated_at,
        }));

      return res.json({
        success: true,
        count: groups.length,
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
          "РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РіСЂСѓРїРї",
        error: error.message,
      });
    }
  }
);

// =====================================================
// GET ONE PRODUCT GROUP
// =====================================================

app.get(
  "/api/product-groups/:id",
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const result =
        await pgQuery(
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
          message:
            "Р“СЂСѓРїРїР° РЅРµ РЅР°Р№РґРµРЅР°",
        });
      }

      const group =
        result.rows[0];

      return res.json({
        success: true,

        group: {
          id: group.id,
          name: group.name,
          slug: group.slug,

          sortOrder:
            Number(
              group.sort_order || 0
            ),

          createdAt:
            group.created_at,

          updatedAt:
            group.updated_at,
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
          "РћС€РёР±РєР° РїРѕР»СѓС‡РµРЅРёСЏ РіСЂСѓРїРїС‹",
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
            "Р’РІРµРґРёС‚Рµ РЅР°Р·РІР°РЅРёРµ РіСЂСѓРїРїС‹",
        });
      }

      const groupName =
        String(name).trim();

      const duplicateResult =
        await pgQuery(
          `
          SELECT id
          FROM product_groups
          WHERE LOWER(name) = LOWER($1)
          LIMIT 1
          `,
          [groupName]
        );

      if (
        duplicateResult.rows.length > 0
      ) {
        return res.status(409).json({
          success: false,
          message:
            "РўР°РєР°СЏ РіСЂСѓРїРїР° СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚",
        });
      }

      const result =
        await pgQuery(
          `
          INSERT INTO product_groups (
            id,
            name,
            slug,
            sort_order,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            NOW(),
            NOW()
          )
          RETURNING *
          `,
          [
            crypto.randomUUID(),
            groupName,

            slug
              ? String(slug).trim()
              : null,

            Number(sortOrder) || 0,
          ]
        );

      const group =
        result.rows[0];

      return res.status(201).json({
        success: true,
        message:
          "Р“СЂСѓРїРїР° СЃРѕР·РґР°РЅР°",

        group: {
          id: group.id,
          name: group.name,
          slug: group.slug,

          sortOrder:
            Number(
              group.sort_order || 0
            ),

          createdAt:
            group.created_at,

          updatedAt:
            group.updated_at,
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
          "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ РіСЂСѓРїРїС‹",
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
      const { id } =
        req.params;

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
            "Р“СЂСѓРїРїР° РЅРµ РЅР°Р№РґРµРЅР°",
        });
      }

      const existing =
        existingResult.rows[0];

      const newName =
        name !== undefined
          ? String(name).trim()
          : existing.name;

      if (!newName) {
        return res.status(400).json({
          success: false,
          message:
            "Р’РІРµРґРёС‚Рµ РЅР°Р·РІР°РЅРёРµ РіСЂСѓРїРїС‹",
        });
      }

      const newSlug =
        slug !== undefined
          ? String(slug).trim() || null
          : existing.slug;

      const newSortOrder =
        sortOrder !== undefined
          ? Number(sortOrder) || 0
          : Number(
              existing.sort_order || 0
            );

      const result =
        await pgQuery(
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

      const group =
        result.rows[0];

      return res.json({
        success: true,
        message:
          "Р“СЂСѓРїРїР° РѕР±РЅРѕРІР»РµРЅР°",

        group: {
          id: group.id,
          name: group.name,
          slug: group.slug,

          sortOrder:
            Number(
              group.sort_order || 0
            ),

          createdAt:
            group.created_at,

          updatedAt:
            group.updated_at,
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
          "РћС€РёР±РєР° РѕР±РЅРѕРІР»РµРЅРёСЏ РіСЂСѓРїРїС‹",
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
      const { id } =
        req.params;

      const result =
        await pgQuery(
          `
          DELETE FROM product_groups
          WHERE id = $1
          RETURNING id
          `,
          [id]
        );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Р“СЂСѓРїРїР° РЅРµ РЅР°Р№РґРµРЅР°",
        });
      }

      return res.json({
        success: true,
        message:
          "Р“СЂСѓРїРїР° СѓРґР°Р»РµРЅР°",
      });

    } catch (error) {
      console.error(
        "DELETE PRODUCT GROUP ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "РћС€РёР±РєР° СѓРґР°Р»РµРЅРёСЏ РіСЂСѓРїРїС‹",
        error: error.message,
      });
    }
  }
);

// =====================================================
// PRODUCT SUBGROUPS
// =====================================================

// =====================================================
// GET ALL SUBGROUPS
// =====================================================

app.get(
  "/api/product-subgroups",
  async (req, res) => {
    try {
      const result =
        await pgQuery(`
          SELECT
            ps.id,
            ps.group_id,
            ps.name,
            ps.created_at,

            pg.name AS group_name

          FROM product_subgroups ps

          LEFT JOIN product_groups pg
            ON pg.id = ps.group_id

          ORDER BY
            pg.name ASC,
            ps.name ASC
        `);

      const subgroups =
        result.rows.map((item) => ({
          id: item.id,

          groupId:
            item.group_id,

          groupName:
            item.group_name || "",

          name:
            item.name,

          createdAt:
            item.created_at,
        }));

      return res.json({
        success: true,
        count:
          subgroups.length,
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
          "РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РїРѕРґРіСЂСѓРїРї",
        error: error.message,
      });
    }
  }
);

// =====================================================
// GET SUBGROUPS OF GROUP
// =====================================================

app.get(
  "/api/product-groups/:id/subgroups",
  async (req, res) => {
    try {
      const { id: groupId } =
        req.params;

      const result =
        await pgQuery(
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

          groupId:
            item.group_id,

          name:
            item.name,

          createdAt:
            item.created_at,
        }));

      return res.json({
        success: true,
        count:
          subgroups.length,
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
          "РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РїРѕРґРіСЂСѓРїРї",
        error: error.message,
      });
    }
  }
);

// =====================================================
// GET ONE SUBGROUP
// =====================================================

app.get(
  "/api/product-subgroups/:id",
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const result =
        await pgQuery(
          `
          SELECT
            ps.id,
            ps.group_id,
            ps.name,
            ps.created_at,

            pg.name AS group_name

          FROM product_subgroups ps

          LEFT JOIN product_groups pg
            ON pg.id = ps.group_id

          WHERE ps.id = $1

          LIMIT 1
          `,
          [id]
        );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "РџРѕРґРіСЂСѓРїРїР° РЅРµ РЅР°Р№РґРµРЅР°",
        });
      }

      const subgroup =
        result.rows[0];

      return res.json({
        success: true,

        subgroup: {
          id:
            subgroup.id,

          groupId:
            subgroup.group_id,

          groupName:
            subgroup.group_name || "",

          name:
            subgroup.name,

          createdAt:
            subgroup.created_at,
        },
      });

    } catch (error) {
      console.error(
        "GET SUBGROUP ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "РћС€РёР±РєР° РїРѕР»СѓС‡РµРЅРёСЏ РїРѕРґРіСЂСѓРїРїС‹",
        error: error.message,
      });
    }
  }
);

// =====================================================
// CREATE SUBGROUP
// =====================================================

app.post(
  "/api/product-groups/:id/subgroups",
  async (req, res) => {
    try {
      const { id: groupId } =
        req.params;

      const { name } =
        req.body || {};

      if (
        !name ||
        !String(name).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Р’РІРµРґРёС‚Рµ РЅР°Р·РІР°РЅРёРµ РїРѕРґРіСЂСѓРїРїС‹",
        });
      }

      // РџСЂРѕРІРµСЂСЏРµРј РіСЂСѓРїРїСѓ

      const groupResult =
        await pgQuery(
          `
          SELECT id
          FROM product_groups
          WHERE id = $1
          LIMIT 1
          `,
          [groupId]
        );

      if (
        groupResult.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Р“СЂСѓРїРїР° РЅРµ РЅР°Р№РґРµРЅР°",
        });
      }

      const subgroupName =
        String(name).trim();

      // РџСЂРѕРІРµСЂСЏРµРј РґСѓР±Р»РёРєР°С‚

      const duplicateResult =
        await pgQuery(
          `
          SELECT id
          FROM product_subgroups
          WHERE group_id = $1
          AND LOWER(name) = LOWER($2)
          LIMIT 1
          `,
          [
            groupId,
            subgroupName,
          ]
        );

      if (
        duplicateResult.rows.length > 0
      ) {
        return res.status(409).json({
          success: false,
          message:
            "РўР°РєР°СЏ РїРѕРґРіСЂСѓРїРїР° СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚",
        });
      }

      // РЎРѕР·РґР°С‘Рј РїРѕРґРіСЂСѓРїРїСѓ

      const result =
        await pgQuery(
          `
          INSERT INTO product_subgroups (
            id,
            group_id,
            name,
            created_at
          )
          VALUES (
            $1,
            $2,
            $3,
            NOW()
          )
          RETURNING *
          `,
          [
            crypto.randomUUID(),
            groupId,
            subgroupName,
          ]
        );

      const subgroup =
        result.rows[0];

      return res.status(201).json({
        success: true,
        message:
          "РџРѕРґРіСЂСѓРїРїР° СѓСЃРїРµС€РЅРѕ СЃРѕР·РґР°РЅР°",

        subgroup: {
          id:
            subgroup.id,

          groupId:
            subgroup.group_id,

          name:
            subgroup.name,

          createdAt:
            subgroup.created_at,
        },
      });

    } catch (error) {
      console.error(
        "CREATE SUBGROUP ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ РїРѕРґРіСЂСѓРїРїС‹",
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
      const { id } =
        req.params;

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
            "РџРѕРґРіСЂСѓРїРїР° РЅРµ РЅР°Р№РґРµРЅР°",
        });
      }

      const existing =
        existingResult.rows[0];

      const newName =
        name !== undefined
          ? String(name).trim()
          : existing.name;

      const newGroupId =
        groupId !== undefined
          ? groupId
          : existing.group_id;

      if (!newName) {
        return res.status(400).json({
          success: false,
          message:
            "Р’РІРµРґРёС‚Рµ РЅР°Р·РІР°РЅРёРµ РїРѕРґРіСЂСѓРїРїС‹",
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
          "РџРѕРґРіСЂСѓРїРїР° РѕР±РЅРѕРІР»РµРЅР°",

        subgroup: {
          id:
            subgroup.id,

          groupId:
            subgroup.group_id,

          name:
            subgroup.name,

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
          "РћС€РёР±РєР° РѕР±РЅРѕРІР»РµРЅРёСЏ РїРѕРґРіСЂСѓРїРїС‹",
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
      const { id } =
        req.params;

      // РЎРЅР°С‡Р°Р»Р° РѕС‚РІСЏР·С‹РІР°РµРј С‚РѕРІР°СЂС‹

      await pgQuery(
        `
        UPDATE products
        SET subgroup_id = NULL
        WHERE subgroup_id = $1
        `,
        [id]
      );

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
            "РџРѕРґРіСЂСѓРїРїР° РЅРµ РЅР°Р№РґРµРЅР°",
        });
      }

      return res.json({
        success: true,
        message:
          "РџРѕРґРіСЂСѓРїРїР° СѓРґР°Р»РµРЅР°",
      });

    } catch (error) {
      console.error(
        "DELETE SUBGROUP ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "РћС€РёР±РєР° СѓРґР°Р»РµРЅРёСЏ РїРѕРґРіСЂСѓРїРїС‹",
        error: error.message,
      });
    }
  }
);

// =====================================================
// CATEGORIES
// =====================================================

app.get(
  "/api/categories",
  async (req, res) => {
    try {
      const groupsResult =
        await pgQuery(`
          SELECT
            id,
            name,
            slug,
            sort_order
          FROM product_groups
          ORDER BY
            sort_order ASC,
            name ASC
        `);

      const subgroupsResult =
        await pgQuery(`
          SELECT
            id,
            group_id,
            name
          FROM product_subgroups
          ORDER BY name ASC
        `);

      const categories =
        groupsResult.rows.map((group) => ({
          id: group.id,

          name:
            group.name,

          slug:
            group.slug,

          sortOrder:
            Number(
              group.sort_order || 0
            ),

          subgroups:
            subgroupsResult.rows
              .filter(
                (subgroup) =>
                  subgroup.group_id ===
                  group.id
              )
              .map(
                (subgroup) => ({
                  id:
                    subgroup.id,

                  groupId:
                    subgroup.group_id,

                  name:
                    subgroup.name,
                })
              ),
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
          "РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РєР°С‚РµРіРѕСЂРёР№",
        error: error.message,
      });
    }
  }
);

// =====================================================
// CLIENTS
// =====================================================

// =====================================================
// GET ALL CLIENTS
// =====================================================

app.get(
  "/api/clients",
  async (req, res) => {
    try {
      const result =
        await pgQuery(`
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
        result.rows.map(
          formatClient
        );

      return res.json({
        success: true,
        count:
          clients.length,
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
          "РћС€РёР±РєР° РїРѕР»СѓС‡РµРЅРёСЏ РєР»РёРµРЅС‚РѕРІ",
        error: error.message,
      });
    }
  }
);

// =====================================================
// GET CLIENT
// =====================================================

app.get(
  "/api/clients/:id",
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const result =
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
        result.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "РљР»РёРµРЅС‚ РЅРµ РЅР°Р№РґРµРЅ",
        });
      }

      return res.json({
        success: true,

        client:
          formatClient(
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
          "РћС€РёР±РєР° РїРѕР»СѓС‡РµРЅРёСЏ РєР»РёРµРЅС‚Р°",
        error: error.message,
      });
    }
  }
);

// =====================================================
// CREATE CLIENT
// =====================================================

app.post(
  "/api/clients",
  async (req, res) => {
    try {
      const { name, phone } =
        req.body || {};

      if (
        !name ||
        !String(name).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Р’РІРµРґРёС‚Рµ РёРјСЏ",
        });
      }

      if (!phone) {
        return res.status(400).json({
          success: false,
          message:
            "Р’РІРµРґРёС‚Рµ С‚РµР»РµС„РѕРЅ",
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
            "РљР»РёРµРЅС‚ СЃ С‚Р°РєРёРј РЅРѕРјРµСЂРѕРј СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚",
        });
      }

      const clientId =
        crypto.randomUUID();

      const welcomeBonus =
        100000;

      const result =
        await pgQuery(
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
          "РџСЂРёРІРµС‚СЃС‚РІРµРЅРЅС‹Рµ Р±РѕРЅСѓСЃС‹",
        ]
      );

      return res.status(201).json({
        success: true,

        client:
          formatClient(
            result.rows[0]
          ),
      });

    } catch (error) {
      console.error(
        "CREATE CLIENT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ РєР»РёРµРЅС‚Р°",
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
        ORDER BY created_at DESC, id DESC
        `,
        [req.params.id]
      );

      return res.json({
        success: true,

        operations: result.rows.map((row) => ({
          id: row.id,

          type: row.type || "",

          points: Number(row.points || 0),

          amount: Number(row.points || 0),

          bonuses: Number(row.points || 0),

          reason: row.reason || "",

          productName:
            row.reason || "РћРїРµСЂР°С†РёСЏ",

          operationDate:
            row.created_at,

          createdAt:
            row.created_at,
        })),
      });

    } catch (error) {

      console.error(
        "GET CLIENT OPERATIONS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РёСЃС‚РѕСЂРёРё РѕРїРµСЂР°С†РёР№",

        error:
          error.message,
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
      const { id } =
        req.params;

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
            "РќРµРєРѕСЂСЂРµРєС‚РЅРѕРµ РєРѕР»РёС‡РµСЃС‚РІРѕ Р±РѕРЅСѓСЃРѕРІ",
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
            "РљР»РёРµРЅС‚ РЅРµ РЅР°Р№РґРµРЅ",
        });
      }

      const client =
        clientResult.rows[0];

      const newPoints =
        Number(client.points || 0) +
        amount;

      const newBonuses =
        Number(
          client.bonuses ??
          client.points ??
          0
        ) + amount;

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
          'add',
          $3,
          $4,
          NOW()
        )
        `,
        [
          crypto.randomUUID(),
          id,
          amount,
          reason ||
            "РќР°С‡РёСЃР»РµРЅРёРµ Р±РѕРЅСѓСЃРѕРІ",
        ]
      );

      return res.json({
        success: true,
        message:
          "Р‘РѕРЅСѓСЃС‹ РЅР°С‡РёСЃР»РµРЅС‹",

        points:
          newPoints,

        bonuses:
          newBonuses,
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "РћС€РёР±РєР° РЅР°С‡РёСЃР»РµРЅРёСЏ Р±РѕРЅСѓСЃРѕРІ",
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
      const { id } =
        req.params;

      const {
        points,
        reason,
      } = req.body || {};

      const amount =
        Number(points);

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
            "РљР»РёРµРЅС‚ РЅРµ РЅР°Р№РґРµРЅ",
        });
      }

      const client =
        clientResult.rows[0];

      const currentBonuses =
        Number(
          client.bonuses ??
          client.points ??
          0
        );

      if (
        !Number.isFinite(amount) ||
        amount <= 0 ||
        amount > currentBonuses
      ) {
        return res.status(400).json({
          success: false,
          message:
            "РќРµРґРѕСЃС‚Р°С‚РѕС‡РЅРѕ Р±РѕРЅСѓСЃРѕРІ",
        });
      }

      const newBonuses =
        currentBonuses - amount;

      const newPoints =
        Math.max(
          0,
          Number(client.points || 0) -
          amount
        );

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
          'remove',
          $3,
          $4,
          NOW()
        )
        `,
        [
          crypto.randomUUID(),
          id,
          amount,
          reason ||
            "РЎРїРёСЃР°РЅРёРµ Р±РѕРЅСѓСЃРѕРІ",
        ]
      );

      return res.json({
        success: true,
        message:
          "Р‘РѕРЅСѓСЃС‹ СЃРїРёСЃР°РЅС‹",

        points:
          newPoints,

        bonuses:
          newBonuses,
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "РћС€РёР±РєР° СЃРїРёСЃР°РЅРёСЏ Р±РѕРЅСѓСЃРѕРІ",
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
      return res.status(500).json({
        success: false,
        message:
          "РћС€РёР±РєР° СЂР°СЃС‡С‘С‚Р° Р±РѕРЅСѓСЃРѕРІ",
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
        "KUSAI MAX API РїРѕРґРєР»СЋС‡РµРЅ",

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
      let phone =
        String(
          req.query.phone || ""
        ).trim();

      if (!phone) {
        return res.status(400).json({
          success: false,
          message:
            "РќРµ СѓРєР°Р·Р°РЅ С‚РµР»РµС„РѕРЅ",
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
            "РљР»РёРµРЅС‚ РЅРµ РЅР°Р№РґРµРЅ",
        });
      }

      const client =
        result.rows[0];

      return res.json({
        success: true,

        client: {
          id:
            client.id,

          name:
            client.name || "",

          phone:
            client.phone || "",

          points:
            Number(
              client.bonuses ??
              client.points ??
              0
            ),

          bonuses:
            Number(
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
        "РћС€РёР±РєР° РїРѕРёСЃРєР° РєР»РёРµРЅС‚Р°:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "РћС€РёР±РєР° РїРѕРёСЃРєР° РєР»РёРµРЅС‚Р°",

        error:
          error?.message ||
          String(error),
      });
    }
  }
);

// =====================================================
// PRODUCTS
// =====================================================

// =====================================================
// GET ALL PRODUCTS
// Р’РђР–РќРћ:
// РўРћР’РђР Р« РќР• Р¤РР›Р¬РўР РЈР®РўРЎРЇ РџРћ Р“Р РЈРџРџР• РР›Р РџРћР”Р“Р РЈРџРџР•
// =====================================================

app.get(
  "/api/products",
  async (req, res) => {
    try {
      const {
        groupId,
        subgroupId,
        includeHidden,
        includeArchived,
      } = req.query;

      let sql = `
        SELECT
          p.id,

          p.title,
          p.name,
          p.price,
          p.images,

          p.group_id,
          p.subgroup_id,

          pg.name AS group_name,
          ps.name AS subgroup_name,

          p.category,
          p.category_group,
          p.category_path,
          p.category_leaf,

          p.badge,
          p.rating,
          p.reviews,
          p.delivery,

          p.in_stock,
          p.stock,
          p.reserve,
          p.in_transit,
          p.quantity,

          p.description,

          p.memory,
          p.color,
          p.warranty,

          p.type,
          p.product,
          p.characteristics,
          p.variants_count,

          p.weight,
          p.volume,

          p.article,
          p.code,
          p.external_code,
          p.barcode,

          p.archived,
          p.hidden,

          p.buy_price,
          p.updated_at,
          p.synced_at

        FROM products p

        LEFT JOIN product_groups pg
          ON pg.id = p.group_id

        LEFT JOIN product_subgroups ps
          ON ps.id = p.subgroup_id

        WHERE 1=1
      `;

      const values = [];

      // РџРѕ СѓРјРѕР»С‡Р°РЅРёСЋ РЅРµ РїРѕРєР°Р·С‹РІР°РµРј Р°СЂС…РёРІ

      if (includeArchived !== "true") {
        sql += `
          AND p.archived IS NOT TRUE
        `;
      }

      // hidden С‚РѕРІР°СЂС‹ РїРѕРєР°Р·С‹РІР°РµРј РІ Р°РґРјРёРЅРєРµ,
      // РµСЃР»Рё includeHidden=true

      if (includeHidden !== "true") {
        sql += `
          AND p.hidden IS NOT TRUE
        `;
      }

      // Р¤РёР»СЊС‚СЂ РїРѕ РіСЂСѓРїРїРµ

      if (groupId) {
        values.push(groupId);

        sql += `
          AND p.group_id = $${values.length}
        `;
      }

      // Р¤РёР»СЊС‚СЂ РїРѕ РїРѕРґРіСЂСѓРїРїРµ

      if (subgroupId) {
        values.push(subgroupId);

        sql += `
          AND p.subgroup_id = $${values.length}
        `;
      }

      sql += `
        ORDER BY
          p.updated_at DESC NULLS LAST,
          p.title ASC
      `;

      const result =
        await pgQuery(
          sql,
          values
        );

      const products =
        result.rows.map((item) => ({
          id:
            item.id,

          // РћСЃРЅРѕРІРЅРѕРµ

          title:
            item.title ||
            item.name ||
            "",

          name:
            item.name ||
            item.title ||
            "",

          price:
            Number(
              item.price || 0
            ),

          // РР·РѕР±СЂР°Р¶РµРЅРёСЏ

          images:
            Array.isArray(item.images)
              ? item.images
              : [],

          // =================================================
          // Р“Р РЈРџРџРђ
          // =================================================

          groupId:
            item.group_id ||
            null,

          groupName:
            item.group_name ||
            "",

          // =================================================
          // РџРћР”Р“Р РЈРџРџРђ
          // =================================================

          subgroupId:
            item.subgroup_id ||
            null,

          subgroupName:
            item.subgroup_name ||
            "",

          // РЎС‚Р°СЂС‹Рµ РєР°С‚РµРіРѕСЂРёРё

          category:
            item.category || "",

          categoryGroup:
            item.category_group || "",

          categoryPath:
            item.category_path || [],

          categoryLeaf:
            item.category_leaf || "",

          // Р”РѕРїРѕР»РЅРёС‚РµР»СЊРЅРѕ

          badge:
            item.badge || "",

          rating:
            Number(
              item.rating || 0
            ),

          reviews:
            Number(
              item.reviews || 0
            ),

          delivery:
            item.delivery || "",

          // РќР°Р»РёС‡РёРµ

          inStock:
            Boolean(
              item.in_stock
            ),

          stock:
            Number(
              item.stock || 0
            ),

          reserve:
            Number(
              item.reserve || 0
            ),

          inTransit:
            Number(
              item.in_transit || 0
            ),

          quantity:
            Number(
              item.quantity || 0
            ),

          // РћРїРёСЃР°РЅРёРµ

          description:
            item.description || "",

          // РҐР°СЂР°РєС‚РµСЂРёСЃС‚РёРєРё

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

          weight:
            item.weight !== null &&
            item.weight !== undefined
              ? Number(item.weight)
              : null,

          volume:
            item.volume !== null &&
            item.volume !== undefined
              ? Number(item.volume)
              : null,

          // РђСЂС‚РёРєСѓР»С‹

          article:
            item.article || "",

          code:
            item.code || "",

          externalCode:
            item.external_code || "",

          barcode:
            item.barcode || "",

          // РЎС‚Р°С‚СѓСЃС‹

          archived:
            Boolean(
              item.archived
            ),

          hidden:
            Boolean(
              item.hidden
            ),

          buyPrice:
            item.buy_price !== null &&
            item.buy_price !== undefined
              ? Number(item.buy_price)
              : null,

          updatedAt:
            item.updated_at,

          syncedAt:
            item.synced_at,
        }));

      return res.json({
        success: true,

        count:
          products.length,

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
          "РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё С‚РѕРІР°СЂРѕРІ",
        error: error.message,
      });
    }
  }
);

// =====================================================
// GET PRODUCTS BY GROUP
// =====================================================

app.get(
  "/api/product-groups/:id/products",
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const result =
        await pgQuery(
          `
          SELECT *
          FROM products
          WHERE group_id = $1
          AND archived IS NOT TRUE
          ORDER BY updated_at DESC
          `,
          [id]
        );

      return res.json({
        success: true,
        count:
          result.rows.length,
        products:
          result.rows,
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё С‚РѕРІР°СЂРѕРІ РіСЂСѓРїРїС‹",
        error: error.message,
      });
    }
  }
);

// =====================================================
// GET PRODUCTS BY SUBGROUP
// =====================================================

app.get(
  "/api/product-subgroups/:id/products",
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const result =
        await pgQuery(
          `
          SELECT *
          FROM products
          WHERE subgroup_id = $1
          AND archived IS NOT TRUE
          ORDER BY updated_at DESC
          `,
          [id]
        );

      return res.json({
        success: true,
        count:
          result.rows.length,
        products:
          result.rows,
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё С‚РѕРІР°СЂРѕРІ РїРѕРґРіСЂСѓРїРїС‹",
        error: error.message,
      });
    }
  }
);

// =====================================================
// DEBUG TABLES
// =====================================================

app.get(
  "/api/debug/tables",
  async (req, res) => {
    try {
      const result =
        await pgQuery(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
          ORDER BY table_name
        `);

      return res.json({
        success: true,

        tables:
          result.rows.map(
            (row) =>
              row.table_name
          ),
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "РћС€РёР±РєР° РїРѕР»СѓС‡РµРЅРёСЏ С‚Р°Р±Р»РёС†",
        error: error.message,
      });
    }
  }
);

// =====================================================
// DEBUG COLUMNS
// =====================================================

app.get(
  "/api/debug/columns",
  async (req, res) => {
    try {
      const { table } =
        req.query;

      if (!table) {
        return res.status(400).json({
          success: false,
          message:
            "РЈРєР°Р¶РёС‚Рµ table",
        });
      }

      const result =
        await pgQuery(
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
        columns:
          result.rows,
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "РћС€РёР±РєР° РїРѕР»СѓС‡РµРЅРёСЏ СЃС‚СЂСѓРєС‚СѓСЂС‹ С‚Р°Р±Р»РёС†С‹",
        error: error.message,
      });
    }
  }
);

// =====================================================
// ADD GROUP_ID TO PRODUCTS
// =====================================================

app.get(
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
          "РљРѕР»РѕРЅРєР° group_id РґРѕР±Р°РІР»РµРЅР°",
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "РћС€РёР±РєР° РґРѕР±Р°РІР»РµРЅРёСЏ group_id",
        error: error.message,
      });
    }
  }
);

// =====================================================
// ADD SUBGROUP_ID TO PRODUCTS
// =====================================================

app.get(
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
          "РљРѕР»РѕРЅРєР° subgroup_id РґРѕР±Р°РІР»РµРЅР°",
      });

    } catch (error) {
      console.error(
        "ADD SUBGROUP_ID ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "РћС€РёР±РєР° РґРѕР±Р°РІР»РµРЅРёСЏ subgroup_id",
        error: error.message,
      });
    }
  }
);

// =====================================================
// CONNECT PRODUCT TO GROUP
// =====================================================

app.patch(
  "/api/products/:id/group",
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const {
        groupId,
        subgroupId,
      } = req.body || {};

      const result =
        await pgQuery(
          `
          UPDATE products
          SET
            group_id = $2,
            subgroup_id = $3,
            updated_at = NOW()
          WHERE id = $1
          RETURNING *
          `,
          [
            id,
            groupId || null,
            subgroupId || null,
          ]
        );

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "РўРѕРІР°СЂ РЅРµ РЅР°Р№РґРµРЅ",
        });
      }

      return res.json({
        success: true,
        message:
          "РљР°С‚РµРіРѕСЂРёСЏ С‚РѕРІР°СЂР° РѕР±РЅРѕРІР»РµРЅР°",

        product:
          result.rows[0],
      });

    } catch (error) {
      console.error(
        "UPDATE PRODUCT GROUP ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "РћС€РёР±РєР° РѕР±РЅРѕРІР»РµРЅРёСЏ РєР°С‚РµРіРѕСЂРёРё С‚РѕРІР°СЂР°",
        error: error.message,
      });
    }
  }
);

// =====================================================
// CREATE PRODUCT
// =====================================================

app.post("/api/products", async (req, res) => {
  try {
    const {
      id,
      title,
      name,
      price,
      images,
      category,
      categoryGroup,
      categoryPath,
      categoryLeaf,
      badge,
      rating,
      reviews,
      delivery,
      inStock,
      stock,
      reserve,
      inTransit,
      quantity,
      description,
      memory,
      color,
      warranty,
      type,
      product,
      characteristics,
      variantsCount,
      weight,
      volume,
      article,
      code,
      externalCode,
      barcode,
      archived,
      hidden,
      buyPrice,
      groupId,
    } = req.body || {};

    if (!title && !name) {
      return res.status(400).json({
        success: false,
        message: "Р’РІРµРґРёС‚Рµ РЅР°Р·РІР°РЅРёРµ С‚РѕРІР°СЂР°",
      });
    }

    const productId = id || crypto.randomUUID();

    const result = await pgQuery(
      `
      INSERT INTO products (
        id,
        title,
        name,
        price,
        images,
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
        hidden,
        buy_price,
        group_id,
        subgroup_id,
        updated_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26,
        $27,$28,$29,$30,$31,$32,$33,$34,
        $35,$36,$37,NOW()
      )
      RETURNING *
      `,
      [
        productId,
        title || name || "",
        name || title || "",
        Number(price) || 0,
        Array.isArray(images) ? images : [],
        category || "",
        categoryGroup || "",
        categoryPath || [],
        categoryLeaf || "",
        badge || "",
        Number(rating) || 0,
        Number(reviews) || 0,
        delivery || "",
        Boolean(inStock),
        Number(stock) || 0,
        Number(reserve) || 0,
        Number(inTransit) || 0,
        Number(quantity) || 0,
        description || "",
        memory || "",
        color || "",
        warranty || "",
        type || "",
        product || "",
        characteristics || {},
        Number(variantsCount) || 0,
        weight ? Number(weight) : null,
        volume ? Number(volume) : null,
        article || "",
        code || "",
        externalCode || "",
        barcode || "",
        Boolean(archived),
        Boolean(hidden),
        buyPrice ? Number(buyPrice) : null,
        groupId || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "РўРѕРІР°СЂ СЃРѕР·РґР°РЅ",
      product: result.rows[0],
    });

  } catch (error) {
    console.error("CREATE PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ С‚РѕРІР°СЂР°",
      error: error.message,
    });
  }
});


// =====================================================
// UPDATE PRODUCT
// =====================================================

app.patch("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existingResult = await pgQuery(
      `
      SELECT *
      FROM products
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "РўРѕРІР°СЂ РЅРµ РЅР°Р№РґРµРЅ",
      });
    }

    const current = existingResult.rows[0];

    const {
      title,
      name,
      price,
      images,
      category,
      categoryGroup,
      categoryPath,
      categoryLeaf,
      badge,
      rating,
      reviews,
      delivery,
      inStock,
      stock,
      reserve,
      inTransit,
      quantity,
      description,
      memory,
      color,
      warranty,
      type,
      product,
      characteristics,
      variantsCount,
      weight,
      volume,
      article,
      code,
      externalCode,
      barcode,
      archived,
      hidden,
      buyPrice,
      groupId,
    } = req.body || {};

    const result = await pgQuery(
      `
      UPDATE products
      SET
        title = $2,
        name = $3,
        price = $4,
        images = $5,
        category = $6,
        category_group = $7,
        category_path = $8,
        category_leaf = $9,
        badge = $10,
        rating = $11,
        reviews = $12,
        delivery = $13,
        in_stock = $14,
        stock = $15,
        reserve = $16,
        in_transit = $17,
        quantity = $18,
        description = $19,
        memory = $20,
        color = $21,
        warranty = $22,
        type = $23,
        product = $24,
        characteristics = $25,
        variants_count = $26,
        weight = $27,
        volume = $28,
        article = $29,
        code = $30,
        external_code = $31,
        barcode = $32,
        archived = $33,
        hidden = $34,
        buy_price = $35,
        group_id = $36,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [
        id,

        title !== undefined
          ? title
          : current.title,

        name !== undefined
          ? name
          : current.name,

        price !== undefined
          ? Number(price)
          : current.price,

        images !== undefined
          ? images
          : current.images,

        category !== undefined
          ? category
          : current.category,

        categoryGroup !== undefined
          ? categoryGroup
          : current.category_group,

        categoryPath !== undefined
          ? categoryPath
          : current.category_path,

        categoryLeaf !== undefined
          ? categoryLeaf
          : current.category_leaf,

        badge !== undefined
          ? badge
          : current.badge,

        rating !== undefined
          ? Number(rating)
          : current.rating,

        reviews !== undefined
          ? Number(reviews)
          : current.reviews,

        delivery !== undefined
          ? delivery
          : current.delivery,

        inStock !== undefined
          ? Boolean(inStock)
          : current.in_stock,

        stock !== undefined
          ? Number(stock)
          : current.stock,

        reserve !== undefined
          ? Number(reserve)
          : current.reserve,

        inTransit !== undefined
          ? Number(inTransit)
          : current.in_transit,

        quantity !== undefined
          ? Number(quantity)
          : current.quantity,

        description !== undefined
          ? description
          : current.description,

        memory !== undefined
          ? memory
          : current.memory,

        color !== undefined
          ? color
          : current.color,

        warranty !== undefined
          ? warranty
          : current.warranty,

        type !== undefined
          ? type
          : current.type,

        product !== undefined
          ? product
          : current.product,

        characteristics !== undefined
          ? characteristics
          : current.characteristics,

        variantsCount !== undefined
          ? Number(variantsCount)
          : current.variants_count,

        weight !== undefined
          ? Number(weight)
          : current.weight,

        volume !== undefined
          ? Number(volume)
          : current.volume,

        article !== undefined
          ? article
          : current.article,

        code !== undefined
          ? code
          : current.code,

        externalCode !== undefined
          ? externalCode
          : current.external_code,

        barcode !== undefined
          ? barcode
          : current.barcode,

        archived !== undefined
          ? Boolean(archived)
          : current.archived,

        hidden !== undefined
          ? Boolean(hidden)
          : current.hidden,

        buyPrice !== undefined
          ? Number(buyPrice)
          : current.buy_price,

        groupId !== undefined
          ? groupId
          : current.group_id,
      ]
    );

    return res.json({
      success: true,
      message: "РўРѕРІР°СЂ СѓСЃРїРµС€РЅРѕ РѕР±РЅРѕРІР»С‘РЅ",
      product: result.rows[0],
    });

  } catch (error) {

    console.error("UPDATE PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "РћС€РёР±РєР° СЃРѕС…СЂР°РЅРµРЅРёСЏ С‚РѕРІР°СЂР°",
      error: error.message,
    });
  }
});


// =====================================================
// DELETE PRODUCT
// =====================================================

app.delete("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pgQuery(
      `
      DELETE FROM products
      WHERE id = $1
      RETURNING id
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "РўРѕРІР°СЂ РЅРµ РЅР°Р№РґРµРЅ",
      });
    }

    return res.json({
      success: true,
      message: "РўРѕРІР°СЂ СѓРґР°Р»С‘РЅ",
    });

  } catch (error) {

    console.error("DELETE PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "РћС€РёР±РєР° СѓРґР°Р»РµРЅРёСЏ С‚РѕРІР°СЂР°",
      error: error.message,
    });
  }
});

// =====================================================
// MESSAGES / CONCIERGE
// POSTGRESQL
// =====================================================

// РЎРѕР·РґР°С‘Рј С‚Р°Р±Р»РёС†Сѓ СЃРѕРѕР±С‰РµРЅРёР№, РµСЃР»Рё РµС‘ РµС‰С‘ РЅРµС‚
await pgQuery(`
  CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY,
    user_login TEXT NOT NULL,
    author TEXT NOT NULL CHECK (
      author IN ('user', 'admin')
    ),
    text TEXT NOT NULL,
    read_by_user BOOLEAN NOT NULL DEFAULT FALSE,
    read_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

await pgQuery(`
  CREATE INDEX IF NOT EXISTS idx_messages_user_login
  ON messages(user_login)
`);

await pgQuery(`
  CREATE INDEX IF NOT EXISTS idx_messages_created_at
  ON messages(created_at)
`);

console.log("рџ’¬ РўР°Р±Р»РёС†Р° messages РіРѕС‚РѕРІР°");


// =====================================================
// GET ALL MESSAGES
// =====================================================

app.get("/api/messages", async (req, res) => {
  try {

    const result = await pgQuery(`
      SELECT
        id,
        user_login,
        author,
        text,
        read_by_user,
        read_by_admin,
        created_at
      FROM messages
      ORDER BY created_at ASC
    `);

    const messages = result.rows.map(
      (message) => ({
        id: message.id,

        userLogin:
          message.user_login,

        author:
          message.author,

        text:
          message.text,

        readByUser:
          Boolean(
            message.read_by_user
          ),

        readByAdmin:
          Boolean(
            message.read_by_admin
          ),

        createdAt:
          message.created_at,
      })
    );

    return res.json({
      success: true,
      messages,
    });

  } catch (error) {

    console.error(
      "GET MESSAGES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ СЃРѕРѕР±С‰РµРЅРёСЏ",
      error:
        error.message,
    });
  }
});


// =====================================================
// SEND MESSAGE
// =====================================================

app.post("/api/messages", async (req, res) => {
  try {

    const {
      userLogin,
      author,
      text,
      readByUser,
      readByAdmin,
    } = req.body || {};

    const cleanUserLogin =
      String(userLogin || "").trim();

    const cleanText =
      String(text || "").trim();

    // РџСЂРѕРІРµСЂСЏРµРј РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ

    if (!cleanUserLogin) {
      return res.status(400).json({
        success: false,
        message:
          "РќРµ СѓРєР°Р·Р°РЅ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ",
      });
    }

    // РџСЂРѕРІРµСЂСЏРµРј С‚РµРєСЃС‚

    if (!cleanText) {
      return res.status(400).json({
        success: false,
        message:
          "Р’РІРµРґРёС‚Рµ СЃРѕРѕР±С‰РµРЅРёРµ",
      });
    }

    // РџСЂРѕРІРµСЂСЏРµРј Р°РІС‚РѕСЂР°

    if (
      author !== "user" &&
      author !== "admin"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "РќРµРєРѕСЂСЂРµРєС‚РЅС‹Р№ Р°РІС‚РѕСЂ СЃРѕРѕР±С‰РµРЅРёСЏ",
      });
    }

    const messageId =
      crypto.randomUUID();

    const result = await pgQuery(
      `
      INSERT INTO messages (
        id,
        user_login,
        author,
        text,
        read_by_user,
        read_by_admin,
        created_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        NOW()
      )
      RETURNING *
      `,
      [
        messageId,
        cleanUserLogin,
        author,
        cleanText,

        Boolean(readByUser),

        Boolean(readByAdmin),
      ]
    );

    const message =
      result.rows[0];

    console.log(
      `рџ’¬ РќРѕРІРѕРµ СЃРѕРѕР±С‰РµРЅРёРµ РѕС‚ ${author}:`,
      cleanUserLogin
    );

    return res.status(201).json({
      success: true,

      message: {
        id:
          message.id,

        userLogin:
          message.user_login,

        author:
          message.author,

        text:
          message.text,

        readByUser:
          Boolean(
            message.read_by_user
          ),

        readByAdmin:
          Boolean(
            message.read_by_admin
          ),

        createdAt:
          message.created_at,
      },
    });

  } catch (error) {

    console.error(
      "SEND MESSAGE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РїСЂР°РІРёС‚СЊ СЃРѕРѕР±С‰РµРЅРёРµ",
      error:
        error.message,
    });
  }
});


// =====================================================
// MARK MESSAGE AS READ
// =====================================================

app.patch(
  "/api/messages/:id/read",
  async (req, res) => {
    try {

      const { id } =
        req.params;

      const { field } =
        req.body || {};

      let column;

      // Р Р°Р·СЂРµС€Р°РµРј РјРµРЅСЏС‚СЊ С‚РѕР»СЊРєРѕ СЌС‚Рё РїРѕР»СЏ

      if (
        field === "readByUser"
      ) {
        column =
          "read_by_user";
      }

      if (
        field === "readByAdmin"
      ) {
        column =
          "read_by_admin";
      }

      if (!column) {
        return res.status(400).json({
          success: false,
          message:
            "РќРµРєРѕСЂСЂРµРєС‚РЅРѕРµ РїРѕР»Рµ",
        });
      }

      const result =
        await pgQuery(
          `
          UPDATE messages
          SET ${column} = TRUE
          WHERE id = $1
          RETURNING *
          `,
          [id]
        );

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "РЎРѕРѕР±С‰РµРЅРёРµ РЅРµ РЅР°Р№РґРµРЅРѕ",
        });
      }

      return res.json({
        success: true,
        message:
          "РЎРѕРѕР±С‰РµРЅРёРµ РїСЂРѕС‡РёС‚Р°РЅРѕ",
      });

    } catch (error) {

      console.error(
        "MARK MESSAGE READ ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "РќРµ СѓРґР°Р»РѕСЃСЊ РѕР±РЅРѕРІРёС‚СЊ СЃРѕРѕР±С‰РµРЅРёРµ",
        error:
          error.message,
      });
    }
  }
);


// =====================================================
// DELETE USER CHAT
// =====================================================

app.delete(
  "/api/messages/chat/:userLogin",
  async (req, res) => {
    try {

      const userLogin =
        String(
          req.params.userLogin || ""
        ).trim();

      if (!userLogin) {
        return res.status(400).json({
          success: false,
          message:
            "РќРµ СѓРєР°Р·Р°РЅ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ",
        });
      }

      await pgQuery(
        `
        DELETE FROM messages
        WHERE user_login = $1
        `,
        [userLogin]
      );

      console.log(
        "рџ—‘ Р§Р°С‚ СѓРґР°Р»С‘РЅ:",
        userLogin
      );

      return res.json({
        success: true,
        message:
          "Р§Р°С‚ СѓРґР°Р»С‘РЅ",
      });

    } catch (error) {

      console.error(
        "DELETE CHAT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "РќРµ СѓРґР°Р»РѕСЃСЊ СѓРґР°Р»РёС‚СЊ С‡Р°С‚",
        error:
          error.message,
      });
    }
  }
);

// =====================================================
// TRADE-IN
// POSTGRESQL
// =====================================================

// РџРѕР»СѓС‡РёС‚СЊ РІСЃРµ СѓСЃС‚СЂРѕР№СЃС‚РІР° Trade-In
app.get("/api/trade-in", async (req, res) => {
  try {
    const result = await pgQuery(`
      SELECT *
      FROM trade_in
      ORDER BY created_at DESC
    `);

    const products = result.rows.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description || "",
      price: Number(item.price || 0),
      memory: item.memory || "",
      color: item.color || "",
      condition: item.condition || "",
      warranty: item.warranty || "",
      images: Array.isArray(item.images)
        ? item.images
        : [],
      status: item.status || "available",
      createdAt: item.created_at,
    }));

    return res.json({
      success: true,
      products,
    });

  } catch (error) {
    console.error("GET TRADE-IN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ Trade-In",
      error: error.message,
    });
  }
});


// =====================================================
// GET ONE TRADE-IN DEVICE
// =====================================================

app.get("/api/trade-in/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pgQuery(
      `
      SELECT *
      FROM trade_in
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "РЈСЃС‚СЂРѕР№СЃС‚РІРѕ РЅРµ РЅР°Р№РґРµРЅРѕ",
      });
    }

    const item = result.rows[0];

    return res.json({
      success: true,
      product: {
        id: item.id,
        title: item.title,
        description: item.description || "",
        price: Number(item.price || 0),
        memory: item.memory || "",
        color: item.color || "",
        condition: item.condition || "",
        warranty: item.warranty || "",
        images: Array.isArray(item.images)
          ? item.images
          : [],
        status: item.status || "available",
        createdAt: item.created_at,
      },
    });

  } catch (error) {
    console.error("GET TRADE-IN PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "РћС€РёР±РєР° РїРѕР»СѓС‡РµРЅРёСЏ СѓСЃС‚СЂРѕР№СЃС‚РІР°",
      error: error.message,
    });
  }
});


// =====================================================
// CREATE TRADE-IN DEVICE
// =====================================================

app.post("/api/trade-in", async (req, res) => {
  try {
    const {
      title,
      description = "",
      price = 0,
      memory = "",
      color = "",
      condition = "",
      warranty = "",
      images = [],
      status = "available",
    } = req.body || {};

    if (!String(title || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Р’РІРµРґРёС‚Рµ РЅР°Р·РІР°РЅРёРµ СѓСЃС‚СЂРѕР№СЃС‚РІР°",
      });
    }

    const id = crypto.randomUUID();

    const result = await pgQuery(
      `
      INSERT INTO trade_in (
        id,
        title,
        description,
        price,
        memory,
        color,
        condition,
        warranty,
        images,
        status,
        created_at
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
        $9::jsonb,
        $10,
        NOW()
      )
      RETURNING *
      `,
      [
        id,
        String(title).trim(),
        String(description || ""),
        Number(price) || 0,
        String(memory || ""),
        String(color || ""),
        String(condition || ""),
        String(warranty || ""),
        JSON.stringify(Array.isArray(images) ? images : []),
        status === "sold" ? "sold" : "available",
      ]
    );

    const item = result.rows[0];

    console.log("TRADE-IN CREATED:", item.id);

    return res.status(201).json({
      success: true,
      message: "РЈСЃС‚СЂРѕР№СЃС‚РІРѕ Trade-In СЃРѕР·РґР°РЅРѕ",
      product: {
        id: item.id,
        title: item.title,
        description: item.description,
        price: Number(item.price),
        memory: item.memory,
        color: item.color,
        condition: item.condition,
        warranty: item.warranty,
        images: item.images,
        status: item.status,
        createdAt: item.created_at,
      },
    });

  } catch (error) {
    console.error("CREATE TRADE-IN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ Trade-In",
      error: error.message,
    });
  }
});


// =====================================================
// UPDATE TRADE-IN DEVICE
// =====================================================

app.patch("/api/trade-in/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      description = "",
      price = 0,
      memory = "",
      color = "",
      condition = "",
      warranty = "",
      images = [],
      status = "available",
    } = req.body || {};

    const result = await pgQuery(
      `
      UPDATE trade_in
      SET
        title = $2,
        description = $3,
        price = $4,
        memory = $5,
        color = $6,
        condition = $7,
        warranty = $8,
        images = $9::jsonb,
        status = $10
      WHERE id = $1
      RETURNING *
      `,
      [
        id,
        String(title || "").trim(),
        String(description || ""),
        Number(price) || 0,
        String(memory || ""),
        String(color || ""),
        String(condition || ""),
        String(warranty || ""),
        JSON.stringify(Array.isArray(images) ? images : []),
        status === "sold" ? "sold" : "available",
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "РЈСЃС‚СЂРѕР№СЃС‚РІРѕ РЅРµ РЅР°Р№РґРµРЅРѕ",
      });
    }

    const item = result.rows[0];

    return res.json({
      success: true,
      message: "РЈСЃС‚СЂРѕР№СЃС‚РІРѕ РѕР±РЅРѕРІР»РµРЅРѕ",
      product: item,
    });

  } catch (error) {
    console.error("UPDATE TRADE-IN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "РћС€РёР±РєР° РѕР±РЅРѕРІР»РµРЅРёСЏ СѓСЃС‚СЂРѕР№СЃС‚РІР°",
      error: error.message,
    });
  }
});


// =====================================================
// DELETE TRADE-IN DEVICE
// =====================================================

app.delete("/api/trade-in/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pgQuery(
      `
      DELETE FROM trade_in
      WHERE id = $1
      RETURNING id
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "РЈСЃС‚СЂРѕР№СЃС‚РІРѕ РЅРµ РЅР°Р№РґРµРЅРѕ",
      });
    }

    return res.json({
      success: true,
      message: "РЈСЃС‚СЂРѕР№СЃС‚РІРѕ СѓРґР°Р»РµРЅРѕ",
    });

  } catch (error) {
    console.error("DELETE TRADE-IN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "РћС€РёР±РєР° СѓРґР°Р»РµРЅРёСЏ СѓСЃС‚СЂРѕР№СЃС‚РІР°",
      error: error.message,
    });
  }
});



// =====================================================
// GET CLIENT BY PHONE
// =====================================================

app.get("/api/clients/phone/:phone", async (req, res) => {
  try {
    const phone = normalizePhone(
      decodeURIComponent(req.params.phone)
    );

    const result = await pgQuery(
      `
      SELECT *
      FROM clients
      WHERE phone = $1
      LIMIT 1
      `,
      [phone]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "РљР»РёРµРЅС‚ РЅРµ РЅР°Р№РґРµРЅ",
      });
    }

    return res.json({
      success: true,
      client: formatClient(result.rows[0]),
    });

  } catch (error) {

    console.error(
      "GET CLIENT BY PHONE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "РћС€РёР±РєР° РїРѕР»СѓС‡РµРЅРёСЏ РєР»РёРµРЅС‚Р°",
      error: error.message,
    });
  }
});

// =====================================================
// GET CLIENT OPERATIONS
// =====================================================

app.get(
  "/api/clients/:id/operations",
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pgQuery(
        `
        SELECT *
        FROM client_operations
        WHERE client_id = $1
        ORDER BY created_at DESC
        `,
        [id]
      );

      return res.json({
        success: true,
        operations: result.rows,
      });

    } catch (error) {

      console.error(
        "GET CLIENT OPERATIONS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Не удалось загрузить историю операций",
        error:
          error.message,
      });
    }
  }
);

// =====================================================
// GET CLIENT OPERATIONS BY PHONE
// =====================================================

app.get(
  "/api/clients/phone/:phone/operations",
  async (req, res) => {
    try {
      const phone = normalizePhone(
        decodeURIComponent(req.params.phone)
      );

      const result = await pgQuery(
        `
        SELECT
          co.id,
          co.type,
          co.points,
          co.reason,
          co.created_at
        FROM client_operations co
        INNER JOIN clients c
          ON c.id = co.client_id
        WHERE c.phone = $1
        ORDER BY co.created_at DESC, co.id DESC
        `,
        [phone]
      );

      return res.json({
        success: true,

        operations: result.rows.map((row) => ({
          id: row.id,

          type: row.type || "",

          points: Number(row.points || 0),

          amount: Number(row.points || 0),

          bonuses: Number(row.points || 0),

          reason: row.reason || "",

          productName:
            row.reason || "РћРїРµСЂР°С†РёСЏ",

          operationDate:
            row.created_at,

          createdAt:
            row.created_at,
        })),
      });

    } catch (error) {

      console.error(
        "GET CLIENT OPERATIONS BY PHONE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РёСЃС‚РѕСЂРёРё РѕРїРµСЂР°С†РёР№",
        error:
          error.message,
      });
    }
  }
);



// =====================================================
// DELETE CLIENTS
// =====================================================

app.delete(
  "/api/clients/:id",
  async (req, res) => {

    const { id } = req.params;

    try {

      const existing = await pgQuery(
        `
        SELECT
          id,
          login
        FROM clients
        WHERE id = $1
        LIMIT 1
        `,
        [id]
      );

      if (existing.rows.length === 0) {

        return res.status(404).json({
          success: false,
          message: "РљР»РёРµРЅС‚ РЅРµ РЅР°Р№РґРµРЅ",
        });

      }

      const client = existing.rows[0];

      /*
      ==========================================
      РЈР”РђР›РЇР•Рњ РРЎРўРћР РР® РћРџР•Р РђР¦РР™
      ==========================================
      */

      await pgQuery(
        `
        DELETE FROM client_operations
        WHERE client_id = $1
        `,
        [id]
      );

      /*
      ==========================================
      РЈР”РђР›РЇР•Рњ РЎРћРћР‘Р©Р•РќРРЇ РљР›РР•РќРўРђ
      ==========================================
      */

      if (client.login) {

        await pgQuery(
          `
          DELETE FROM messages
          WHERE user_login = $1
          `,
          [client.login]
        );

      }

      /*
      ==========================================
      РЈР”РђР›РЇР•Рњ РљР›РР•РќРўРђ
      ==========================================
      */

      const result = await pgQuery(
        `
        DELETE FROM clients
        WHERE id = $1
        RETURNING id
        `,
        [id]
      );

      return res.json({
        success: true,

        message:
          "РљР»РёРµРЅС‚ СѓСЃРїРµС€РЅРѕ СѓРґР°Р»С‘РЅ",

        id:
          result.rows[0].id,
      });

    } catch (error) {

      console.error(
        "DELETE CLIENT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "РћС€РёР±РєР° СѓРґР°Р»РµРЅРёСЏ РєР»РёРµРЅС‚Р°",

        error:
          error.message,
      });
    }
  }
);

// =====================================================
// UNKNOWN ROUTE
// =====================================================

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API route not found",

    path:
      req.path,
  });
});

// =====================================================
// SERVER
// =====================================================


const PORT =
  process.env.PORT || 3000;

  initializeTradeInTable()
  .then(() => {

    app.listen(PORT, () => {
      console.log(
        `рџљЂ KUSAI MAX API Р·Р°РїСѓС‰РµРЅ РЅР° РїРѕСЂС‚Сѓ ${PORT}`
      );
      console.log(
    `рџ“Ў http://localhost:${PORT}`
  );
    });

  })
  .catch((error) => {

    console.error(
      "вќЊ РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РїСѓСЃС‚РёС‚СЊ СЃРµСЂРІРµСЂ:",
      error
    );

    process.exit(1);

  });

export default app; 
//d