import { query } from "./postgres.js";

import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import { db } from "./firebaseAdmin.js";
import { calculateBonusDiscount } from "./bonus.js";

const app = express();

// =====================================================
// CORS
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

function normalizePhone(phone) {
const digits = String(phone || "").replace(/\D/g, "");

// Российский номер 8XXXXXXXXXX -> 7XXXXXXXXXX
if (digits.length === 11 && digits.startsWith("8")) {
return `7${digits.slice(1)}`;
}

return digits;
}

function formatClient(client) {
if (!client) {
return null;
}

return {
id: client.id,
name: client.name || "",
phone: client.phone || "",
points: Number(client.points || 0),
bonuses: Number(client.bonuses || 0),
orders: Number(client.orders || 0),
status: client.status || "NEW CLIENT",
role: client.role || "user",


createdAt: client.created_at
  ? new Date(client.created_at).toISOString()
  : null,

updatedAt: client.updated_at
  ? new Date(client.updated_at).toISOString()
  : null,


};
}

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

app.get("/api/health", async (req, res) => {
try {
await query("SELECT 1");


res.json({
  success: true,
  message: "KUSAI MAX API подключен",
  database: "PostgreSQL",
  serverTime: new Date().toISOString(),
});


} catch (error) {
console.error("HEALTH ERROR:", error);


res.status(500).json({
  success: false,
  message: "Ошибка подключения к PostgreSQL",
});


}
});

// =====================================================
// CLIENT LOGIN / REGISTRATION
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
    message: "Введите номер телефона",
  });
}

const normalizedPhone = normalizePhone(phone);

// Ищем клиента по номеру
const existingResult = await query(
  `
  SELECT *
  FROM clients
  WHERE phone = $1
  LIMIT 1
  `,
  [normalizedPhone]
);

// ==========================================
// КЛИЕНТ НАЙДЕН — ВХОД
// ==========================================

if (existingResult.rows.length > 0) {
  return res.status(200).json({
    success: true,
    message: "Вход выполнен",
    isNewClient: false,
    client: formatClient(existingResult.rows[0]),
  });
}

// ==========================================
// НОВЫЙ КЛИЕНТ — НУЖНО ИМЯ
// ==========================================

if (!name) {
  return res.status(404).json({
    success: false,
    needsRegistration: true,
    message: "Клиент не найден. Необходимо зарегистрироваться.",
  });
}

const clientId = crypto.randomUUID();
const welcomeBonus = 100000;

// ==========================================
// СОЗДАЁМ КЛИЕНТА
// ==========================================

const result = await query(
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

// ==========================================
// СОЗДАЁМ ОПЕРАЦИЮ
// ==========================================

try {
  await query(
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
      'Приветственные бонусы',
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
    "CREATE WELCOME OPERATION ERROR:",
    operationError
  );
}

return res.status(201).json({
  success: true,
  message: "Регистрация успешно завершена",
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
  message: "Ошибка входа или регистрации клиента",
  error: error.message,
});

}
});

// =====================================================
// ADMIN LOGIN
// FIREBASE — ОСТАВЛЯЕМ
// =====================================================

app.post("/api/admin/login", async (req, res) => {
console.log("=================================");
console.log("ADMIN LOGIN REQUEST");
console.log("BODY:", req.body);
console.log("=================================");

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
    role: "admin",
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
// GET ALL CLIENTS
// POSTGRESQL
// =====================================================

app.get("/api/clients", async (req, res) => {
try {
const result = await query(
`       SELECT *
      FROM clients
      ORDER BY created_at DESC
      `
);


const clients = result.rows.map(formatClient);

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
  error: error.message,
});


}
});

// =====================================================
// GET CLIENT
// POSTGRESQL
// =====================================================

app.get("/api/clients/:id", async (req, res) => {
try {
const { id } = req.params;


const result = await query(
  `
  SELECT *
  FROM clients
  WHERE id = $1
  LIMIT 1
  `,
  [id]
);

if (result.rows.length === 0) {
  return res.status(404).json({
    success: false,
    message: "Клиент не найден",
  });
}

return res.json({
  success: true,
  client: formatClient(result.rows[0]),
});


} catch (error) {
console.error("GET CLIENT ERROR:", error);


return res.status(500).json({
  success: false,
  message: "Ошибка получения клиента",
  error: error.message,
});


}
});

// =====================================================
// GET CLIENT PROFILE
// POSTGRESQL
// =====================================================

app.get(
"/api/clients/:id/profile",
async (req, res) => {
try {
const { id } = req.params;


  const clientResult = await query(
    `
    SELECT *
    FROM clients
    WHERE id = $1
    LIMIT 1
    `
    ,
    [id]
  );

  if (clientResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Клиент не найден",
    });
  }

  let operations = [];

  try {
    const operationsResult = await query(
      `
      SELECT *
      FROM client_operations
      WHERE client_id = $1
      ORDER BY created_at DESC
      `
      ,
      [id]
    );

    operations = operationsResult.rows.map((operation) => ({
      id: operation.id,
      type: operation.type,
      points: Number(operation.points || 0),
      reason: operation.reason || "",
      date: operation.created_at
        ? new Date(operation.created_at).toISOString()
        : null,
    }));
  } catch (operationsError) {
    console.error(
      "GET PROFILE OPERATIONS ERROR:",
      operationsError
    );
  }

  return res.json({
    success: true,
    client: {
      ...formatClient(clientResult.rows[0]),
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
    message: "Ошибка получения профиля клиента",
    error: error.message,
  });
}

}
);

// =====================================================
// GET OPERATIONS
// POSTGRESQL
// =====================================================

app.get(
"/api/clients/:id/operations",
async (req, res) => {
try {
const { id } = req.params;


  const result = await query(
    `
    SELECT *
    FROM client_operations
    WHERE client_id = $1
    ORDER BY created_at DESC
    `,
    [id]
  );

  const operations = result.rows.map((operation) => ({
    id: operation.id,
    type: operation.type,
    points: Number(operation.points || 0),
    reason: operation.reason || "",
    date: operation.created_at
      ? new Date(operation.created_at).toISOString()
      : null,
  }));

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
    message: "Ошибка получения истории",
    error: error.message,
  });
}

}
);

// =====================================================
// CREATE CLIENT
// POSTGRESQL
// =====================================================

app.post("/api/clients", async (req, res) => {
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

if (!name) {
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

const normalizedPhone = normalizePhone(phone);

const existingResult = await query(
  `
  SELECT *
  FROM clients
  WHERE phone = $1
  LIMIT 1
  `,
  [normalizedPhone]
);

if (existingResult.rows.length > 0) {
  return res.json({
    success: true,
    message: "Клиент уже зарегистрирован",
    alreadyExists: true,
    client: formatClient(existingResult.rows[0]),
  });
}

const clientId = crypto.randomUUID();
const welcomeBonus = 100000;

const result = await query(
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

try {
  await query(
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
      'Приветственные бонусы',
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
    "CREATE CLIENT OPERATION ERROR:",
    operationError
  );
}

return res.status(201).json({
  success: true,
  message: "Регистрация успешно завершена",
  alreadyExists: false,
  client: formatClient(client),
});


} catch (error) {
console.error("CREATE CLIENT ERROR:", error);


return res.status(500).json({
  success: false,
  message: "Ошибка регистрации клиента",
  error: error.message,
});


}
});

// =====================================================
// UPDATE CLIENT
// POSTGRESQL
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

  const currentResult = await query(
    `
    SELECT *
    FROM clients
    WHERE id = $1
    LIMIT 1
    `,
    [id]
  );

  if (currentResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Клиент не найден",
    });
  }

  const current = currentResult.rows[0];

  const updatedName =
    name !== undefined
      ? String(name).trim()
      : current.name;

  const updatedPhone =
    phone !== undefined
      ? normalizePhone(phone)
      : current.phone;

  const updatedPoints =
    points !== undefined
      ? Number(points)
      : Number(current.points || 0);

  const updatedBonuses =
    bonuses !== undefined
      ? Number(bonuses)
      : Number(current.bonuses || 0);

  const updatedStatus =
    status !== undefined
      ? status
      : current.status;

  const updatedOrders =
    orders !== undefined
      ? Number(orders)
      : Number(current.orders || 0);

  const result = await query(
    `
    UPDATE clients
    SET
      name = $1,
      phone = $2,
      points = $3,
      bonuses = $4,
      status = $5,
      orders = $6,
      updated_at = NOW()
    WHERE id = $7
    RETURNING *
    `,
    [
      updatedName,
      updatedPhone,
      updatedPoints,
      updatedBonuses,
      updatedStatus,
      updatedOrders,
      id,
    ]
  );

  return res.json({
    success: true,
    client: formatClient(result.rows[0]),
  });

} catch (error) {
  console.error("UPDATE CLIENT ERROR:", error);

  return res.status(500).json({
    success: false,
    message: "Ошибка обновления клиента",
    error: error.message,
  });
}


}
);

// =====================================================
// ADD BONUS
// POSTGRESQL
// =====================================================

app.post(
"/api/clients/:id/bonus/add",
async (req, res) => {
try {
const { id } = req.params;
const { points, reason } = req.body || {};


  const amount = Number(points);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Некорректное количество бонусов",
    });
  }

  const clientResult = await query(
    `
    SELECT *
    FROM clients
    WHERE id = $1
    LIMIT 1
    `,
    [id]
  );

  if (clientResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Клиент не найден",
    });
  }

  const client = clientResult.rows[0];

  const currentPoints = Number(
    client.points || 0
  );

  const currentBonuses = Number(
    client.bonuses || 0
  );

  const newPoints =
    currentPoints + amount;

  const newBonuses =
    currentBonuses + amount;

  await query(
    `
    UPDATE clients
    SET
      points = $1,
      bonuses = $2,
      updated_at = NOW()
    WHERE id = $3
    `,
    [
      newPoints,
      newBonuses,
      id,
    ]
  );

  await query(
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
      reason || "Начисление бонусов",
    ]
  );

  return res.json({
    success: true,
    message: "Бонусы начислены",
    points: newPoints,
    bonuses: newBonuses,
  });

} catch (error) {
  console.error("ADD BONUS ERROR:", error);

  return res.status(500).json({
    success: false,
    message: "Ошибка начисления бонусов",
    error: error.message,
  });
}


}
);

// =====================================================
// REMOVE BONUS
// POSTGRESQL
// =====================================================

app.post(
"/api/clients/:id/bonus/remove",
async (req, res) => {
try {
const { id } = req.params;
const { points, reason } = req.body || {};


  const amount = Number(points);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Некорректное количество бонусов",
    });
  }

  const clientResult = await query(
    `
    SELECT *
    FROM clients
    WHERE id = $1
    LIMIT 1
    `,
    [id]
  );

  if (clientResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Клиент не найден",
    });
  }

  const client = clientResult.rows[0];

  const currentPoints = Number(
    client.points || 0
  );

  const currentBonuses = Number(
    client.bonuses || 0
  );

  if (amount > currentBonuses) {
    return res.status(400).json({
      success: false,
      message: "Недостаточно бонусов",
    });
  }

  const newPoints = Math.max(
    0,
    currentPoints - amount
  );

  const newBonuses =
    currentBonuses - amount;

  await query(
    `
    UPDATE clients
    SET
      points = $1,
      bonuses = $2,
      updated_at = NOW()
    WHERE id = $3
    `,
    [
      newPoints,
      newBonuses,
      id,
    ]
  );

  await query(
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
      reason || "Списание бонусов",
    ]
  );

  return res.json({
    success: true,
    message: "Бонусы списаны",
    points: newPoints,
    bonuses: newBonuses,
  });

} catch (error) {
  console.error("REMOVE BONUS ERROR:", error);

  return res.status(500).json({
    success: false,
    message: "Ошибка списания бонусов",
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

// =====================================================
// 1C
// =====================================================

const ONE_C_API_KEY =
process.env.ONE_C_API_KEY ||
"KUSAI-MAX-1C-KEY-2026";

app.get(
"/api/1c/test",
(req, res) => {
const apiKey =
req.headers["x-api-key"];


if (apiKey !== ONE_C_API_KEY) {
  return res.status(403).json({
    success: false,
    message: "Нет доступа",
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

// =====================================================
// 1C CLIENTS
// POSTGRESQL
// =====================================================

app.get(
"/api/1c/clients",
async (req, res) => {
const apiKey =
req.headers["x-api-key"];


if (apiKey !== ONE_C_API_KEY) {
  return res.status(403).json({
    success: false,
    message: "Нет доступа",
  });
}

try {
  const result = await query(
    `
    SELECT *
    FROM clients
    ORDER BY created_at DESC
    `
  );

  const clients = result.rows.map(
    formatClient
  );

  return res.json({
    success: true,
    count: clients.length,
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
    error: error.message,
  });
}

}
);

// =====================================================
// PRODUCT GROUPS
// FIREBASE — ПОКА ОСТАВЛЯЕМ
// =====================================================

app.get("/api/product-groups", async (req, res) => {
try {
const snapshot = await db
.collection("productGroups")
.orderBy("createdAt", "desc")
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
console.error(
"GET PRODUCT GROUPS ERROR:",
error
);


return res.status(500).json({
  success: false,
  message:
    "Не удалось загрузить группы",
});


}
});

app.post("/api/product-groups", async (req, res) => {
try {
const { name, parentId } = req.body;


if (!name || !String(name).trim()) {
  return res.status(400).json({
    success: false,
    message:
      "Введите название группы",
  });
}

const group = {
  name: String(name).trim(),
  parentId: parentId || null,
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
    createdAt:
      group.createdAt.toISOString(),
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
    "Не удалось создать группу",
});

}
});

app.patch(
"/api/product-groups/:id",
async (req, res) => {
try {
const { id } = req.params;
const { name, parentId } = req.body;

  const groupRef = db
    .collection("productGroups")
    .doc(id);

  const groupDoc =
    await groupRef.get();

  if (!groupDoc.exists) {
    return res.status(404).json({
      success: false,
      message: "Группа не найдена",
    });
  }

  const updates = {};

  if (name !== undefined) {
    updates.name = String(name).trim();
  }

  if (parentId !== undefined) {
    updates.parentId =
      parentId || null;
  }

  await groupRef.update(updates);

  const updatedDoc =
    await groupRef.get();

  return res.json({
    success: true,
    group: {
      id: updatedDoc.id,
      ...updatedDoc.data(),
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
      "Не удалось обновить группу",
  });
}


}
);

app.delete(
"/api/product-groups/:id",
async (req, res) => {
try {
const { id } = req.params;


  await db
    .collection("productGroups")
    .doc(id)
    .delete();

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
      "Не удалось удалить группу",
  });
}

}
);

// =====================================================
// CATEGORIES
// =====================================================

app.get("/api/categories", async (req, res) => {
try {
const snapshot = await db
.collection("productGroups")
.get();

const categories =
  snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
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
    "Не удалось загрузить категории",
});

}
});

// =====================================================
// 404
// =====================================================

app.use((req, res) => {
return res.status(404).json({
success: false,
message: "API route not found",
path: req.path,
});
});

// =====================================================
// EXPORT
// =====================================================

export default app;
