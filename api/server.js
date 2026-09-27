import express from "express";
import axios from "axios";
import cors from "cors";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { registerHomepageRoutes } from "./homepage.js";

import {
  getAirPods,
  getProducts,
} from "./moysklad.js";


import { db } from "./firebaseAdmin.js";
import { calculateBonusDiscount } from "./bonus.js";
import { query as pgQuery } from "./postgres.js";

import {
  getOneCCustomer,
  getOneCSalesHistory,
  getOneCCustomerQR,
  getOneCBonusHistory,
} from "./oneC.js";

const app = express();

// CORS вЂ” РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ РґРѕ API-РјР°СЂС€СЂСѓС‚РѕРІ
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

/**
 * РџРѕР»СѓС‡РµРЅРёРµ QR-РєРѕРґР° РєР»РёРµРЅС‚Р° РїРѕ Р·Р°РїСЂРѕСЃСѓ РїСЂРёР»РѕР¶РµРЅРёСЏ.
 */
app.get(
  "/api/clients/phone/:phone/qr",
  async (req, res) => {
    try {
      const phone = req.params.phone;

      if (!phone) {
        return res.status(400).json({
          success: false,
          message: "РќРµ СѓРєР°Р·Р°РЅ С‚РµР»РµС„РѕРЅ РєР»РёРµРЅС‚Р°",
        });
      }

      const customerQR = await getOneCCustomerQR(phone);

      if (!customerQR) {
        return res.status(404).json({
          success: false,
          message: "QR-РєРѕРґ РєР»РёРµРЅС‚Р° РЅРµ РЅР°Р№РґРµРЅ РІ 1РЎ",
        });
      }

      return res.json({
        success: true,
        customerQR,
      });
    } catch (error) {
      console.error(
        "РћС€РёР±РєР° API РїРѕР»СѓС‡РµРЅРёСЏ QR-РєРѕРґР°:",
        error?.message || error
      );

      return res.status(500).json({
        success: false,
        message: "РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕР»СѓС‡РёС‚СЊ QR-РєРѕРґ РёР· 1РЎ",
      });
    }
  }
);

app.get("/api/moysklad/image/:imageId", async (req, res) => {
  try {
    const { imageId } = req.params;

    if (!imageId) {
      return res.status(400).json({
        success: false,
        message: "РќРµ СѓРєР°Р·Р°РЅ imageId",
      });
    }

    const imageUrl =
      `${process.env.MOYSKLAD_API_URL || "https://api.moysklad.ru/api/remap/1.2"}` +
      `/download/${imageId}`;

    const response = await axios.get(imageUrl, {
      auth: {
        username: process.env.MOYSKLAD_LOGIN,
        password: process.env.MOYSKLAD_PASSWORD,
      },
      responseType: "arraybuffer",
      timeout: 120000,
    });

    res.set("Content-Type", response.headers["content-type"] || "image/png");
    res.set("Cache-Control", "public, max-age=86400");

    return res.send(response.data);
  } catch (error) {
    console.error(
      "MOYSKLAD IMAGE PROXY ERROR:",
      error.response?.status,
      error.message
    );

    return res.status(500).json({
  success: false,
  message: "РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РёР·РѕР±СЂР°Р¶РµРЅРёСЏ",
  error: error.response?.data
    ? Buffer.from(error.response.data).toString("utf8").slice(0, 1000)
    : error.message,
  status: error.response?.status || null,
});
  }
});

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

    console.log("Р Р†РЎС™РІР‚В¦ Р  РЎС›Р  Р’В°Р  Р’В±Р  Р’В»Р  РЎвЂР РЋРІР‚ Р  Р’В° trade_in Р  РЎвЂ“Р  РЎвЂўР РЋРІР‚С™Р  РЎвЂўР  Р вЂ Р  Р’В°");

  } catch (error) {
    console.error(
      "Р Р†РЎСљР Р‰ Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р РЋР С“Р  РЎвЂўР  Р’В·Р  РўвЂР  Р’В°Р  Р вЂ¦Р  РЎвЂР РЋР РЏ Р РЋРІР‚С™Р  Р’В°Р  Р’В±Р  Р’В»Р  РЎвЂР РЋРІР‚ Р РЋРІР‚в„– trade_in:",
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

const initializeHomepageTables =
  registerHomepageRoutes(app, pgQuery);

await initializeHomepageTables();

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
      message: "Р  РЎСљР  Р’ВµР РЋРІР‚С™ Р  РўвЂР  РЎвЂўР РЋР С“Р РЋРІР‚С™Р РЋРЎвЂњР  РЎвЂ”Р  Р’В°",
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

// =====================================================
// KUSAI SCORE
// =====================================================

const KUSAI_SCORE_PURCHASE_CACHE_TTL = 15_000;
const kusaiScorePurchaseCache = new Map();

const KUSAI_SCORE_PRESETS = {
  "Trade-In": 150,
  "Р РµРєРѕРјРµРЅРґР°С†РёСЏ РґСЂСѓРіР°": 200,
  "РћС‚Р·С‹РІ": 50,
};


function getKusaiScoreLevel(score) {
  const value = Number(score) || 0;

  if (value >= 15000) return "MAX BLACK";
  if (value >= 5000) return "MAX GOLD";
  if (value >= 1000) return "MAX SILVER";
  return "MAX MEMBER";
}

async function getPurchaseScore(phone) {
  const normalizedPhone = normalizePhone(phone);
  const cached = kusaiScorePurchaseCache.get(normalizedPhone);

  if (
    cached &&
    Date.now() - cached.createdAt < KUSAI_SCORE_PURCHASE_CACHE_TTL
  ) {
    return cached.score;
  }

  const sales = await getOneCSalesHistory(normalizedPhone);

  const score = (Array.isArray(sales) ? sales : []).reduce(
    (total, sale) => {
      const amount = Number(sale?.sum) || 0;
      return total + Math.floor(Math.max(0, amount) / 100);
    },
    0
  );

  kusaiScorePurchaseCache.set(normalizedPhone, {
    score,
    createdAt: Date.now(),
  });

  return score;
}

async function getKusaiScoreByClientId(clientId) {
  const clientResult = await pgQuery(
    `
    SELECT id, name, phone
    FROM clients
    WHERE id = $1
    LIMIT 1
    `,
    [clientId]
  );

  if (clientResult.rows.length === 0) {
    return null;
  }

  const client = clientResult.rows[0];
  const purchaseScore = await getPurchaseScore(client.phone);

  const operationsResult = await pgQuery(
    `
    SELECT
      id,
      type,
      points,
      reason,
      comment,
      created_at
    FROM kusai_score_operations
    WHERE client_id = $1
    ORDER BY created_at DESC, id DESC
    `,
    [clientId]
  );

  const manualAdjustment = operationsResult.rows.reduce(
    (total, operation) => {
      const amount = Number(operation.points) || 0;
      return total + (operation.type === "remove" ? -amount : amount);
    },
    0
  );

  const score = Math.max(0, purchaseScore + manualAdjustment);

  return {
    client: {
      id: client.id,
      name: client.name || "",
      phone: client.phone || "",
    },
    score,
    purchaseScore,
    manualAdjustment,
    level: getKusaiScoreLevel(score),
    operations: operationsResult.rows.map((operation) => ({
      id: operation.id,
      type: operation.type,
      points: Number(operation.points || 0),
      reason: operation.reason || "",
      comment: operation.comment || "",
      createdAt: operation.created_at,
    })),
  };
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

    // QR-РљРћР” РљР›РР•РќРўРђ
    customerQR:
      client.customerQR ??
      client.customer_qr ??
      client.CustomerQR ??
      null,

    createdAt:
      client.created_at ||
      null,

    updatedAt:
      client.updated_at ||
      null,
  };
}

// =====================================================
// Р С›Р вЂР С›Р вЂњР С’Р В©Р вЂўР СњР ВР вЂў Р С™Р вЂєР ВР вЂўР СњР СћР С’ Р С’Р С™Р СћР Р€Р С’Р вЂєР В¬Р СњР В«Р СљР В Р вЂќР С’Р СњР СњР В«Р СљР В Р ВР вЂ” 1Р РЋ
// =====================================================

async function enrichClientWithOneC(client) {

  const formattedClient =
    formatClient(client);

  try {

    console.log("");
    console.log(
      "======================================"
    );
    console.log(
      "1Р РЋ: Р СџР С›Р вЂєР Р€Р В§Р вЂўР СњР ВР вЂў Р С’Р С™Р СћР Р€Р С’Р вЂєР В¬Р СњР В«Р Тђ Р вЂќР С’Р СњР СњР В«Р Тђ Р С™Р вЂєР ВР вЂўР СњР СћР С’"
    );
    console.log(
      "======================================"
    );

    console.log(
      "Р СћР ВµР В»Р ВµРЎвЂћР С•Р Р…:",
      formattedClient.phone
    );

    const oneCClient =
      await getOneCCustomer(
        formattedClient.phone
      );

    console.log("======================================");
console.log("РџРћР›РќР«Р™ РћРўР’Р•Рў РР— 1РЎ:");
console.log(JSON.stringify(oneCClient, null, 2));
console.log("======================================");

console.log("QR РР— 1РЎ customerQR:", oneCClient?.customerQR);
console.log("QR РР— 1РЎ customer_qr:", oneCClient?.customer_qr);
console.log("QR РР— 1РЎ qr:", oneCClient?.qr);
console.log("QR РР— 1РЎ qrCode:", oneCClient?.qrCode);
console.log("QR РР— 1РЎ QRCode:", oneCClient?.QRCode);

    if (!oneCClient) {

      console.log(
        "1Р РЋ Р Р…Р Вµ Р Р†Р ВµРЎР‚Р Р…РЎС“Р В»Р В° Р Т‘Р С•Р С—Р С•Р В»Р Р…Р С‘РЎвЂљР ВµР В»РЎРЉР Р…РЎвЂ№Р Вµ Р Т‘Р В°Р Р…Р Р…РЎвЂ№Р Вµ Р С”Р В»Р С‘Р ВµР Р…РЎвЂљР В°"
      );

      return formattedClient;
    }

    console.log(
      "1Р РЋ: Р Т‘Р В°Р Р…Р Р…РЎвЂ№Р Вµ Р С”Р В»Р С‘Р ВµР Р…РЎвЂљР В° РЎС“РЎРѓР С—Р ВµРЎв‚¬Р Р…Р С• Р С—Р С•Р В»РЎС“РЎвЂЎР ВµР Р…РЎвЂ№"
    );

    return {
      ...formattedClient,

      // QR-Р С”Р С•Р Т‘ Р С—РЎР‚Р С‘РЎвЂ¦Р С•Р Т‘Р С‘РЎвЂљ РЎвЂљР С•Р В»РЎРЉР С”Р С• Р С‘Р В· 1Р РЋ
      customerQR:
        oneCClient.customerQR ??
        oneCClient.customer_qr ??
        oneCClient.qrCode ??
        oneCClient.qrcode ??
        oneCClient.qr ??
        oneCClient.QR ??
        formattedClient.customerQR ??
        null,

      // Р С›Р В±Р Р…Р С•Р Р†Р В»РЎРЏР ВµР С Р С‘Р СРЎРЏ, Р ВµРЎРѓР В»Р С‘ 1Р РЋ Р ВµР С–Р С• Р С—Р ВµРЎР‚Р ВµР Т‘Р В°Р В»Р В°
      name:
        oneCClient.name ||
        formattedClient.name,

      // Р С’Р С”РЎвЂљРЎС“Р В°Р В»РЎРЉР Р…РЎвЂ№Р Вµ Р В±Р С•Р Р…РЎС“РЎРѓРЎвЂ№ Р С‘Р В· 1Р РЋ
      bonuses:
        oneCClient.bonusBalance ??
        oneCClient.bonuses ??
        formattedClient.bonuses,

      points:
        oneCClient.bonusBalance ??
        oneCClient.points ??
        formattedClient.points,

      // Р СџР ВµРЎР‚Р ВµР Т‘Р В°Р ВµР С Р Т‘Р С•Р С—Р С•Р В»Р Р…Р С‘РЎвЂљР ВµР В»РЎРЉР Р…РЎвЂ№Р Вµ Р Т‘Р В°Р Р…Р Р…РЎвЂ№Р Вµ 1Р РЋ
      oneCData:
        oneCClient,
    };

  } catch (error) {

    console.error(
      "Р С›РЎв‚¬Р С‘Р В±Р С”Р В° Р С—Р С•Р В»РЎС“РЎвЂЎР ВµР Р…Р С‘РЎРЏ Р Т‘Р В°Р Р…Р Р…РЎвЂ№РЎвЂ¦ Р С”Р В»Р С‘Р ВµР Р…РЎвЂљР В° Р С‘Р В· 1Р РЋ:",
      error?.message || error
    );

    /*
    Р вЂ™Р С’Р вЂ“Р СњР С›:

    Р вЂўРЎРѓР В»Р С‘ 1Р РЋ Р Р†РЎР‚Р ВµР СР ВµР Р…Р Р…Р С• Р Р…Р ВµР Т‘Р С•РЎРѓРЎвЂљРЎС“Р С—Р Р…Р В°,
    Р С”Р В»Р С‘Р ВµР Р…РЎвЂљ Р Р†РЎРѓРЎвЂ РЎР‚Р В°Р Р†Р Р…Р С• РЎРѓР СР С•Р В¶Р ВµРЎвЂљ Р С—Р С•Р В»РЎРЉР В·Р С•Р Р†Р В°РЎвЂљРЎРЉРЎРѓРЎРЏ Р С—РЎР‚Р С‘Р В»Р С•Р В¶Р ВµР Р…Р С‘Р ВµР С.
    */

    return formattedClient;
  }
}

// =====================================================
// HEALTH
// =====================================================

app.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "KUSAI MAX API Р РЋР вЂљР  Р’В°Р  Р’В±Р  РЎвЂўР РЋРІР‚С™Р  Р’В°Р  Р’ВµР РЋРІР‚С™",
    serverTime: new Date().toISOString(),
  });
});

app.get("/api", (req, res) => {
  return res.json({
    success: true,
    message: "KUSAI MAX API Р РЋР вЂљР  Р’В°Р  Р’В±Р  РЎвЂўР РЋРІР‚С™Р  Р’В°Р  Р’ВµР РЋРІР‚С™",
  });
});

app.get("/api/health", async (req, res) => {
  try {
    await pgQuery("SELECT NOW()");

    return res.json({
      success: true,
      message: "KUSAI MAX API Р  РЎвЂ”Р  РЎвЂўР  РўвЂР  РЎвЂќР  Р’В»Р РЋР вЂ№Р РЋРІР‚РЋР  Р’ВµР  Р вЂ¦",
      database: "PostgreSQL Р  РЎвЂ”Р  РЎвЂўР  РўвЂР  РЎвЂќР  Р’В»Р РЋР вЂ№Р РЋРІР‚РЋР  Р’ВµР  Р вЂ¦",
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р  РЎвЂ”Р  РЎвЂўР  РўвЂР  РЎвЂќР  Р’В»Р РЋР вЂ№Р РЋРІР‚РЋР  Р’ВµР  Р вЂ¦Р  РЎвЂР РЋР РЏ Р  РЎвЂќ PostgreSQL",
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
        message: "Р  РІР‚в„ўР  Р вЂ Р  Р’ВµР  РўвЂР  РЎвЂР РЋРІР‚С™Р  Р’Вµ Р  Р вЂ¦Р  РЎвЂўР  РЎВР  Р’ВµР РЋР вЂљ Р РЋРІР‚С™Р  Р’ВµР  Р’В»Р  Р’ВµР РЋРІР‚С›Р  РЎвЂўР  Р вЂ¦Р  Р’В°",
      });
    }

    const normalizedPhone = normalizePhone(phone);

    // Р  Р’ВР РЋРІР‚В°Р  Р’ВµР  РЎВ Р РЋР С“Р РЋРЎвЂњР РЋРІР‚В°Р  Р’ВµР РЋР С“Р РЋРІР‚С™Р  Р вЂ Р РЋРЎвЂњР РЋР вЂ№Р РЋРІР‚В°Р  Р’ВµР  РЎвЂ“Р  РЎвЂў Р  РЎвЂќР  Р’В»Р  РЎвЂР  Р’ВµР  Р вЂ¦Р РЋРІР‚С™Р  Р’В°
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
    // /api/auth/login
    // ==========================================

    if (existingResult.rows.length > 0) {

    const client =
      await enrichClientWithOneC(
        existingResult.rows[0]
      );

    return res.status(200).json({
      success: true,
      message: "Р вЂ™РЎвЂ¦Р С•Р Т‘ Р Р†РЎвЂ№Р С—Р С•Р В»Р Р…Р ВµР Р…",
      isNewClient: false,
      client,
    });
  }

    // ==========================================
    // Р  РЎСљР  РЎвЂєР  РІР‚в„ўР  Р’В«Р  РІвЂћСћ Р  РЎв„ўР  РІР‚С”Р  Р’ВР  РІР‚СћР  РЎСљР  РЎС›
    // ==========================================

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Р  РІР‚в„ўР  Р вЂ Р  Р’ВµР  РўвЂР  РЎвЂР РЋРІР‚С™Р  Р’Вµ Р  РЎвЂР  РЎВР РЋР РЏ Р  РўвЂР  Р’В»Р РЋР РЏ Р РЋР вЂљР  Р’ВµР  РЎвЂ“Р  РЎвЂР РЋР С“Р РЋРІР‚С™Р РЋР вЂљР  Р’В°Р РЋРІР‚ Р  РЎвЂР  РЎвЂ",
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

    // Р  РІР‚вЂќР  Р’В°Р  РЎвЂ”Р  РЎвЂР РЋР С“Р РЋРІР‚в„–Р  Р вЂ Р  Р’В°Р  Р’ВµР  РЎВ Р  РЎвЂ”Р РЋР вЂљР  РЎвЂР  Р вЂ Р  Р’ВµР РЋРІР‚С™Р РЋР С“Р РЋРІР‚С™Р  Р вЂ Р  Р’ВµР  Р вЂ¦Р  Р вЂ¦Р РЋРІР‚в„–Р  Р’Вµ Р  Р’В±Р  РЎвЂўР  Р вЂ¦Р РЋРЎвЂњР РЋР С“Р РЋРІР‚в„–
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
          'Р  РЎСџР РЋР вЂљР  РЎвЂР  Р вЂ Р  Р’ВµР РЋРІР‚С™Р РЋР С“Р РЋРІР‚С™Р  Р вЂ Р  Р’ВµР  Р вЂ¦Р  Р вЂ¦Р РЋРІР‚в„–Р  Р’Вµ Р  Р’В±Р  РЎвЂўР  Р вЂ¦Р РЋРЎвЂњР РЋР С“Р РЋРІР‚в„–',
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

    const enrichedClient =
      await enrichClientWithOneC(client);

    console.log(
      "РќРћР’Р«Р™ РљР›РР•РќРў РџРћРЎР›Р• 1РЎ:",
      enrichedClient
    );

    console.log(
      "QR РќРћР’РћР“Рћ РљР›РР•РќРўРђ:",
      enrichedClient.customerQR
    );

    return res.status(201).json({
      success: true,
      message: "Р РµРіРёСЃС‚СЂР°С†РёСЏ СѓСЃРїРµС€РЅРѕ Р·Р°РІРµСЂС€РµРЅР°",
      isNewClient: true,
      client: enrichedClient,
    });

  } catch (error) {
    console.error(
      "CLIENT LOGIN ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р  Р вЂ Р РЋРІР‚В¦Р  РЎвЂўР  РўвЂР  Р’В° Р  РЎвЂР  Р’В»Р  РЎвЂ Р РЋР вЂљР  Р’ВµР  РЎвЂ“Р  РЎвЂР РЋР С“Р РЋРІР‚С™Р РЋР вЂљР  Р’В°Р РЋРІР‚ Р  РЎвЂР  РЎвЂ",
      error: error.message,
    });
  }
});

app.post("/api/admin/setup", async (req, res) => {
  try {
    const { login, password } = req.body || {};

    if (login !== "admin" || !password) {
      return res.status(400).json({
        success: false,
        message: "РќРµРІРµСЂРЅС‹Рµ РґР°РЅРЅС‹Рµ",
      });
    }

    const passwordHash = await bcrypt.hash(
      String(password),
      12
    );

    const result = await pgQuery(
      `
      INSERT INTO admin_users (
        id,
        login,
        password_hash,
        name,
        role
      )
      VALUES (
        gen_random_uuid(),
        $1,
        $2,
        'Administrator',
        'admin'
      )
      ON CONFLICT (login)
      DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        updated_at = NOW()
      RETURNING id, login, name, role
      `,
      ["admin", passwordHash]
    );

    return res.json({
      success: true,
      admin: result.rows[0],
    });
  } catch (error) {
    console.error("ADMIN SETUP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°",
    });
  }
});

// =====================================================
// ADMIN LOGIN
// FIREBASE
// =====================================================

app.post("/api/admin/login", async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({
        success: false,
        message: "Р’РІРµРґРёС‚Рµ Р»РѕРіРёРЅ Рё РїР°СЂРѕР»СЊ",
      });
    }

    const adminLogin = String(login).trim();

    if (adminLogin !== "admin") {
      return res.status(401).json({
        success: false,
        message: "РќРµРІРµСЂРЅС‹Р№ Р»РѕРіРёРЅ РёР»Рё РїР°СЂРѕР»СЊ",
      });
    }

    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || password !== adminPassword) {
      return res.status(401).json({
        success: false,
        message: "РќРµРІРµСЂРЅС‹Р№ Р»РѕРіРёРЅ РёР»Рё РїР°СЂРѕР»СЊ",
      });
    }

    return res.json({
      success: true,
      admin: {
        login: "admin",
        name: "РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ",
        role: "admin",
      },
    });
  } catch (error) {
    console.error("ADMIN LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "РћС€РёР±РєР° РІС…РѕРґР°",
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
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р  Р’В·Р  Р’В°Р  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  Р’В·Р  РЎвЂќР  РЎвЂ Р  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”",
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
            "Р  РІР‚СљР РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р  Р’В° Р  Р вЂ¦Р  Р’Вµ Р  Р вЂ¦Р  Р’В°Р  РІвЂћвЂ“Р  РўвЂР  Р’ВµР  Р вЂ¦Р  Р’В°",
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
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р  РЎвЂ”Р  РЎвЂўР  Р’В»Р РЋРЎвЂњР РЋРІР‚РЋР  Р’ВµР  Р вЂ¦Р  РЎвЂР РЋР РЏ Р  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р РЋРІР‚в„–",
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
            "Р  РІР‚в„ўР  Р вЂ Р  Р’ВµР  РўвЂР  РЎвЂР РЋРІР‚С™Р  Р’Вµ Р  Р вЂ¦Р  Р’В°Р  Р’В·Р  Р вЂ Р  Р’В°Р  Р вЂ¦Р  РЎвЂР  Р’Вµ Р  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р РЋРІР‚в„–",
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
            "Р  РЎС›Р  Р’В°Р  РЎвЂќР  Р’В°Р РЋР РЏ Р  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р  Р’В° Р РЋРЎвЂњР  Р’В¶Р  Р’Вµ Р РЋР С“Р РЋРЎвЂњР РЋРІР‚В°Р  Р’ВµР РЋР С“Р РЋРІР‚С™Р  Р вЂ Р РЋРЎвЂњР  Р’ВµР РЋРІР‚С™",
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
          "Р  РІР‚СљР РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р  Р’В° Р РЋР С“Р  РЎвЂўР  Р’В·Р  РўвЂР  Р’В°Р  Р вЂ¦Р  Р’В°",

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
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р РЋР С“Р  РЎвЂўР  Р’В·Р  РўвЂР  Р’В°Р  Р вЂ¦Р  РЎвЂР РЋР РЏ Р  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р РЋРІР‚в„–",
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
            "Р  РІР‚СљР РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р  Р’В° Р  Р вЂ¦Р  Р’Вµ Р  Р вЂ¦Р  Р’В°Р  РІвЂћвЂ“Р  РўвЂР  Р’ВµР  Р вЂ¦Р  Р’В°",
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
            "Р  РІР‚в„ўР  Р вЂ Р  Р’ВµР  РўвЂР  РЎвЂР РЋРІР‚С™Р  Р’Вµ Р  Р вЂ¦Р  Р’В°Р  Р’В·Р  Р вЂ Р  Р’В°Р  Р вЂ¦Р  РЎвЂР  Р’Вµ Р  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р РЋРІР‚в„–",
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
          "Р  РІР‚СљР РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р  Р’В° Р  РЎвЂўР  Р’В±Р  Р вЂ¦Р  РЎвЂўР  Р вЂ Р  Р’В»Р  Р’ВµР  Р вЂ¦Р  Р’В°",

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
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р  РЎвЂўР  Р’В±Р  Р вЂ¦Р  РЎвЂўР  Р вЂ Р  Р’В»Р  Р’ВµР  Р вЂ¦Р  РЎвЂР РЋР РЏ Р  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р РЋРІР‚в„–",
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
            "Р  РІР‚СљР РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р  Р’В° Р  Р вЂ¦Р  Р’Вµ Р  Р вЂ¦Р  Р’В°Р  РІвЂћвЂ“Р  РўвЂР  Р’ВµР  Р вЂ¦Р  Р’В°",
        });
      }

      return res.json({
        success: true,
        message:
          "Р  РІР‚СљР РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р  Р’В° Р РЋРЎвЂњР  РўвЂР  Р’В°Р  Р’В»Р  Р’ВµР  Р вЂ¦Р  Р’В°",
      });

    } catch (error) {
      console.error(
        "DELETE PRODUCT GROUP ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р РЋРЎвЂњР  РўвЂР  Р’В°Р  Р’В»Р  Р’ВµР  Р вЂ¦Р  РЎвЂР РЋР РЏ Р  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р РЋРІР‚в„–",
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
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р  Р’В·Р  Р’В°Р  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  Р’В·Р  РЎвЂќР  РЎвЂ Р  РЎвЂ”Р  РЎвЂўР  РўвЂР  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”",
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
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р  Р’В·Р  Р’В°Р  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  Р’В·Р  РЎвЂќР  РЎвЂ Р  РЎвЂ”Р  РЎвЂўР  РўвЂР  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”",
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
            "Р  РЎСџР  РЎвЂўР  РўвЂР  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р  Р’В° Р  Р вЂ¦Р  Р’Вµ Р  Р вЂ¦Р  Р’В°Р  РІвЂћвЂ“Р  РўвЂР  Р’ВµР  Р вЂ¦Р  Р’В°",
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
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р  РЎвЂ”Р  РЎвЂўР  Р’В»Р РЋРЎвЂњР РЋРІР‚РЋР  Р’ВµР  Р вЂ¦Р  РЎвЂР РЋР РЏ Р  РЎвЂ”Р  РЎвЂўР  РўвЂР  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р РЋРІР‚в„–",
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
            "Р  РІР‚в„ўР  Р вЂ Р  Р’ВµР  РўвЂР  РЎвЂР РЋРІР‚С™Р  Р’Вµ Р  Р вЂ¦Р  Р’В°Р  Р’В·Р  Р вЂ Р  Р’В°Р  Р вЂ¦Р  РЎвЂР  Р’Вµ Р  РЎвЂ”Р  РЎвЂўР  РўвЂР  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р РЋРІР‚в„–",
        });
      }

      // Р  РЎСџР РЋР вЂљР  РЎвЂўР  Р вЂ Р  Р’ВµР РЋР вЂљР РЋР РЏР  Р’ВµР  РЎВ Р  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р РЋРЎвЂњ

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
            "Р  РІР‚СљР РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р  Р’В° Р  Р вЂ¦Р  Р’Вµ Р  Р вЂ¦Р  Р’В°Р  РІвЂћвЂ“Р  РўвЂР  Р’ВµР  Р вЂ¦Р  Р’В°",
        });
      }

      const subgroupName =
        String(name).trim();

      // Р  РЎСџР РЋР вЂљР  РЎвЂўР  Р вЂ Р  Р’ВµР РЋР вЂљР РЋР РЏР  Р’ВµР  РЎВ Р  РўвЂР РЋРЎвЂњР  Р’В±Р  Р’В»Р  РЎвЂР  РЎвЂќР  Р’В°Р РЋРІР‚С™

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
            "Р  РЎС›Р  Р’В°Р  РЎвЂќР  Р’В°Р РЋР РЏ Р  РЎвЂ”Р  РЎвЂўР  РўвЂР  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р  Р’В° Р РЋРЎвЂњР  Р’В¶Р  Р’Вµ Р РЋР С“Р РЋРЎвЂњР РЋРІР‚В°Р  Р’ВµР РЋР С“Р РЋРІР‚С™Р  Р вЂ Р РЋРЎвЂњР  Р’ВµР РЋРІР‚С™",
        });
      }

      // Р  Р Р‹Р  РЎвЂўР  Р’В·Р  РўвЂР  Р’В°Р РЋРІР‚ВР  РЎВ Р  РЎвЂ”Р  РЎвЂўР  РўвЂР  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р РЋРЎвЂњ

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
          "Р  РЎСџР  РЎвЂўР  РўвЂР  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р  Р’В° Р РЋРЎвЂњР РЋР С“Р  РЎвЂ”Р  Р’ВµР РЋРІвЂљВ¬Р  Р вЂ¦Р  РЎвЂў Р РЋР С“Р  РЎвЂўР  Р’В·Р  РўвЂР  Р’В°Р  Р вЂ¦Р  Р’В°",

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
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р РЋР С“Р  РЎвЂўР  Р’В·Р  РўвЂР  Р’В°Р  Р вЂ¦Р  РЎвЂР РЋР РЏ Р  РЎвЂ”Р  РЎвЂўР  РўвЂР  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р РЋРІР‚в„–",
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
            "Р  РЎСџР  РЎвЂўР  РўвЂР  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р  Р’В° Р  Р вЂ¦Р  Р’Вµ Р  Р вЂ¦Р  Р’В°Р  РІвЂћвЂ“Р  РўвЂР  Р’ВµР  Р вЂ¦Р  Р’В°",
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
            "Р  РІР‚в„ўР  Р вЂ Р  Р’ВµР  РўвЂР  РЎвЂР РЋРІР‚С™Р  Р’Вµ Р  Р вЂ¦Р  Р’В°Р  Р’В·Р  Р вЂ Р  Р’В°Р  Р вЂ¦Р  РЎвЂР  Р’Вµ Р  РЎвЂ”Р  РЎвЂўР  РўвЂР  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р РЋРІР‚в„–",
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
          "Р  РЎСџР  РЎвЂўР  РўвЂР  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р  Р’В° Р  РЎвЂўР  Р’В±Р  Р вЂ¦Р  РЎвЂўР  Р вЂ Р  Р’В»Р  Р’ВµР  Р вЂ¦Р  Р’В°",

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
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р  РЎвЂўР  Р’В±Р  Р вЂ¦Р  РЎвЂўР  Р вЂ Р  Р’В»Р  Р’ВµР  Р вЂ¦Р  РЎвЂР РЋР РЏ Р  РЎвЂ”Р  РЎвЂўР  РўвЂР  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р РЋРІР‚в„–",
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

      // Р  Р Р‹Р  Р вЂ¦Р  Р’В°Р РЋРІР‚РЋР  Р’В°Р  Р’В»Р  Р’В° Р  РЎвЂўР РЋРІР‚С™Р  Р вЂ Р РЋР РЏР  Р’В·Р РЋРІР‚в„–Р  Р вЂ Р  Р’В°Р  Р’ВµР  РЎВ Р РЋРІР‚С™Р  РЎвЂўР  Р вЂ Р  Р’В°Р РЋР вЂљР РЋРІР‚в„–

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
            "Р  РЎСџР  РЎвЂўР  РўвЂР  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р  Р’В° Р  Р вЂ¦Р  Р’Вµ Р  Р вЂ¦Р  Р’В°Р  РІвЂћвЂ“Р  РўвЂР  Р’ВµР  Р вЂ¦Р  Р’В°",
        });
      }

      return res.json({
        success: true,
        message:
          "Р  РЎСџР  РЎвЂўР  РўвЂР  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р  Р’В° Р РЋРЎвЂњР  РўвЂР  Р’В°Р  Р’В»Р  Р’ВµР  Р вЂ¦Р  Р’В°",
      });

    } catch (error) {
      console.error(
        "DELETE SUBGROUP ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р РЋРЎвЂњР  РўвЂР  Р’В°Р  Р’В»Р  Р’ВµР  Р вЂ¦Р  РЎвЂР РЋР РЏ Р  РЎвЂ”Р  РЎвЂўР  РўвЂР  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р РЋРІР‚в„–",
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
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р  Р’В·Р  Р’В°Р  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  Р’В·Р  РЎвЂќР  РЎвЂ Р  РЎвЂќР  Р’В°Р РЋРІР‚С™Р  Р’ВµР  РЎвЂ“Р  РЎвЂўР РЋР вЂљР  РЎвЂР  РІвЂћвЂ“",
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
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р  РЎвЂ”Р  РЎвЂўР  Р’В»Р РЋРЎвЂњР РЋРІР‚РЋР  Р’ВµР  Р вЂ¦Р  РЎвЂР РЋР РЏ Р  РЎвЂќР  Р’В»Р  РЎвЂР  Р’ВµР  Р вЂ¦Р РЋРІР‚С™Р  РЎвЂўР  Р вЂ ",
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
            "Р  РЎв„ўР  Р’В»Р  РЎвЂР  Р’ВµР  Р вЂ¦Р РЋРІР‚С™ Р  Р вЂ¦Р  Р’Вµ Р  Р вЂ¦Р  Р’В°Р  РІвЂћвЂ“Р  РўвЂР  Р’ВµР  Р вЂ¦",
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
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р  РЎвЂ”Р  РЎвЂўР  Р’В»Р РЋРЎвЂњР РЋРІР‚РЋР  Р’ВµР  Р вЂ¦Р  РЎвЂР РЋР РЏ Р  РЎвЂќР  Р’В»Р  РЎвЂР  Р’ВµР  Р вЂ¦Р РЋРІР‚С™Р  Р’В°",
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
            "Р  РІР‚в„ўР  Р вЂ Р  Р’ВµР  РўвЂР  РЎвЂР РЋРІР‚С™Р  Р’Вµ Р  РЎвЂР  РЎВР РЋР РЏ",
        });
      }

      if (!phone) {
        return res.status(400).json({
          success: false,
          message:
            "Р  РІР‚в„ўР  Р вЂ Р  Р’ВµР  РўвЂР  РЎвЂР РЋРІР‚С™Р  Р’Вµ Р РЋРІР‚С™Р  Р’ВµР  Р’В»Р  Р’ВµР РЋРІР‚С›Р  РЎвЂўР  Р вЂ¦",
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
            "Р  РЎв„ўР  Р’В»Р  РЎвЂР  Р’ВµР  Р вЂ¦Р РЋРІР‚С™ Р РЋР С“ Р РЋРІР‚С™Р  Р’В°Р  РЎвЂќР  РЎвЂР  РЎВ Р  Р вЂ¦Р  РЎвЂўР  РЎВР  Р’ВµР РЋР вЂљР  РЎвЂўР  РЎВ Р РЋРЎвЂњР  Р’В¶Р  Р’Вµ Р РЋР С“Р РЋРЎвЂњР РЋРІР‚В°Р  Р’ВµР РЋР С“Р РЋРІР‚С™Р  Р вЂ Р РЋРЎвЂњР  Р’ВµР РЋРІР‚С™",
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
          "Р  РЎСџР РЋР вЂљР  РЎвЂР  Р вЂ Р  Р’ВµР РЋРІР‚С™Р РЋР С“Р РЋРІР‚С™Р  Р вЂ Р  Р’ВµР  Р вЂ¦Р  Р вЂ¦Р РЋРІР‚в„–Р  Р’Вµ Р  Р’В±Р  РЎвЂўР  Р вЂ¦Р РЋРЎвЂњР РЋР С“Р РЋРІР‚в„–",
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
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р РЋР С“Р  РЎвЂўР  Р’В·Р  РўвЂР  Р’В°Р  Р вЂ¦Р  РЎвЂР РЋР РЏ Р  РЎвЂќР  Р’В»Р  РЎвЂР  Р’ВµР  Р вЂ¦Р РЋРІР‚С™Р  Р’В°",
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
            row.reason || "Р  РЎвЂєР  РЎвЂ”Р  Р’ВµР РЋР вЂљР  Р’В°Р РЋРІР‚ Р  РЎвЂР РЋР РЏ",

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
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р  Р’В·Р  Р’В°Р  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  Р’В·Р  РЎвЂќР  РЎвЂ Р  РЎвЂР РЋР С“Р РЋРІР‚С™Р  РЎвЂўР РЋР вЂљР  РЎвЂР  РЎвЂ Р  РЎвЂўР  РЎвЂ”Р  Р’ВµР РЋР вЂљР  Р’В°Р РЋРІР‚ Р  РЎвЂР  РІвЂћвЂ“",

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
            "Р  РЎСљР  Р’ВµР  РЎвЂќР  РЎвЂўР РЋР вЂљР РЋР вЂљР  Р’ВµР  РЎвЂќР РЋРІР‚С™Р  Р вЂ¦Р  РЎвЂўР  Р’Вµ Р  РЎвЂќР  РЎвЂўР  Р’В»Р  РЎвЂР РЋРІР‚РЋР  Р’ВµР РЋР С“Р РЋРІР‚С™Р  Р вЂ Р  РЎвЂў Р  Р’В±Р  РЎвЂўР  Р вЂ¦Р РЋРЎвЂњР РЋР С“Р  РЎвЂўР  Р вЂ ",
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
            "Р  РЎв„ўР  Р’В»Р  РЎвЂР  Р’ВµР  Р вЂ¦Р РЋРІР‚С™ Р  Р вЂ¦Р  Р’Вµ Р  Р вЂ¦Р  Р’В°Р  РІвЂћвЂ“Р  РўвЂР  Р’ВµР  Р вЂ¦",
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
            "Р  РЎСљР  Р’В°Р РЋРІР‚РЋР  РЎвЂР РЋР С“Р  Р’В»Р  Р’ВµР  Р вЂ¦Р  РЎвЂР  Р’Вµ Р  Р’В±Р  РЎвЂўР  Р вЂ¦Р РЋРЎвЂњР РЋР С“Р  РЎвЂўР  Р вЂ ",
        ]
      );

      return res.json({
        success: true,
        message:
          "Р  РІР‚ВР  РЎвЂўР  Р вЂ¦Р РЋРЎвЂњР РЋР С“Р РЋРІР‚в„– Р  Р вЂ¦Р  Р’В°Р РЋРІР‚РЋР  РЎвЂР РЋР С“Р  Р’В»Р  Р’ВµР  Р вЂ¦Р РЋРІР‚в„–",

        points:
          newPoints,

        bonuses:
          newBonuses,
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р  Р вЂ¦Р  Р’В°Р РЋРІР‚РЋР  РЎвЂР РЋР С“Р  Р’В»Р  Р’ВµР  Р вЂ¦Р  РЎвЂР РЋР РЏ Р  Р’В±Р  РЎвЂўР  Р вЂ¦Р РЋРЎвЂњР РЋР С“Р  РЎвЂўР  Р вЂ ",
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
            "Р  РЎв„ўР  Р’В»Р  РЎвЂР  Р’ВµР  Р вЂ¦Р РЋРІР‚С™ Р  Р вЂ¦Р  Р’Вµ Р  Р вЂ¦Р  Р’В°Р  РІвЂћвЂ“Р  РўвЂР  Р’ВµР  Р вЂ¦",
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
            "Р  РЎСљР  Р’ВµР  РўвЂР  РЎвЂўР РЋР С“Р РЋРІР‚С™Р  Р’В°Р РЋРІР‚С™Р  РЎвЂўР РЋРІР‚РЋР  Р вЂ¦Р  РЎвЂў Р  Р’В±Р  РЎвЂўР  Р вЂ¦Р РЋРЎвЂњР РЋР С“Р  РЎвЂўР  Р вЂ ",
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
            "Р  Р Р‹Р  РЎвЂ”Р  РЎвЂР РЋР С“Р  Р’В°Р  Р вЂ¦Р  РЎвЂР  Р’Вµ Р  Р’В±Р  РЎвЂўР  Р вЂ¦Р РЋРЎвЂњР РЋР С“Р  РЎвЂўР  Р вЂ ",
        ]
      );

      return res.json({
        success: true,
        message:
          "Р  РІР‚ВР  РЎвЂўР  Р вЂ¦Р РЋРЎвЂњР РЋР С“Р РЋРІР‚в„– Р РЋР С“Р  РЎвЂ”Р  РЎвЂР РЋР С“Р  Р’В°Р  Р вЂ¦Р РЋРІР‚в„–",

        points:
          newPoints,

        bonuses:
          newBonuses,
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р РЋР С“Р  РЎвЂ”Р  РЎвЂР РЋР С“Р  Р’В°Р  Р вЂ¦Р  РЎвЂР РЋР РЏ Р  Р’В±Р  РЎвЂўР  Р вЂ¦Р РЋРЎвЂњР РЋР С“Р  РЎвЂўР  Р вЂ ",
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
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р РЋР вЂљР  Р’В°Р РЋР С“Р РЋРІР‚РЋР РЋРІР‚ВР РЋРІР‚С™Р  Р’В° Р  Р’В±Р  РЎвЂўР  Р вЂ¦Р РЋРЎвЂњР РЋР С“Р  РЎвЂўР  Р вЂ ",
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
        "KUSAI MAX API Р  РЎвЂ”Р  РЎвЂўР  РўвЂР  РЎвЂќР  Р’В»Р РЋР вЂ№Р РЋРІР‚РЋР  Р’ВµР  Р вЂ¦",

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
            "Р  РЎСљР  Р’Вµ Р РЋРЎвЂњР  РЎвЂќР  Р’В°Р  Р’В·Р  Р’В°Р  Р вЂ¦ Р РЋРІР‚С™Р  Р’ВµР  Р’В»Р  Р’ВµР РЋРІР‚С›Р  РЎвЂўР  Р вЂ¦",
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
            "Р  РЎв„ўР  Р’В»Р  РЎвЂР  Р’ВµР  Р вЂ¦Р РЋРІР‚С™ Р  Р вЂ¦Р  Р’Вµ Р  Р вЂ¦Р  Р’В°Р  РІвЂћвЂ“Р  РўвЂР  Р’ВµР  Р вЂ¦",
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
        "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р  РЎвЂ”Р  РЎвЂўР  РЎвЂР РЋР С“Р  РЎвЂќР  Р’В° Р  РЎвЂќР  Р’В»Р  РЎвЂР  Р’ВµР  Р вЂ¦Р РЋРІР‚С™Р  Р’В°:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р  РЎвЂ”Р  РЎвЂўР  РЎвЂР РЋР С“Р  РЎвЂќР  Р’В° Р  РЎвЂќР  Р’В»Р  РЎвЂР  Р’ВµР  Р вЂ¦Р РЋРІР‚С™Р  Р’В°",

        error:
          error?.message ||
          String(error),
      });
    }
  }
);

// ==========================================
// РЎРРќРҐР РћРќРР—РђР¦РРЇ Р’РЎР•РҐ РўРћР’РђР РћР’ РР— РњРћР™РЎРљР›РђР” Р’ POSTGRESQL
// ==========================================

app.post(
  "/api/moysklad/sync",
  async (req, res) => {
    try {
      console.log("");
      console.log("======================================");
      console.log("MOYSKLAD в†’ POSTGRES: РЎРРќРҐР РћРќРР—РђР¦РРЇ Р’РЎР•РҐ РўРћР’РђР РћР’");
      console.log("======================================");

      const products = await getProducts();

      let created = 0;
      let updated = 0;

      for (const product of products) {
        try {
          const existing = await pgQuery(
            `
            SELECT id
            FROM products
            WHERE id = $1
            LIMIT 1
            `,
            [product.id]
          );

          const images = JSON.stringify(
            Array.isArray(product.images)
              ? product.images
              : []
          );

          if (existing.rows.length > 0) {
            await pgQuery(
              `
              UPDATE products
              SET
                title = $2,
                name = $3,
                price = $4,
                images = $5,
                description = $6,
                article = $7,
                code = $8,
                external_code = $9,
                barcode = $10,
                archived = $11,
                buy_price = $12,
                updated_at = NOW(),
                synced_at = NOW()
              WHERE id = $1
              `,
              [
                product.id,
                product.name || "",
                product.name || "",
                Number(product.price) || 0,
                images,
                product.description || "",
                product.article || "",
                product.code || "",
                product.externalCode || "",
                product.barcode || "",
                Boolean(product.archived),
                product.buyPrice != null
                  ? Number(product.buyPrice)
                  : null,
              ]
            );

            updated++;

            console.log(
              `UPDATED: ${product.name} вЂ” ${product.images?.length || 0} С„РѕС‚Рѕ`
            );
          } else {
            await pgQuery(
              `
              INSERT INTO products (
                id,
                title,
                name,
                price,
                images,
                description,
                article,
                code,
                external_code,
                barcode,
                archived,
                buy_price,
                updated_at,
                synced_at
              )
              VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,
                $9,$10,$11,$12,NOW(),NOW()
              )
              `,
              [
                product.id,
                product.name || "",
                product.name || "",
                Number(product.price) || 0,
                images,
                product.description || "",
                product.article || "",
                product.code || "",
                product.externalCode || "",
                product.barcode || "",
                Boolean(product.archived),
                product.buyPrice != null
                  ? Number(product.buyPrice)
                  : null,
              ]
            );

            created++;

            console.log(
              `CREATED: ${product.name} вЂ” ${product.images?.length || 0} С„РѕС‚Рѕ`
            );
          }
        } catch (productError) {
          console.error(
            `РћС€РёР±РєР° С‚РѕРІР°СЂР° ${product?.name || product?.id}:`,
            productError?.message || productError
          );
        }
      }

      console.log("======================================");
      console.log(
        `РЎРРќРҐР РћРќРР—РђР¦РРЇ Р—РђР’Р•Р РЁР•РќРђ: СЃРѕР·РґР°РЅРѕ ${created}, РѕР±РЅРѕРІР»РµРЅРѕ ${updated}`
      );
      console.log("======================================");

      return res.json({
        success: true,
        count: products.length,
        created,
        updated,
      });
    } catch (error) {
      console.error("РћРЁРР‘РљРђ РџРћР›РќРћР™ РЎРРќРҐР РћРќРР—РђР¦РР:", error);

      return res.status(500).json({
        success: false,
        message: "РћС€РёР±РєР° СЃРёРЅС…СЂРѕРЅРёР·Р°С†РёРё С‚РѕРІР°СЂРѕРІ",
        error: error?.message || String(error),
      });
    }
  }
);

// =====================================================
// РЎРРќРҐР РћРќРР—РђР¦РРЇ AIRPODS РР— РњРћР™РЎРљР›РђР” Р’ POSTGRESQL
// =====================================================

app.post(
  "/api/moysklad/sync-airpods",
  async (req, res) => {
    try {
      console.log("");
      console.log("======================================");
      console.log("MOYSKLAD в†’ POSTGRES: РЎРРќРҐР РћРќРР—РђР¦РРЇ AIRPODS");
      console.log("======================================");

      const products = await getAirPods();

      let created = 0;
      let updated = 0;

      for (const product of products) {
        const existing = await pgQuery(
          `
          SELECT id
          FROM products
          WHERE id = $1
          LIMIT 1
          `,
          [product.id]
        );

        if (existing.rows.length > 0) {
          await pgQuery(
            `
            UPDATE products
            SET
              title = $2,
              name = $3,
              price = $4,
              images = $5,
              description = $6,
              article = $7,
              code = $8,
              external_code = $9,
              barcode = $10,
              archived = $11,
              buy_price = $12,
              updated_at = NOW(),
              synced_at = NOW()
            WHERE id = $1
            `,
            [
              product.id,
              product.name || "",
              product.name || "",
              Number(product.price) || 0,
              JSON.stringify(
                Array.isArray(product.images)
                  ? product.images
                  : []
              ),
              product.description || "",
              product.article || "",
              product.code || "",
              product.externalCode || "",
              product.barcode || "",
              Boolean(product.archived),
              product.buyPrice != null
                ? Number(product.buyPrice)
                : null,
            ]
          );

          updated++;

          console.log(
            `UPDATED: ${product.name} вЂ” ${product.images?.length || 0} С„РѕС‚Рѕ`
          );
        } else {
          await pgQuery(
            `
            INSERT INTO products (
              id,
              title,
              name,
              price,
              images,
              description,
              article,
              code,
              external_code,
              barcode,
              archived,
              buy_price,
              updated_at,
              synced_at
            )
            VALUES (
              $1,$2,$3,$4,$5,$6,$7,$8,
              $9,$10,$11,$12,NOW(),NOW()
            )
            `,
            [
              product.id,
              product.name || "",
              product.name || "",
              Number(product.price) || 0,
              JSON.stringify(
                Array.isArray(product.images)
                  ? product.images
                  : []
              ),
              product.description || "",
              product.article || "",
              product.code || "",
              product.externalCode || "",
              product.barcode || "",
              Boolean(product.archived),
              product.buyPrice != null
                ? Number(product.buyPrice)
                : null,
            ]
          );

          created++;

          console.log(
            `CREATED: ${product.name} вЂ” ${product.images?.length || 0} С„РѕС‚Рѕ`
          );
        }
      }

      console.log("======================================");
      console.log(
        `РЎРРќРҐР РћРќРР—РђР¦РРЇ Р—РђР’Р•Р РЁР•РќРђ: СЃРѕР·РґР°РЅРѕ ${created}, РѕР±РЅРѕРІР»РµРЅРѕ ${updated}`
      );
      console.log("======================================");

      return res.json({
        success: true,
        count: products.length,
        created,
        updated,
      });

    } catch (error) {
      console.error(
        "MOYSKLAD SYNC AIRPODS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "РћС€РёР±РєР° СЃРёРЅС…СЂРѕРЅРёР·Р°С†РёРё AirPods",
        error: error.message,
      });
    }
  }
);

// =====================================================
// PRODUCTS
// =====================================================

// =====================================================
// GET ALL PRODUCTS
// Р  РІР‚в„ўР  РЎвЂ™Р  РІР‚вЂњР  РЎСљР  РЎвЂє:
// Р  РЎС›Р  РЎвЂєР  РІР‚в„ўР  РЎвЂ™Р   Р  Р’В« Р  РЎСљР  РІР‚Сћ Р  Р’В¤Р  Р’ВР  РІР‚С”Р  Р’В¬Р  РЎС›Р   Р  Р в‚¬Р  Р’В®Р  РЎС›Р  Р Р‹Р  Р вЂЎ Р  РЎСџР  РЎвЂє Р  РІР‚СљР   Р  Р в‚¬Р  РЎСџР  РЎСџР  РІР‚Сћ Р  Р’ВР  РІР‚С”Р  Р’В Р  РЎСџР  РЎвЂєР  РІР‚СњР  РІР‚СљР   Р  Р в‚¬Р  РЎСџР  РЎСџР  РІР‚Сћ
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

      // Р  РЎСџР  РЎвЂў Р РЋРЎвЂњР  РЎВР  РЎвЂўР  Р’В»Р РЋРІР‚РЋР  Р’В°Р  Р вЂ¦Р  РЎвЂР РЋР вЂ№ Р  Р вЂ¦Р  Р’Вµ Р  РЎвЂ”Р  РЎвЂўР  РЎвЂќР  Р’В°Р  Р’В·Р РЋРІР‚в„–Р  Р вЂ Р  Р’В°Р  Р’ВµР  РЎВ Р  Р’В°Р РЋР вЂљР РЋРІР‚В¦Р  РЎвЂР  Р вЂ 

      if (includeArchived !== "true") {
        sql += `
          AND p.archived IS NOT TRUE
        `;
      }

      // hidden Р РЋРІР‚С™Р  РЎвЂўР  Р вЂ Р  Р’В°Р РЋР вЂљР РЋРІР‚в„– Р  РЎвЂ”Р  РЎвЂўР  РЎвЂќР  Р’В°Р  Р’В·Р РЋРІР‚в„–Р  Р вЂ Р  Р’В°Р  Р’ВµР  РЎВ Р  Р вЂ  Р  Р’В°Р  РўвЂР  РЎВР  РЎвЂР  Р вЂ¦Р  РЎвЂќР  Р’Вµ,
      // Р  Р’ВµР РЋР С“Р  Р’В»Р  РЎвЂ includeHidden=true

      if (includeHidden !== "true") {
        sql += `
          AND p.hidden IS NOT TRUE
        `;
      }

      // Р  Р’В¤Р  РЎвЂР  Р’В»Р РЋР Р‰Р РЋРІР‚С™Р РЋР вЂљ Р  РЎвЂ”Р  РЎвЂў Р  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р  Р’Вµ

      if (groupId) {
        values.push(groupId);

        sql += `
          AND p.group_id = $${values.length}
        `;
      }

      // Р  Р’В¤Р  РЎвЂР  Р’В»Р РЋР Р‰Р РЋРІР‚С™Р РЋР вЂљ Р  РЎвЂ”Р  РЎвЂў Р  РЎвЂ”Р  РЎвЂўР  РўвЂР  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р  Р’Вµ

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

          // Р  РЎвЂєР РЋР С“Р  Р вЂ¦Р  РЎвЂўР  Р вЂ Р  Р вЂ¦Р  РЎвЂўР  Р’Вµ

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

          // Р  Р’ВР  Р’В·Р  РЎвЂўР  Р’В±Р РЋР вЂљР  Р’В°Р  Р’В¶Р  Р’ВµР  Р вЂ¦Р  РЎвЂР РЋР РЏ

          images:
            Array.isArray(item.images)
              ? item.images
              : [],

          // =================================================
          // Р  РІР‚СљР   Р  Р в‚¬Р  РЎСџР  РЎСџР  РЎвЂ™
          // =================================================

          groupId:
            item.group_id ||
            null,

          groupName:
            item.group_name ||
            "",

          // =================================================
          // Р  РЎСџР  РЎвЂєР  РІР‚СњР  РІР‚СљР   Р  Р в‚¬Р  РЎСџР  РЎСџР  РЎвЂ™
          // =================================================

          subgroupId:
            item.subgroup_id ||
            null,

          subgroupName:
            item.subgroup_name ||
            "",

          // Р  Р Р‹Р РЋРІР‚С™Р  Р’В°Р РЋР вЂљР РЋРІР‚в„–Р  Р’Вµ Р  РЎвЂќР  Р’В°Р РЋРІР‚С™Р  Р’ВµР  РЎвЂ“Р  РЎвЂўР РЋР вЂљР  РЎвЂР  РЎвЂ

          category:
            item.category || "",

          categoryGroup:
            item.category_group || "",

          categoryPath:
            item.category_path || [],

          categoryLeaf:
            item.category_leaf || "",

          // Р  РІР‚СњР  РЎвЂўР  РЎвЂ”Р  РЎвЂўР  Р’В»Р  Р вЂ¦Р  РЎвЂР РЋРІР‚С™Р  Р’ВµР  Р’В»Р РЋР Р‰Р  Р вЂ¦Р  РЎвЂў

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

          // Р  РЎСљР  Р’В°Р  Р’В»Р  РЎвЂР РЋРІР‚РЋР  РЎвЂР  Р’Вµ

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

          // Р  РЎвЂєР  РЎвЂ”Р  РЎвЂР РЋР С“Р  Р’В°Р  Р вЂ¦Р  РЎвЂР  Р’Вµ

          description:
            item.description || "",

          // Р  РўС’Р  Р’В°Р РЋР вЂљР  Р’В°Р  РЎвЂќР РЋРІР‚С™Р  Р’ВµР РЋР вЂљР  РЎвЂР РЋР С“Р РЋРІР‚С™Р  РЎвЂР  РЎвЂќР  РЎвЂ

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

          // Р  РЎвЂ™Р РЋР вЂљР РЋРІР‚С™Р  РЎвЂР  РЎвЂќР РЋРЎвЂњР  Р’В»Р РЋРІР‚в„–

          article:
            item.article || "",

          code:
            item.code || "",

          externalCode:
            item.external_code || "",

          barcode:
            item.barcode || "",

          // Р  Р Р‹Р РЋРІР‚С™Р  Р’В°Р РЋРІР‚С™Р РЋРЎвЂњР РЋР С“Р РЋРІР‚в„–

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
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р  Р’В·Р  Р’В°Р  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  Р’В·Р  РЎвЂќР  РЎвЂ Р РЋРІР‚С™Р  РЎвЂўР  Р вЂ Р  Р’В°Р РЋР вЂљР  РЎвЂўР  Р вЂ ",
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
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р  Р’В·Р  Р’В°Р  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  Р’В·Р  РЎвЂќР  РЎвЂ Р РЋРІР‚С™Р  РЎвЂўР  Р вЂ Р  Р’В°Р РЋР вЂљР  РЎвЂўР  Р вЂ  Р  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р РЋРІР‚в„–",
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
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р  Р’В·Р  Р’В°Р  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  Р’В·Р  РЎвЂќР  РЎвЂ Р РЋРІР‚С™Р  РЎвЂўР  Р вЂ Р  Р’В°Р РЋР вЂљР  РЎвЂўР  Р вЂ  Р  РЎвЂ”Р  РЎвЂўР  РўвЂР  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  РЎвЂ”Р  РЎвЂ”Р РЋРІР‚в„–",
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
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р  РЎвЂ”Р  РЎвЂўР  Р’В»Р РЋРЎвЂњР РЋРІР‚РЋР  Р’ВµР  Р вЂ¦Р  РЎвЂР РЋР РЏ Р РЋРІР‚С™Р  Р’В°Р  Р’В±Р  Р’В»Р  РЎвЂР РЋРІР‚ ",
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
            "Р  Р в‚¬Р  РЎвЂќР  Р’В°Р  Р’В¶Р  РЎвЂР РЋРІР‚С™Р  Р’Вµ table",
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
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р  РЎвЂ”Р  РЎвЂўР  Р’В»Р РЋРЎвЂњР РЋРІР‚РЋР  Р’ВµР  Р вЂ¦Р  РЎвЂР РЋР РЏ Р РЋР С“Р РЋРІР‚С™Р РЋР вЂљР РЋРЎвЂњР  РЎвЂќР РЋРІР‚С™Р РЋРЎвЂњР РЋР вЂљР РЋРІР‚в„– Р РЋРІР‚С™Р  Р’В°Р  Р’В±Р  Р’В»Р  РЎвЂР РЋРІР‚ Р РЋРІР‚в„–",
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
          "Р  РЎв„ўР  РЎвЂўР  Р’В»Р  РЎвЂўР  Р вЂ¦Р  РЎвЂќР  Р’В° group_id Р  РўвЂР  РЎвЂўР  Р’В±Р  Р’В°Р  Р вЂ Р  Р’В»Р  Р’ВµР  Р вЂ¦Р  Р’В°",
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р  РўвЂР  РЎвЂўР  Р’В±Р  Р’В°Р  Р вЂ Р  Р’В»Р  Р’ВµР  Р вЂ¦Р  РЎвЂР РЋР РЏ group_id",
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
          "Р  РЎв„ўР  РЎвЂўР  Р’В»Р  РЎвЂўР  Р вЂ¦Р  РЎвЂќР  Р’В° subgroup_id Р  РўвЂР  РЎвЂўР  Р’В±Р  Р’В°Р  Р вЂ Р  Р’В»Р  Р’ВµР  Р вЂ¦Р  Р’В°",
      });

    } catch (error) {
      console.error(
        "ADD SUBGROUP_ID ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р  РўвЂР  РЎвЂўР  Р’В±Р  Р’В°Р  Р вЂ Р  Р’В»Р  Р’ВµР  Р вЂ¦Р  РЎвЂР РЋР РЏ subgroup_id",
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
            "Р  РЎС›Р  РЎвЂўР  Р вЂ Р  Р’В°Р РЋР вЂљ Р  Р вЂ¦Р  Р’Вµ Р  Р вЂ¦Р  Р’В°Р  РІвЂћвЂ“Р  РўвЂР  Р’ВµР  Р вЂ¦",
        });
      }

      return res.json({
        success: true,
        message:
          "Р  РЎв„ўР  Р’В°Р РЋРІР‚С™Р  Р’ВµР  РЎвЂ“Р  РЎвЂўР РЋР вЂљР  РЎвЂР РЋР РЏ Р РЋРІР‚С™Р  РЎвЂўР  Р вЂ Р  Р’В°Р РЋР вЂљР  Р’В° Р  РЎвЂўР  Р’В±Р  Р вЂ¦Р  РЎвЂўР  Р вЂ Р  Р’В»Р  Р’ВµР  Р вЂ¦Р  Р’В°",

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
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р  РЎвЂўР  Р’В±Р  Р вЂ¦Р  РЎвЂўР  Р вЂ Р  Р’В»Р  Р’ВµР  Р вЂ¦Р  РЎвЂР РЋР РЏ Р  РЎвЂќР  Р’В°Р РЋРІР‚С™Р  Р’ВµР  РЎвЂ“Р  РЎвЂўР РЋР вЂљР  РЎвЂР  РЎвЂ Р РЋРІР‚С™Р  РЎвЂўР  Р вЂ Р  Р’В°Р РЋР вЂљР  Р’В°",
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
        message: "Р  РІР‚в„ўР  Р вЂ Р  Р’ВµР  РўвЂР  РЎвЂР РЋРІР‚С™Р  Р’Вµ Р  Р вЂ¦Р  Р’В°Р  Р’В·Р  Р вЂ Р  Р’В°Р  Р вЂ¦Р  РЎвЂР  Р’Вµ Р РЋРІР‚С™Р  РЎвЂўР  Р вЂ Р  Р’В°Р РЋР вЂљР  Р’В°",
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
      message: "Р  РЎС›Р  РЎвЂўР  Р вЂ Р  Р’В°Р РЋР вЂљ Р РЋР С“Р  РЎвЂўР  Р’В·Р  РўвЂР  Р’В°Р  Р вЂ¦",
      product: result.rows[0],
    });

  } catch (error) {
    console.error("CREATE PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р РЋР С“Р  РЎвЂўР  Р’В·Р  РўвЂР  Р’В°Р  Р вЂ¦Р  РЎвЂР РЋР РЏ Р РЋРІР‚С™Р  РЎвЂўР  Р вЂ Р  Р’В°Р РЋР вЂљР  Р’В°",
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
        message: "Р  РЎС›Р  РЎвЂўР  Р вЂ Р  Р’В°Р РЋР вЂљ Р  Р вЂ¦Р  Р’Вµ Р  Р вЂ¦Р  Р’В°Р  РІвЂћвЂ“Р  РўвЂР  Р’ВµР  Р вЂ¦",
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
      message: "Р  РЎС›Р  РЎвЂўР  Р вЂ Р  Р’В°Р РЋР вЂљ Р РЋРЎвЂњР РЋР С“Р  РЎвЂ”Р  Р’ВµР РЋРІвЂљВ¬Р  Р вЂ¦Р  РЎвЂў Р  РЎвЂўР  Р’В±Р  Р вЂ¦Р  РЎвЂўР  Р вЂ Р  Р’В»Р РЋРІР‚ВР  Р вЂ¦",
      product: result.rows[0],
    });

  } catch (error) {

    console.error("UPDATE PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р РЋР С“Р  РЎвЂўР РЋРІР‚В¦Р РЋР вЂљР  Р’В°Р  Р вЂ¦Р  Р’ВµР  Р вЂ¦Р  РЎвЂР РЋР РЏ Р РЋРІР‚С™Р  РЎвЂўР  Р вЂ Р  Р’В°Р РЋР вЂљР  Р’В°",
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
        message: "Р  РЎС›Р  РЎвЂўР  Р вЂ Р  Р’В°Р РЋР вЂљ Р  Р вЂ¦Р  Р’Вµ Р  Р вЂ¦Р  Р’В°Р  РІвЂћвЂ“Р  РўвЂР  Р’ВµР  Р вЂ¦",
      });
    }

    return res.json({
      success: true,
      message: "Р  РЎС›Р  РЎвЂўР  Р вЂ Р  Р’В°Р РЋР вЂљ Р РЋРЎвЂњР  РўвЂР  Р’В°Р  Р’В»Р РЋРІР‚ВР  Р вЂ¦",
    });

  } catch (error) {

    console.error("DELETE PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р РЋРЎвЂњР  РўвЂР  Р’В°Р  Р’В»Р  Р’ВµР  Р вЂ¦Р  РЎвЂР РЋР РЏ Р РЋРІР‚С™Р  РЎвЂўР  Р вЂ Р  Р’В°Р РЋР вЂљР  Р’В°",
      error: error.message,
    });
  }
});

// =====================================================
// MESSAGES / CONCIERGE
// POSTGRESQL
// =====================================================

await pgQuery(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY,
    login TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT 'Administrator',
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

// Р  Р Р‹Р  РЎвЂўР  Р’В·Р  РўвЂР  Р’В°Р РЋРІР‚ВР  РЎВ Р РЋРІР‚С™Р  Р’В°Р  Р’В±Р  Р’В»Р  РЎвЂР РЋРІР‚ Р РЋРЎвЂњ Р РЋР С“Р  РЎвЂўР  РЎвЂўР  Р’В±Р РЋРІР‚В°Р  Р’ВµР  Р вЂ¦Р  РЎвЂР  РІвЂћвЂ“, Р  Р’ВµР РЋР С“Р  Р’В»Р  РЎвЂ Р  Р’ВµР РЋРІР‚В Р  Р’ВµР РЋРІР‚В°Р РЋРІР‚В Р  Р вЂ¦Р  Р’ВµР РЋРІР‚С™
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

console.log("РЎР‚РЎСџРІР‚в„ўР’В¬ Р  РЎС›Р  Р’В°Р  Р’В±Р  Р’В»Р  РЎвЂР РЋРІР‚ Р  Р’В° messages Р  РЎвЂ“Р  РЎвЂўР РЋРІР‚С™Р  РЎвЂўР  Р вЂ Р  Р’В°");


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
        "Р  РЎСљР  Р’Вµ Р РЋРЎвЂњР  РўвЂР  Р’В°Р  Р’В»Р  РЎвЂўР РЋР С“Р РЋР Р‰ Р  Р’В·Р  Р’В°Р  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  Р’В·Р  РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р РЋР С“Р  РЎвЂўР  РЎвЂўР  Р’В±Р РЋРІР‚В°Р  Р’ВµР  Р вЂ¦Р  РЎвЂР РЋР РЏ",
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

    // Р  РЎСџР РЋР вЂљР  РЎвЂўР  Р вЂ Р  Р’ВµР РЋР вЂљР РЋР РЏР  Р’ВµР  РЎВ Р  РЎвЂ”Р  РЎвЂўР  Р’В»Р РЋР Р‰Р  Р’В·Р  РЎвЂўР  Р вЂ Р  Р’В°Р РЋРІР‚С™Р  Р’ВµР  Р’В»Р РЋР РЏ

    if (!cleanUserLogin) {
      return res.status(400).json({
        success: false,
        message:
          "Р  РЎСљР  Р’Вµ Р РЋРЎвЂњР  РЎвЂќР  Р’В°Р  Р’В·Р  Р’В°Р  Р вЂ¦ Р  РЎвЂ”Р  РЎвЂўР  Р’В»Р РЋР Р‰Р  Р’В·Р  РЎвЂўР  Р вЂ Р  Р’В°Р РЋРІР‚С™Р  Р’ВµР  Р’В»Р РЋР Р‰",
      });
    }

    // Р  РЎСџР РЋР вЂљР  РЎвЂўР  Р вЂ Р  Р’ВµР РЋР вЂљР РЋР РЏР  Р’ВµР  РЎВ Р РЋРІР‚С™Р  Р’ВµР  РЎвЂќР РЋР С“Р РЋРІР‚С™

    if (!cleanText) {
      return res.status(400).json({
        success: false,
        message:
          "Р  РІР‚в„ўР  Р вЂ Р  Р’ВµР  РўвЂР  РЎвЂР РЋРІР‚С™Р  Р’Вµ Р РЋР С“Р  РЎвЂўР  РЎвЂўР  Р’В±Р РЋРІР‚В°Р  Р’ВµР  Р вЂ¦Р  РЎвЂР  Р’Вµ",
      });
    }

    // Р  РЎСџР РЋР вЂљР  РЎвЂўР  Р вЂ Р  Р’ВµР РЋР вЂљР РЋР РЏР  Р’ВµР  РЎВ Р  Р’В°Р  Р вЂ Р РЋРІР‚С™Р  РЎвЂўР РЋР вЂљР  Р’В°

    if (
      author !== "user" &&
      author !== "admin"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Р  РЎСљР  Р’ВµР  РЎвЂќР  РЎвЂўР РЋР вЂљР РЋР вЂљР  Р’ВµР  РЎвЂќР РЋРІР‚С™Р  Р вЂ¦Р РЋРІР‚в„–Р  РІвЂћвЂ“ Р  Р’В°Р  Р вЂ Р РЋРІР‚С™Р  РЎвЂўР РЋР вЂљ Р РЋР С“Р  РЎвЂўР  РЎвЂўР  Р’В±Р РЋРІР‚В°Р  Р’ВµР  Р вЂ¦Р  РЎвЂР РЋР РЏ",
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
      `РЎР‚РЎСџРІР‚в„ўР’В¬ Р  РЎСљР  РЎвЂўР  Р вЂ Р  РЎвЂўР  Р’Вµ Р РЋР С“Р  РЎвЂўР  РЎвЂўР  Р’В±Р РЋРІР‚В°Р  Р’ВµР  Р вЂ¦Р  РЎвЂР  Р’Вµ Р  РЎвЂўР РЋРІР‚С™ ${author}:`,
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
        "Р  РЎСљР  Р’Вµ Р РЋРЎвЂњР  РўвЂР  Р’В°Р  Р’В»Р  РЎвЂўР РЋР С“Р РЋР Р‰ Р  РЎвЂўР РЋРІР‚С™Р  РЎвЂ”Р РЋР вЂљР  Р’В°Р  Р вЂ Р  РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р РЋР С“Р  РЎвЂўР  РЎвЂўР  Р’В±Р РЋРІР‚В°Р  Р’ВµР  Р вЂ¦Р  РЎвЂР  Р’Вµ",
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

      // Р   Р  Р’В°Р  Р’В·Р РЋР вЂљР  Р’ВµР РЋРІвЂљВ¬Р  Р’В°Р  Р’ВµР  РЎВ Р  РЎВР  Р’ВµР  Р вЂ¦Р РЋР РЏР РЋРІР‚С™Р РЋР Р‰ Р РЋРІР‚С™Р  РЎвЂўР  Р’В»Р РЋР Р‰Р  РЎвЂќР  РЎвЂў Р РЋР РЉР РЋРІР‚С™Р  РЎвЂ Р  РЎвЂ”Р  РЎвЂўР  Р’В»Р РЋР РЏ

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
            "Р  РЎСљР  Р’ВµР  РЎвЂќР  РЎвЂўР РЋР вЂљР РЋР вЂљР  Р’ВµР  РЎвЂќР РЋРІР‚С™Р  Р вЂ¦Р  РЎвЂўР  Р’Вµ Р  РЎвЂ”Р  РЎвЂўР  Р’В»Р  Р’Вµ",
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
            "Р  Р Р‹Р  РЎвЂўР  РЎвЂўР  Р’В±Р РЋРІР‚В°Р  Р’ВµР  Р вЂ¦Р  РЎвЂР  Р’Вµ Р  Р вЂ¦Р  Р’Вµ Р  Р вЂ¦Р  Р’В°Р  РІвЂћвЂ“Р  РўвЂР  Р’ВµР  Р вЂ¦Р  РЎвЂў",
        });
      }

      return res.json({
        success: true,
        message:
          "Р  Р Р‹Р  РЎвЂўР  РЎвЂўР  Р’В±Р РЋРІР‚В°Р  Р’ВµР  Р вЂ¦Р  РЎвЂР  Р’Вµ Р  РЎвЂ”Р РЋР вЂљР  РЎвЂўР РЋРІР‚РЋР  РЎвЂР РЋРІР‚С™Р  Р’В°Р  Р вЂ¦Р  РЎвЂў",
      });

    } catch (error) {

      console.error(
        "MARK MESSAGE READ ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Р  РЎСљР  Р’Вµ Р РЋРЎвЂњР  РўвЂР  Р’В°Р  Р’В»Р  РЎвЂўР РЋР С“Р РЋР Р‰ Р  РЎвЂўР  Р’В±Р  Р вЂ¦Р  РЎвЂўР  Р вЂ Р  РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р РЋР С“Р  РЎвЂўР  РЎвЂўР  Р’В±Р РЋРІР‚В°Р  Р’ВµР  Р вЂ¦Р  РЎвЂР  Р’Вµ",
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
            "Р  РЎСљР  Р’Вµ Р РЋРЎвЂњР  РЎвЂќР  Р’В°Р  Р’В·Р  Р’В°Р  Р вЂ¦ Р  РЎвЂ”Р  РЎвЂўР  Р’В»Р РЋР Р‰Р  Р’В·Р  РЎвЂўР  Р вЂ Р  Р’В°Р РЋРІР‚С™Р  Р’ВµР  Р’В»Р РЋР Р‰",
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
        "РЎР‚РЎСџРІР‚вЂќРІР‚В Р  Р’В§Р  Р’В°Р РЋРІР‚С™ Р РЋРЎвЂњР  РўвЂР  Р’В°Р  Р’В»Р РЋРІР‚ВР  Р вЂ¦:",
        userLogin
      );

      return res.json({
        success: true,
        message:
          "Р  Р’В§Р  Р’В°Р РЋРІР‚С™ Р РЋРЎвЂњР  РўвЂР  Р’В°Р  Р’В»Р РЋРІР‚ВР  Р вЂ¦",
      });

    } catch (error) {

      console.error(
        "DELETE CHAT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Р  РЎСљР  Р’Вµ Р РЋРЎвЂњР  РўвЂР  Р’В°Р  Р’В»Р  РЎвЂўР РЋР С“Р РЋР Р‰ Р РЋРЎвЂњР  РўвЂР  Р’В°Р  Р’В»Р  РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р РЋРІР‚РЋР  Р’В°Р РЋРІР‚С™",
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

// Р  РЎСџР  РЎвЂўР  Р’В»Р РЋРЎвЂњР РЋРІР‚РЋР  РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р  Р вЂ Р РЋР С“Р  Р’Вµ Р РЋРЎвЂњР РЋР С“Р РЋРІР‚С™Р РЋР вЂљР  РЎвЂўР  РІвЂћвЂ“Р РЋР С“Р РЋРІР‚С™Р  Р вЂ Р  Р’В° Trade-In
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
      message: "Р  РЎСљР  Р’Вµ Р РЋРЎвЂњР  РўвЂР  Р’В°Р  Р’В»Р  РЎвЂўР РЋР С“Р РЋР Р‰ Р  Р’В·Р  Р’В°Р  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  Р’В·Р  РЎвЂР РЋРІР‚С™Р РЋР Р‰ Trade-In",
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
        message: "Р  Р в‚¬Р РЋР С“Р РЋРІР‚С™Р РЋР вЂљР  РЎвЂўР  РІвЂћвЂ“Р РЋР С“Р РЋРІР‚С™Р  Р вЂ Р  РЎвЂў Р  Р вЂ¦Р  Р’Вµ Р  Р вЂ¦Р  Р’В°Р  РІвЂћвЂ“Р  РўвЂР  Р’ВµР  Р вЂ¦Р  РЎвЂў",
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
      message: "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р  РЎвЂ”Р  РЎвЂўР  Р’В»Р РЋРЎвЂњР РЋРІР‚РЋР  Р’ВµР  Р вЂ¦Р  РЎвЂР РЋР РЏ Р РЋРЎвЂњР РЋР С“Р РЋРІР‚С™Р РЋР вЂљР  РЎвЂўР  РІвЂћвЂ“Р РЋР С“Р РЋРІР‚С™Р  Р вЂ Р  Р’В°",
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
        message: "Р  РІР‚в„ўР  Р вЂ Р  Р’ВµР  РўвЂР  РЎвЂР РЋРІР‚С™Р  Р’Вµ Р  Р вЂ¦Р  Р’В°Р  Р’В·Р  Р вЂ Р  Р’В°Р  Р вЂ¦Р  РЎвЂР  Р’Вµ Р РЋРЎвЂњР РЋР С“Р РЋРІР‚С™Р РЋР вЂљР  РЎвЂўР  РІвЂћвЂ“Р РЋР С“Р РЋРІР‚С™Р  Р вЂ Р  Р’В°",
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
      message: "Р  Р в‚¬Р РЋР С“Р РЋРІР‚С™Р РЋР вЂљР  РЎвЂўР  РІвЂћвЂ“Р РЋР С“Р РЋРІР‚С™Р  Р вЂ Р  РЎвЂў Trade-In Р РЋР С“Р  РЎвЂўР  Р’В·Р  РўвЂР  Р’В°Р  Р вЂ¦Р  РЎвЂў",
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
      message: "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р РЋР С“Р  РЎвЂўР  Р’В·Р  РўвЂР  Р’В°Р  Р вЂ¦Р  РЎвЂР РЋР РЏ Trade-In",
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
        message: "Р  Р в‚¬Р РЋР С“Р РЋРІР‚С™Р РЋР вЂљР  РЎвЂўР  РІвЂћвЂ“Р РЋР С“Р РЋРІР‚С™Р  Р вЂ Р  РЎвЂў Р  Р вЂ¦Р  Р’Вµ Р  Р вЂ¦Р  Р’В°Р  РІвЂћвЂ“Р  РўвЂР  Р’ВµР  Р вЂ¦Р  РЎвЂў",
      });
    }

    const item = result.rows[0];

    return res.json({
      success: true,
      message: "Р  Р в‚¬Р РЋР С“Р РЋРІР‚С™Р РЋР вЂљР  РЎвЂўР  РІвЂћвЂ“Р РЋР С“Р РЋРІР‚С™Р  Р вЂ Р  РЎвЂў Р  РЎвЂўР  Р’В±Р  Р вЂ¦Р  РЎвЂўР  Р вЂ Р  Р’В»Р  Р’ВµР  Р вЂ¦Р  РЎвЂў",
      product: item,
    });

  } catch (error) {
    console.error("UPDATE TRADE-IN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р  РЎвЂўР  Р’В±Р  Р вЂ¦Р  РЎвЂўР  Р вЂ Р  Р’В»Р  Р’ВµР  Р вЂ¦Р  РЎвЂР РЋР РЏ Р РЋРЎвЂњР РЋР С“Р РЋРІР‚С™Р РЋР вЂљР  РЎвЂўР  РІвЂћвЂ“Р РЋР С“Р РЋРІР‚С™Р  Р вЂ Р  Р’В°",
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
        message: "Р  Р в‚¬Р РЋР С“Р РЋРІР‚С™Р РЋР вЂљР  РЎвЂўР  РІвЂћвЂ“Р РЋР С“Р РЋРІР‚С™Р  Р вЂ Р  РЎвЂў Р  Р вЂ¦Р  Р’Вµ Р  Р вЂ¦Р  Р’В°Р  РІвЂћвЂ“Р  РўвЂР  Р’ВµР  Р вЂ¦Р  РЎвЂў",
      });
    }

    return res.json({
      success: true,
      message: "Р  Р в‚¬Р РЋР С“Р РЋРІР‚С™Р РЋР вЂљР  РЎвЂўР  РІвЂћвЂ“Р РЋР С“Р РЋРІР‚С™Р  Р вЂ Р  РЎвЂў Р РЋРЎвЂњР  РўвЂР  Р’В°Р  Р’В»Р  Р’ВµР  Р вЂ¦Р  РЎвЂў",
    });

  } catch (error) {
    console.error("DELETE TRADE-IN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р РЋРЎвЂњР  РўвЂР  Р’В°Р  Р’В»Р  Р’ВµР  Р вЂ¦Р  РЎвЂР РЋР РЏ Р РЋРЎвЂњР РЋР С“Р РЋРІР‚С™Р РЋР вЂљР  РЎвЂўР  РІвЂћвЂ“Р РЋР С“Р РЋРІР‚С™Р  Р вЂ Р  Р’В°",
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
        message: "Р  РЎв„ўР  Р’В»Р  РЎвЂР  Р’ВµР  Р вЂ¦Р РЋРІР‚С™ Р  Р вЂ¦Р  Р’Вµ Р  Р вЂ¦Р  Р’В°Р  РІвЂћвЂ“Р  РўвЂР  Р’ВµР  Р вЂ¦",
      });
    }

    const client =
      await enrichClientWithOneC(
        result.rows[0]
      );

    return res.json({
      success: true,
      client,
    });

  } catch (error) {

    console.error(
      "GET CLIENT BY PHONE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р  РЎвЂ”Р  РЎвЂўР  Р’В»Р РЋРЎвЂњР РЋРІР‚РЋР  Р’ВµР  Р вЂ¦Р  РЎвЂР РЋР РЏ Р  РЎвЂќР  Р’В»Р  РЎвЂР  Р’ВµР  Р вЂ¦Р РЋРІР‚С™Р  Р’В°",
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
          "Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р В·Р В°Р С–РЎР‚РЎС“Р В·Р С‘РЎвЂљРЎРЉ Р С‘РЎРѓРЎвЂљР С•РЎР‚Р С‘РЎР‹ Р С•Р С—Р ВµРЎР‚Р В°РЎвЂ Р С‘Р в„–",
        error:
          error.message,
      });
    }
  }
);

// =====================================================
// CLIENT OPERATIONS
// POSTGRESQL
// =====================================================

await pgQuery(`
  CREATE TABLE IF NOT EXISTS client_operations (
    id UUID PRIMARY KEY,
    client_id UUID,
    type TEXT,
    points NUMERIC DEFAULT 0,
    reason TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`);

// Р вЂўРЎРѓР В»Р С‘ РЎвЂљР В°Р В±Р В»Р С‘РЎвЂ Р В° РЎС“Р В¶Р Вµ РЎРѓРЎС“РЎвЂ°Р ВµРЎРѓРЎвЂљР Р†Р С•Р Р†Р В°Р В»Р В° РІР‚вЂќ Р Т‘Р С•Р В±Р В°Р Р†Р В»РЎРЏР ВµР С Р Р…Р ВµР Т‘Р С•РЎРѓРЎвЂљР В°РЎР‹РЎвЂ°Р С‘Р Вµ Р С—Р С•Р В»РЎРЏ

await pgQuery(`
  ALTER TABLE client_operations
  ADD COLUMN IF NOT EXISTS client_id UUID
`);

await pgQuery(`
  ALTER TABLE client_operations
  ADD COLUMN IF NOT EXISTS type TEXT
`);

await pgQuery(`
  ALTER TABLE client_operations
  ADD COLUMN IF NOT EXISTS points NUMERIC DEFAULT 0
`);

await pgQuery(`
  ALTER TABLE client_operations
  ADD COLUMN IF NOT EXISTS reason TEXT DEFAULT ''
`);

await pgQuery(`
  ALTER TABLE client_operations
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()
`);

// Р РЋР С•Р В·Р Т‘Р В°РЎвЂР С Р С‘Р Р…Р Т‘Р ВµР С”РЎРѓ РЎвЂљР С•Р В»РЎРЉР С”Р С• Р С—Р С•РЎРѓР В»Р Вµ Р С–Р В°РЎР‚Р В°Р Р…РЎвЂљР С‘РЎР‚Р С•Р Р†Р В°Р Р…Р Р…Р С•Р С–Р С• РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ client_id

await pgQuery(`
  CREATE INDEX IF NOT EXISTS idx_client_operations_client_id
  ON client_operations(client_id)
`);

console.log("СЂСџвЂњР‰ Р СћР В°Р В±Р В»Р С‘РЎвЂ Р В° client_operations Р С–Р С•РЎвЂљР С•Р Р†Р В°");


// =====================================================
// KUSAI SCORE OPERATIONS
// =====================================================

await pgQuery(`
  CREATE TABLE IF NOT EXISTS kusai_score_operations (
    id UUID PRIMARY KEY,
    client_id UUID NOT NULL,
    type TEXT NOT NULL,
    points NUMERIC NOT NULL DEFAULT 0,
    reason TEXT NOT NULL DEFAULT '',
    comment TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

await pgQuery(`
  ALTER TABLE kusai_score_operations
  ADD COLUMN IF NOT EXISTS comment TEXT NOT NULL DEFAULT ''
`);

await pgQuery(`
  CREATE INDEX IF NOT EXISTS idx_kusai_score_operations_client_id
  ON kusai_score_operations(client_id)
`);

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
            row.reason || "Р  РЎвЂєР  РЎвЂ”Р  Р’ВµР РЋР вЂљР  Р’В°Р РЋРІР‚ Р  РЎвЂР РЋР РЏ",

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
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р  Р’В·Р  Р’В°Р  РЎвЂ“Р РЋР вЂљР РЋРЎвЂњР  Р’В·Р  РЎвЂќР  РЎвЂ Р  РЎвЂР РЋР С“Р РЋРІР‚С™Р  РЎвЂўР РЋР вЂљР  РЎвЂР  РЎвЂ Р  РЎвЂўР  РЎвЂ”Р  Р’ВµР РЋР вЂљР  Р’В°Р РЋРІР‚ Р  РЎвЂР  РІвЂћвЂ“",
        error:
          error.message,
      });
    }
  }
);



// =====================================================
// KUSAI SCORE вЂ” GET BY CLIENT ID
// =====================================================

app.get(
  "/api/clients/:id/kusai-score",
  async (req, res) => {
    try {
      const result = await getKusaiScoreByClientId(req.params.id);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: "РљР»РёРµРЅС‚ РЅРµ РЅР°Р№РґРµРЅ",
        });
      }

      return res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error("GET KUSAI SCORE ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕР»СѓС‡РёС‚СЊ KUSAI Score",
        error: error.message,
      });
    }
  }
);

// =====================================================
// KUSAI SCORE вЂ” GET BY PHONE
// =====================================================

app.get(
  "/api/clients/phone/:phone/kusai-score",
  async (req, res) => {
    try {
      const phone = normalizePhone(
        decodeURIComponent(req.params.phone)
      );

      const clientResult = await pgQuery(
        `
        SELECT id
        FROM clients
        WHERE phone = $1
        LIMIT 1
        `,
        [phone]
      );

      if (clientResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "РљР»РёРµРЅС‚ РЅРµ РЅР°Р№РґРµРЅ",
        });
      }

      const result = await getKusaiScoreByClientId(
        clientResult.rows[0].id
      );

      return res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error("GET KUSAI SCORE BY PHONE ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕР»СѓС‡РёС‚СЊ KUSAI Score",
        error: error.message,
      });
    }
  }
);

// =====================================================
// KUSAI SCORE вЂ” ADD
// =====================================================

app.post(
  "/api/clients/:id/kusai-score/add",
  async (req, res) => {
    try {
      const { id } = req.params;
      const amount = Number(req.body?.points);
      const reason = String(req.body?.reason || "").trim();
      const comment = String(req.body?.comment || "").trim();

      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "РљРѕР»РёС‡РµСЃС‚РІРѕ KUSAI Score РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ Р±РѕР»СЊС€Рµ 0",
        });
      }

      const presetAmount = KUSAI_SCORE_PRESETS[reason];

      if (
        presetAmount !== undefined &&
        amount !== presetAmount
      ) {
        return res.status(400).json({
          success: false,
          message: `Р”Р»СЏ РїСЂРёС‡РёРЅС‹ В«${reason}В» РјРѕР¶РЅРѕ РЅР°С‡РёСЃР»РёС‚СЊ С‚РѕР»СЊРєРѕ ${presetAmount} Score`,
        });
      }

      const clientResult = await pgQuery(
        `
        SELECT id
        FROM clients
        WHERE id = $1
        LIMIT 1
        `,
        [id]
      );

      if (clientResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "РљР»РёРµРЅС‚ РЅРµ РЅР°Р№РґРµРЅ",
        });
      }

      await pgQuery(
        `
        INSERT INTO kusai_score_operations (
          id,
          client_id,
          type,
          points,
          reason,
          comment,
          created_at
        )
        VALUES ($1, $2, 'add', $3, $4, $5, NOW())
        `,
        [
          crypto.randomUUID(),
          id,
          amount,
          reason || "Р СѓС‡РЅРѕРµ РЅР°С‡РёСЃР»РµРЅРёРµ KUSAI Score",
          comment,
        ]
      );

      const result = await getKusaiScoreByClientId(id);

      return res.json({
        success: true,
        message: "KUSAI Score РЅР°С‡РёСЃР»РµРЅ",
        ...result,
      });
    } catch (error) {
      console.error("ADD KUSAI SCORE ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "РћС€РёР±РєР° РЅР°С‡РёСЃР»РµРЅРёСЏ KUSAI Score",
        error: error.message,
      });
    }
  }
);

// =====================================================
// KUSAI SCORE вЂ” REMOVE
// =====================================================

app.post(
  "/api/clients/:id/kusai-score/remove",
  async (req, res) => {
    try {
      const { id } = req.params;
      const amount = Number(req.body?.points);
      const reason = String(req.body?.reason || "").trim();
      const comment = String(req.body?.comment || "").trim();

      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "РљРѕР»РёС‡РµСЃС‚РІРѕ KUSAI Score РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ Р±РѕР»СЊС€Рµ 0",
        });
      }

      const current = await getKusaiScoreByClientId(id);

      if (!current) {
        return res.status(404).json({
          success: false,
          message: "РљР»РёРµРЅС‚ РЅРµ РЅР°Р№РґРµРЅ",
        });
      }

      if (amount > current.score) {
        return res.status(400).json({
          success: false,
          message: `РќРµРґРѕСЃС‚Р°С‚РѕС‡РЅРѕ KUSAI Score. Р”РѕСЃС‚СѓРїРЅРѕ: ${current.score}`,
          score: current.score,
        });
      }

      await pgQuery(
        `
        INSERT INTO kusai_score_operations (
          id,
          client_id,
          type,
          points,
          reason,
          comment,
          created_at
        )
        VALUES ($1, $2, 'remove', $3, $4, $5, NOW())
        `,
        [
          crypto.randomUUID(),
          id,
          amount,
          reason || "Р СѓС‡РЅРѕРµ СЃРїРёСЃР°РЅРёРµ KUSAI Score",
          comment,
        ]
      );

      const result = await getKusaiScoreByClientId(id);

      return res.json({
        success: true,
        message: "KUSAI Score СЃРїРёСЃР°РЅ",
        ...result,
      });
    } catch (error) {
      console.error("REMOVE KUSAI SCORE ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "РћС€РёР±РєР° СЃРїРёСЃР°РЅРёСЏ KUSAI Score",
        error: error.message,
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
          message: "Р  РЎв„ўР  Р’В»Р  РЎвЂР  Р’ВµР  Р вЂ¦Р РЋРІР‚С™ Р  Р вЂ¦Р  Р’Вµ Р  Р вЂ¦Р  Р’В°Р  РІвЂћвЂ“Р  РўвЂР  Р’ВµР  Р вЂ¦",
        });

      }

      const client = existing.rows[0];

      /*
      ==========================================
      Р  Р в‚¬Р  РІР‚СњР  РЎвЂ™Р  РІР‚С”Р  Р вЂЎР  РІР‚СћР  РЎС™ Р  Р’ВР  Р Р‹Р  РЎС›Р  РЎвЂєР   Р  Р’ВР  Р’В® Р  РЎвЂєР  РЎСџР  РІР‚СћР   Р  РЎвЂ™Р  Р’В¦Р  Р’ВР  РІвЂћСћ
      ==========================================
      */

      await pgQuery(
        `
        DELETE FROM client_operations
        WHERE client_id = $1
        `,
        [id]
      );


      await pgQuery(
        `
        DELETE FROM kusai_score_operations
        WHERE client_id = $1
        `,
        [id]
      );

      /*
      ==========================================
      Р  Р в‚¬Р  РІР‚СњР  РЎвЂ™Р  РІР‚С”Р  Р вЂЎР  РІР‚СћР  РЎС™ Р  Р Р‹Р  РЎвЂєР  РЎвЂєР  РІР‚ВР  Р’В©Р  РІР‚СћР  РЎСљР  Р’ВР  Р вЂЎ Р  РЎв„ўР  РІР‚С”Р  Р’ВР  РІР‚СћР  РЎСљР  РЎС›Р  РЎвЂ™
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
      Р  Р в‚¬Р  РІР‚СњР  РЎвЂ™Р  РІР‚С”Р  Р вЂЎР  РІР‚СћР  РЎС™ Р  РЎв„ўР  РІР‚С”Р  Р’ВР  РІР‚СћР  РЎСљР  РЎС›Р  РЎвЂ™
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
          "Р  РЎв„ўР  Р’В»Р  РЎвЂР  Р’ВµР  Р вЂ¦Р РЋРІР‚С™ Р РЋРЎвЂњР РЋР С“Р  РЎвЂ”Р  Р’ВµР РЋРІвЂљВ¬Р  Р вЂ¦Р  РЎвЂў Р РЋРЎвЂњР  РўвЂР  Р’В°Р  Р’В»Р РЋРІР‚ВР  Р вЂ¦",

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
          "Р  РЎвЂєР РЋРІвЂљВ¬Р  РЎвЂР  Р’В±Р  РЎвЂќР  Р’В° Р РЋРЎвЂњР  РўвЂР  Р’В°Р  Р’В»Р  Р’ВµР  Р вЂ¦Р  РЎвЂР РЋР РЏ Р  РЎвЂќР  Р’В»Р  РЎвЂР  Р’ВµР  Р вЂ¦Р РЋРІР‚С™Р  Р’В°",

        error:
          error.message,
      });
    }
  }
);

// =====================================================
// GET CLIENT SALES HISTORY FROM 1C
// =====================================================

app.get(
  "/api/clients/phone/:phone/sales-history",
  async (req, res) => {
    try {
      const phone = decodeURIComponent(
        req.params.phone
      );

      console.log("");
      console.log(
        "======================================"
      );
      console.log(
        "Р вЂ”Р С’Р СџР  Р С›Р РЋ Р ВР РЋР СћР С›Р  Р ВР В Р СџР  Р С›Р вЂќР С’Р вЂ“ Р С™Р вЂєР ВР вЂўР СњР СћР С’"
      );
      console.log(
        "======================================"
      );

      console.log(
        "Р СћР ВµР В»Р ВµРЎвЂћР С•Р Р… Р С”Р В»Р С‘Р ВµР Р…РЎвЂљР В°:",
        phone
      );

    const [sales, bonusHistory] = await Promise.all([
  getOneCSalesHistory(phone),
  getOneCBonusHistory(phone),
]);

return res.json({
  success: true,
  phone,
  count: Array.isArray(sales) ? sales.length : 0,
  sales: Array.isArray(sales) ? sales : [],
  bonusHistory: Array.isArray(bonusHistory)
    ? bonusHistory
    : [],
});

    } catch (error) {

      console.error(
        "GET CLIENT SALES HISTORY ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р С—Р С•Р В»РЎС“РЎвЂЎР С‘РЎвЂљРЎРЉ Р С‘РЎРѓРЎвЂљР С•РЎР‚Р С‘РЎР‹ Р С—РЎР‚Р С•Р Т‘Р В°Р В¶ Р С‘Р В· 1Р РЋ",

        error:
          error.message,
      });
    }
  }
);



/**
 * РџРѕР»СѓС‡РµРЅРёРµ РёСЃС‚РѕСЂРёРё Р±РѕРЅСѓСЃРѕРІ РєР»РёРµРЅС‚Р° РёР· 1РЎ.
 */
app.get(
  "/api/clients/phone/:phone/bonus-history",
  async (req, res) => {
    try {
      const phone = decodeURIComponent(
        req.params.phone
      );

      const bonusHistory =
        await getOneCBonusHistory(phone);

      return res.json({
        success: true,
        bonusHistory,
      });
    } catch (error) {
      console.error(
        "РћС€РёР±РєР° API РїРѕР»СѓС‡РµРЅРёСЏ РёСЃС‚РѕСЂРёРё Р±РѕРЅСѓСЃРѕРІ:",
        error?.message || error
      );

      return res.status(500).json({
        success: false,
        message:
          "РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕР»СѓС‡РёС‚СЊ РёСЃС‚РѕСЂРёСЋ Р±РѕРЅСѓСЃРѕРІ РёР· 1РЎ",
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
        `РЎР‚РЎСџРЎв„ўР вЂљ KUSAI MAX API Р  Р’В·Р  Р’В°Р  РЎвЂ”Р РЋРЎвЂњР РЋРІР‚В°Р  Р’ВµР  Р вЂ¦ Р  Р вЂ¦Р  Р’В° Р  РЎвЂ”Р  РЎвЂўР РЋР вЂљР РЋРІР‚С™Р РЋРЎвЂњ ${PORT}`
      );
      console.log(
    `РЎР‚РЎСџРІР‚СљР Р‹ http://localhost:${PORT}`
  );
    });

  })
  .catch((error) => {

    console.error(
      "Р Р†РЎСљР Р‰ Р  РЎСљР  Р’Вµ Р РЋРЎвЂњР  РўвЂР  Р’В°Р  Р’В»Р  РЎвЂўР РЋР С“Р РЋР Р‰ Р  Р’В·Р  Р’В°Р  РЎвЂ”Р РЋРЎвЂњР РЋР С“Р РЋРІР‚С™Р  РЎвЂР РЋРІР‚С™Р РЋР Р‰ Р РЋР С“Р  Р’ВµР РЋР вЂљР  Р вЂ Р  Р’ВµР РЋР вЂљ:",
      error
    );

    process.exit(1);

  });

export default app; 
//d