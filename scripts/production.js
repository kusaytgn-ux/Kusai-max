import "dotenv/config";
import express from "express";
import cors from "cors";
import "dotenv/config";
import { query as pgQuery, checkPostgres } from "../api/postgres.js";
import crypto from "node:crypto";
import {
  getProducts,
  getProductById,
  testMoySklad,
} from "../api/moysklad.js";

import {
  checkOneCHealth,
  getOneCCustomer,
   getAllOneCCustomers,
  normalizePhone,
} from "../api/oneC.js";



const app = express();

const PORT = process.env.PORT || 3001;

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
| CLIENTS + MESSAGES API
|--------------------------------------------------------------------------
*/

function serializeClient(row) {
  return {
    id: row.id,
    name: row.name || "",
    login: row.login || row.name || "",
    phone: row.phone || "",
    points: Number(row.points || 0),
    bonuses: Number(row.bonuses || 0),
    orders: Number(row.orders || 0),
    status: row.status || "MAX START",
    role: row.role || "user",
  };
}
// бэкап
async function syncCustomersToPostgres(customers) {
  let synced = 0;
  let created = 0;
  let updated = 0;
  let operations = 0;

  for (const customer of customers) {
    const customerId = String(customer.customerId || "").trim();

    if (!customerId) {
      continue;
    }

    const name = String(customer.name || "").trim();
    const phone = normalizePhone(String(customer.phone || ""));
    const bonusBalance = Number(customer.bonusBalance || 0);

    // Ищем клиента сначала по customerId 1С
    const existing = await pgQuery(
      `
      SELECT id
      FROM clients
      WHERE onec_customer_id = $1
      LIMIT 1
      `,
      [customerId]
    );

    let clientId;

    if (existing.rows.length > 0) {
      clientId = existing.rows[0].id;

      await pgQuery(
        `
        UPDATE clients
        SET
          name = $1,
          phone = $2,
          points = $3,
          bonuses = $3,
          status = COALESCE(status, 'ACTIVE'),
          updated_at = NOW(),
          raw = $4
        WHERE id = $5
        `,
        [
          name,
          phone,
          bonusBalance,
          customer,
          clientId,
        ]
      );

      updated++;
    } else {
      // Если customerId ещё не привязан —
      // пробуем найти клиента по телефону.
      const byPhone = await pgQuery(
        `
        SELECT id
        FROM clients
        WHERE phone = $1
        LIMIT 1
        `,
        [phone]
      );

      if (byPhone.rows.length > 0) {
        clientId = byPhone.rows[0].id;

        await pgQuery(
          `
          UPDATE clients
          SET
            onec_customer_id = $1,
            name = $2,
            phone = $3,
            points = $4,
            bonuses = $4,
            updated_at = NOW(),
            raw = $5
          WHERE id = $6
          `,
          [
            customerId,
            name,
            phone,
            bonusBalance,
            customer,
            clientId,
          ]
        );

        updated++;
      } else {
        clientId = crypto.randomUUID();

        await pgQuery(
          `
          INSERT INTO clients (
            id,
            name,
            phone,
            login,
            points,
            bonuses,
            orders,
            status,
            role,
            source,
            welcome_bonus,
            onec_customer_id,
            created_at,
            updated_at,
            raw
          )
          VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
            $11,$12,$13,$14,$15
          )
          `,
          [
            clientId,
            name,
            phone,
            name,
            bonusBalance,
            bonusBalance,
            0,
            "ACTIVE",
            "user",
            "1c",
            false,
            customerId,
            new Date(),
            new Date(),
            customer,
          ]
        );

        created++;
      }
    }

    // История продаж / операций
    if (Array.isArray(customer.salesHistory)) {
      for (const sale of customer.salesHistory) {
        console.log(
  "SALE FROM 1C:",
  JSON.stringify(sale, null, 2)
);
        const operationId = String(sale.id || "").trim();

        if (!operationId) {
          continue;
        }

        const sum = Number(sale.sum || 0);

        await pgQuery(
          `
          INSERT INTO client_operations (
            client_id,
            id,
            type,
            points,
            reason,
            operation_date
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6
          )
          ON CONFLICT (client_id, id)
          DO UPDATE SET
            type = EXCLUDED.type,
            points = EXCLUDED.points,
            reason = EXCLUDED.reason,
            operation_date = EXCLUDED.operation_date
          `,
          [
            clientId,
            operationId,
            sum < 0 ? "remove" : "add",
            sum,
            sale.goods || "",
            sale.date ? new Date(sale.date) : null,
          ]
        );

        operations++;
      }
    }

    synced++;
  }

  return {
    synced,
    created,
    updated,
    operations,
  };
}




app.post("/api/1c/sync-customers", async (req, res) => {
  try {
    const customers = Array.isArray(req.body)
      ? req.body
      : req.body?.customers;

    if (!Array.isArray(customers)) {
      return res.status(400).json({
        success: false,
        message: "Ожидается массив customers",
      });
    }

    const result = await syncCustomersToPostgres(customers);

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "POST /api/1c/sync-customers failed:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Ошибка синхронизации клиентов 1С",
      error: error.message,
    });
  }
});

app.post("/api/1c/sync-all-customers", async (req, res) => {
  try {
    console.log("");
    console.log("======================================");
    console.log("1С: НАЧАЛО ПОЛНОЙ СИНХРОНИЗАЦИИ КЛИЕНТОВ");
    console.log("======================================");

    const customers = await getAllOneCCustomers();

    console.log(
      `1С: получено клиентов: ${customers.length}`
    );

    const BATCH_SIZE = 50;

    let totalSynced = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalOperations = 0;

    for (
      let i = 0;
      i < customers.length;
      i += BATCH_SIZE
    ) {
      const batch = customers.slice(
        i,
        i + BATCH_SIZE
      );

      const batchNumber =
        Math.floor(i / BATCH_SIZE) + 1;

      const totalBatches =
        Math.ceil(
          customers.length / BATCH_SIZE
        );

      console.log("");
      console.log(
        `1С: обработка пачки ${batchNumber}/${totalBatches}`
      );
      console.log(
        `1С: клиентов в пачке: ${batch.length}`
      );

      const result =
        await syncCustomersToPostgres(batch);

      totalSynced += result.synced;
      totalCreated += result.created;
      totalUpdated += result.updated;
      totalOperations += result.operations;

      console.log(
        `1С: пачка ${batchNumber} завершена`,
        result
      );
    }

    const result = {
      synced: totalSynced,
      created: totalCreated,
      updated: totalUpdated,
      operations: totalOperations,
    };

    console.log("");
    console.log("======================================");
    console.log("1С: ПОЛНАЯ СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА");
    console.log("======================================");

    console.log(result);

    return res.json({
      success: true,
      source: "1C",
      totalFromOneC: customers.length,
      batchSize: BATCH_SIZE,
      totalBatches: Math.ceil(
        customers.length / BATCH_SIZE
      ),
      ...result,
    });
  } catch (error) {
    console.error(
      "1С full customers sync failed:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

app.get("/api/1c/test-customers", async (req, res) => {
  try {
    const customers = await getAllOneCCustomers();

    return res.json({
      success: true,
      count: customers.length,
    });
  } catch (error) {
    console.error("1С test customers failed:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

app.get("/api/clients/:id", async (req, res) => {
  try {
    const result = await pgQuery(
      `
      SELECT
        id,
        name,
        phone,
        login,
        points,
        bonuses,
        orders,
        status,
        role
      FROM clients
      WHERE id = $1
      LIMIT 1
      `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Клиент не найден",
      });
    }

    const row = result.rows[0];

    return res.json({
      success: true,
      client: {
        id: row.id,
        name: row.name || "",
        phone: row.phone || "",
        login: row.login || "",
        points: Number(row.points || 0),
        bonuses: Number(row.bonuses || 0),
        orders: Number(row.orders || 0),
        status:
          row.status || "NEW CLIENT",
        role: row.role || "user",
      },
    });
  } catch (error) {
    console.error(
      "GET /api/clients/:id failed:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Ошибка загрузки клиента",
    });
  }
});

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
          operation_date
        FROM client_operations
        WHERE client_id = $1
        ORDER BY operation_date DESC NULLS LAST, id DESC
        `,
        [req.params.id]
      );

      return res.json({
        success: true,
        operations: result.rows.map((row) => {
          const amount = Number(row.points || 0);

          return {
            id: row.id,
            type: row.type,

            // Реальная сумма покупки
            amount,

            // 1% от покупки, округление вверх
            bonuses: Math.ceil(amount * 0.01),

            // Название товара
            productName:
              row.reason || "Покупка",

            operationDate:
              row.operation_date,
          };
        }),
      });
    } catch (error) {
      console.error(
        "GET /api/clients/:id/operations failed:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка загрузки истории покупок",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| PATCH /api/clients/:id
|--------------------------------------------------------------------------
*/

app.patch(
  "/api/clients/:id",
  async (req, res) => {
    try {
      const login =
        typeof req.body?.login === "string"
          ? req.body.login.trim()
          : "";

      if (!login) {
        return res.status(400).json({
          success: false,
          message: "Логин не указан",
        });
      }

      const result = await pgQuery(
        `
        UPDATE clients
        SET
          login = $1,
          updated_at = NOW()
        WHERE id = $2
        RETURNING
          id,
          name,
          phone,
          login,
          points,
          bonuses,
          orders,
          status,
          role
        `,
        [login, req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Клиент не найден",
        });
      }

      const row = result.rows[0];

      return res.json({
        success: true,
        client: {
          id: row.id,
          name: row.name || "",
          phone: row.phone || "",
          login: row.login || "",
          points: Number(row.points || 0),
          bonuses: Number(row.bonuses || 0),
          orders: Number(row.orders || 0),
          status: row.status || "NEW CLIENT",
          role: row.role || "user",
        },
      });
    } catch (error) {
      console.error(
        "PATCH /api/clients/:id failed:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка обновления профиля",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET /api/clients
|--------------------------------------------------------------------------
*/

app.get("/api/clients", async (req, res) => {
  try {
    const result = await pgQuery(
      `
      SELECT
        id,
        name,
        phone,
        login,
        points,
        bonuses,
        orders,
        status,
        role,
        created_at
      FROM clients
      ORDER BY created_at DESC NULLS LAST, id DESC
      `
    );

    return res.json({
      success: true,
      clients: result.rows.map((row) => ({
        id: row.id,
        name: row.name || "",
        phone: row.phone || "",
        login: row.login || "",
        points: Number(row.points || 0),
        bonuses: Number(row.bonuses || 0),
        orders: Number(row.orders || 0),
        status: row.status || "NEW CLIENT",
        role: row.role || "user",
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error(
      "GET /api/clients failed:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Ошибка загрузки клиентов",
    });
  }
});

/*
|--------------------------------------------------------------------------
| DELETE /api/clients/:id
|--------------------------------------------------------------------------
*/

app.delete(
  "/api/clients/:id",
  async (req, res) => {
    try {
      const result = await pgQuery(
        `
        DELETE FROM clients
        WHERE id = $1
        RETURNING id
        `,
        [req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Клиент не найден",
        });
      }

      return res.json({
        success: true,
        id: result.rows[0].id,
      });
    } catch (error) {
      console.error(
        "DELETE /api/clients/:id failed:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Ошибка удаления клиента",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET /api/clients/phone/:phone
|--------------------------------------------------------------------------
*/

app.get(
  "/api/clients/phone/:phone",
  async (req, res) => {
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
          message: "Клиент не найден",
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
        "GET CLIENT BY PHONE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка получения клиента",
        error:
          error.message,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET /api/messages
|
| Без userLogin — все сообщения.
| С userLogin — только один чат.
|--------------------------------------------------------------------------
*/

app.get("/api/messages", async (req, res) => {
  try {
    const userLogin =
      typeof req.query.userLogin === "string"
        ? req.query.userLogin.trim()
        : "";

    let result;

    if (userLogin) {
      result = await pgQuery(
        `
        SELECT
          id,
          user_login,
          author,
          text,
          read_by_user,
          read_by_admin,
          created_at
        FROM messages
        WHERE user_login = $1
        ORDER BY created_at ASC, id ASC
        `,
        [userLogin]
      );
    } else {
      result = await pgQuery(
        `
        SELECT
          id,
          user_login,
          author,
          text,
          read_by_user,
          read_by_admin,
          created_at
        FROM messages
        ORDER BY created_at ASC, id ASC
        `
      );
    }

    return res.json({
      success: true,
      messages: result.rows.map((row) => ({
        id: row.id,
        userLogin: row.user_login,
        author: row.author,
        text: row.text,
        readByUser: Boolean(row.read_by_user),
        readByAdmin: Boolean(row.read_by_admin),
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error(
      "GET /api/messages failed:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Ошибка загрузки сообщений",
    });
  }
});

/*
|--------------------------------------------------------------------------
| POST /api/messages
|--------------------------------------------------------------------------
*/

app.post("/api/messages", async (req, res) => {
  try {
    const userLogin = String(
      req.body?.userLogin || ""
    ).trim();

    const author = String(
      req.body?.author || ""
    ).trim();

    const text = String(
      req.body?.text || ""
    ).trim();

    if (!userLogin || !text) {
      return res.status(400).json({
        success: false,
        message: "Не указан пользователь или текст",
      });
    }

    if (author !== "user" && author !== "admin") {
      return res.status(400).json({
        success: false,
        message: "Некорректный автор",
      });
    }

    const id = crypto.randomUUID();

    const readByUser =
      req.body?.readByUser === true;

    const readByAdmin =
      req.body?.readByAdmin === true;

    const result = await pgQuery(
      `
      INSERT INTO messages (
        id,
        user_login,
        author,
        text,
        read_by_user,
        read_by_admin,
        created_at,
        raw
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, NOW(), $7::jsonb
      )
      RETURNING
        id,
        user_login,
        author,
        text,
        read_by_user,
        read_by_admin,
        created_at
      `,
      [
        id,
        userLogin,
        author,
        text,
        readByUser,
        readByAdmin,
        JSON.stringify(req.body?.raw ?? {}),
      ]
    );

    const row = result.rows[0];

    return res.status(201).json({
      success: true,
      message: {
        id: row.id,
        userLogin: row.user_login,
        author: row.author,
        text: row.text,
        readByUser: Boolean(row.read_by_user),
        readByAdmin: Boolean(row.read_by_admin),
        createdAt: row.created_at,
      },
    });
  } catch (error) {
    console.error(
      "POST /api/messages failed:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Ошибка создания сообщения",
    });
  }
});

/*
|--------------------------------------------------------------------------
| TRADE-IN API
|--------------------------------------------------------------------------
*/

function mapTradeInRow(row) {
  return {
    id: row.id,
    title: row.title || "",
    description: row.description || "",
    price: Number(row.price || 0),
    memory: row.memory || "",
    color: row.color || "",
    condition: row.condition || "",
    warranty: row.warranty || "",
    images: Array.isArray(row.images)
      ? row.images
      : [],
    status:
      row.status === "sold"
        ? "sold"
        : "available",
    createdAt: row.created_at
      ? new Date(
          row.created_at
        ).toISOString()
      : null,
  };
}

/*
|--------------------------------------------------------------------------
| GET /api/trade-in
|--------------------------------------------------------------------------
*/

app.get("/api/trade-in", async (req, res) => {
  try {
    const result = await pgQuery(`
      SELECT
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
      FROM trade_in
      ORDER BY created_at DESC NULLS LAST, id DESC
    `);

    return res.json({
      success: true,
      products:
        result.rows.map(
          mapTradeInRow
        ),
    });
  } catch (error) {
    console.error(
      "GET /api/trade-in failed:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Ошибка загрузки Trade-In",
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET /api/trade-in/:id
|--------------------------------------------------------------------------
*/

app.get(
  "/api/trade-in/:id",
  async (req, res) => {
    try {
      const result =
        await pgQuery(
          `
          SELECT
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
          FROM trade_in
          WHERE id = $1
          LIMIT 1
          `,
          [req.params.id]
        );

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Устройство не найдено",
        });
      }

      return res.json({
        success: true,
        product:
          mapTradeInRow(
            result.rows[0]
          ),
      });
    } catch (error) {
      console.error(
        "GET /api/trade-in/:id failed:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка загрузки устройства",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| POST /api/trade-in
|--------------------------------------------------------------------------
*/

app.post(
  "/api/trade-in",
  async (req, res) => {
    try {
      const {
        title,
        description,
        price,
        memory,
        color,
        condition,
        warranty,
        images,
        status,
        createdAt,
      } = req.body || {};

      const cleanTitle =
        String(title || "").trim();

      if (!cleanTitle) {
        return res.status(400).json({
          success: false,
          message:
            "Введите название устройства",
        });
      }

      const cleanImages =
        Array.isArray(images)
          ? images
              .map((image) =>
                String(image).trim()
              )
              .filter(Boolean)
          : [];

      const id = crypto.randomUUID();

      const result =
        await pgQuery(
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
            COALESCE($11::timestamptz, NOW())
          )
          RETURNING
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
          `,
          [
            id,
            cleanTitle,
            String(
              description || ""
            ),
            Number(price || 0),
            String(memory || ""),
            String(color || ""),
            String(
              condition || ""
            ),
            String(
              warranty || ""
            ),
            JSON.stringify(
              cleanImages
            ),
            status === "sold"
              ? "sold"
              : "available",
            createdAt
              ? new Date(
                  createdAt
                )
              : null,
          ]
        );

      return res.status(201).json({
        success: true,
        product:
          mapTradeInRow(
            result.rows[0]
          ),
      });
    } catch (error) {
      console.error(
        "POST /api/trade-in failed:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка создания Trade-In",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| PATCH /api/trade-in/:id
|--------------------------------------------------------------------------
*/
app.patch(
  "/api/trade-in/:id",
  async (req, res) => {
    try {
      const fields = [];
      const values = [];
      let index = 1;

      const allowedFields = {
        title: "title",
        description: "description",
        price: "price",
        memory: "memory",
        color: "color",
        condition: "condition",
        warranty: "warranty",
        images: "images",
        status: "status",
      };

      for (const [
        key,
        column,
      ] of Object.entries(
        allowedFields
      )) {
        if (
          req.body?.[key] ===
          undefined
        ) {
          continue;
        }

        let value =
          req.body[key];

        if (key === "images") {
          value = JSON.stringify(
            Array.isArray(value)
              ? value
                  .map((image) =>
                    String(image).trim()
                  )
                  .filter(Boolean)
              : []
          );

          fields.push(
            `${column} = $${index}::jsonb`
          );
        } else if (
          key === "price"
        ) {
          value = Number(value);
          fields.push(
            `${column} = $${index}`
          );
        } else if (
          key === "status"
        ) {
          value =
            value === "sold"
              ? "sold"
              : "available";

          fields.push(
            `${column} = $${index}`
          );
        } else {
          value = String(
            value ?? ""
          );

          fields.push(
            `${column} = $${index}`
          );
        }

        values.push(value);
        index += 1;
      }

      if (fields.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "Нет данных для обновления",
        });
      }

      values.push(
        req.params.id
      );

      const result =
        await pgQuery(
          `
          UPDATE trade_in
          SET ${fields.join(", ")}
          WHERE id = $${index}
          RETURNING
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
          `,
          values
        );

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Устройство не найдено",
        });
      }

      return res.json({
        success: true,
        product:
          mapTradeInRow(
            result.rows[0]
          ),
      });
    } catch (error) {
      console.error(
        "PATCH /api/trade-in/:id failed:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка обновления Trade-In",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| DELETE /api/trade-in/:id
|--------------------------------------------------------------------------
*/

app.delete(
  "/api/trade-in/:id",
  async (req, res) => {
    try {
      const result =
        await pgQuery(
          `
          DELETE FROM trade_in
          WHERE id = $1
          RETURNING id
          `,
          [req.params.id]
        );

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Устройство не найдено",
        });
      }

      return res.json({
        success: true,
        id: result.rows[0].id,
      });
    } catch (error) {
      console.error(
        "DELETE /api/trade-in/:id failed:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка удаления Trade-In",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| PATCH /api/messages/:id/read
|--------------------------------------------------------------------------
*/

app.patch(
  "/api/messages/:id/read",
  async (req, res) => {
    try {
      const field =
        req.body?.field === "readByAdmin"
          ? "read_by_admin"
          : req.body?.field === "readByUser"
          ? "read_by_user"
          : null;

      if (!field) {
        return res.status(400).json({
          success: false,
          message:
            "Поле прочитанности не указано",
        });
      }

      const result = await pgQuery(
        `
        UPDATE messages
        SET ${field} = TRUE
        WHERE id = $1
        RETURNING
          id,
          user_login,
          author,
          text,
          read_by_user,
          read_by_admin,
          created_at
        `,
        [req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Сообщение не найдено",
        });
      }

      const row = result.rows[0];

      return res.json({
        success: true,
        message: {
          id: row.id,
          userLogin: row.user_login,
          author: row.author,
          text: row.text,
          readByUser: Boolean(
            row.read_by_user
          ),
          readByAdmin: Boolean(
            row.read_by_admin
          ),
          createdAt: row.created_at,
        },
      });
    } catch (error) {
      console.error(
        "PATCH /api/messages/:id/read failed:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка обновления прочитанности",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| DELETE /api/messages/chat/:userLogin
|--------------------------------------------------------------------------
*/

app.delete(
  "/api/messages/chat/:userLogin",
  async (req, res) => {
    try {
      const userLogin =
        req.params.userLogin.trim();

      if (!userLogin) {
        return res.status(400).json({
          success: false,
          message:
            "Не указан пользователь",
        });
      }

      const result = await pgQuery(
        `
        DELETE FROM messages
        WHERE user_login = $1
        `,
        [userLogin]
      );

      return res.json({
        success: true,
        deleted: result.rowCount || 0,
      });
    } catch (error) {
      console.error(
        "DELETE /api/messages/chat/:userLogin failed:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Ошибка удаления чата",
      });
    }
  }
);


/*
|--------------------------------------------------------------------------
| Авторизация 1С
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

async function findClientByPhone(phone) {
  const normalizedPhone = normalizePhone(phone);

  const result = await pgQuery(
    `
    SELECT
      id,
      name,
      phone,
      login,
      points,
      bonuses,
      orders,
      status,
      role,
      address,
      birth_day,
      passport_details,
      onec_customer_id
    FROM clients
    WHERE
      regexp_replace(phone, '\\D', '', 'g') =
      regexp_replace($1, '\\D', '', 'g')
    LIMIT 1
    `,
    [normalizedPhone]
  );

  return result.rows.length > 0
    ? result.rows[0]
    : null;
}

/*
|--------------------------------------------------------------------------
| GET /api/1c/test
|
| Проверка подключения 1С → Render API
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
| GET /api/1c/health
|
| Проверка связи Production API → 1С
|--------------------------------------------------------------------------
*/

app.get(
  "/api/1c/health",
  async (req, res) => {
    try {
      const result =
        await checkOneCHealth();

      res.json({
        success: true,

        oneC: result,

        serverTime:
          new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        "Ошибка проверки 1С:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          "Не удалось подключиться к 1С",

        error:
          error?.message ||
          String(error),
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET /api/1c/customer?phone=
|
| Получение клиента из 1С
| + синхронизация с Firebase
|--------------------------------------------------------------------------
*/

app.get(
  "/api/1c/customer",
  async (req, res) => {
    try {
      const phone =
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

      /*
      |--------------------------------------------------------------------------
      | 1. Получаем клиента из 1С
      |--------------------------------------------------------------------------
      */

      const customer =
        await getOneCCustomer(phone);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message:
            "Клиент не найден в 1С",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | 2. Нормализуем данные
      |--------------------------------------------------------------------------
      */

      const normalizedPhone =
        normalizePhone(
          customer.phone || phone
        );

      const points =
        Number(
          customer.bonusBalance || 0
        );

      const address =
        String(
          customer.address || ""
        ).trim();

      const passportDetails =
        String(
          customer.passportDetails || ""
        ).trim();

      /*
      |--------------------------------------------------------------------------
      | Дата рождения
      |
      | 1С может отдавать:
      | 0001-01-01T00:00:00
      |
      | Такое значение считаем отсутствующим.
      |--------------------------------------------------------------------------
      */

      let birthDay = null;

      if (
        customer.birthDay &&
        !String(
          customer.birthDay
        ).startsWith("0001-01-01")
      ) {
        birthDay =
          customer.birthDay;
      }

      /*
      |--------------------------------------------------------------------------
      | 3. Ищем существующего клиента Firebase
      |--------------------------------------------------------------------------
      */

      const clientDoc =
        await findClientByPhone(
          normalizedPhone
        );

      /*
      |--------------------------------------------------------------------------
      | 4. Если клиент уже существует
      |--------------------------------------------------------------------------
      */

      if (clientDoc) {
        const clientData =
          clientDoc.data();

        const updateData = {
          /*
          |--------------------------------------------------------------------------
          | Актуальный баланс из 1С
          |--------------------------------------------------------------------------
          */

          points,

          bonuses: points,

          /*
          |--------------------------------------------------------------------------
          | Данные из 1С
          |--------------------------------------------------------------------------
          */

          address,

          birthDay,

          passportDetails,

          /*
          |--------------------------------------------------------------------------
          | Технические поля
          |--------------------------------------------------------------------------
          */

          oneCSyncedAt:
            Timestamp.now(),

          updatedFrom1C:
            Timestamp.now(),
        };

        /*
        |--------------------------------------------------------------------------
        | Если телефон в Firebase записан в другом формате,
        | приводим его к нормальному виду.
        |--------------------------------------------------------------------------
        */

        if (
          normalizedPhone &&
          clientData.phone !==
            normalizedPhone
        ) {
          updateData.phone =
             normalizedPhone;
        }

        /*
        |--------------------------------------------------------------------------
        | Обновляем ТОЛЬКО нужные поля.
        |
        | login
        | orders
        | role
        | source
        | status
        | welcomeBonus
        | createdAt
        |
        | остаются нетронутыми.
        |--------------------------------------------------------------------------
        */

        await clientDoc.ref.update(
          updateData
        );

        console.log(
          `1С → Firebase: клиент обновлён ${clientDoc.id}`
        );

        return res.json({
          success: true,

          action: "updated",

          clientId:
            clientDoc.id,

          customer: {
            id:
              clientDoc.id,

            name:
              customer.name ||
              clientData.name ||
              "",

            phone:

              normalizedPhone,

            bonusBalance:
              points,

            birthDay,

            address,

            passportDetails,
          },
        });
      }

      /*
      |--------------------------------------------------------------------------
      | 5. Если клиента нет — создаём нового
      |--------------------------------------------------------------------------
      */

      const clientRef =
        db.collection("clients").doc();

      const now =
        Timestamp.now();

      const newClient = {
        /*
        |--------------------------------------------------------------------------
        | Основные данные
        |--------------------------------------------------------------------------
        */

        name:
          customer.name || "",

        phone:

          normalizedPhone,

        login:
          "",

        points,

        bonuses: points,

        orders: 0,

        /*
        |--------------------------------------------------------------------------
        | Данные из 1С
        |--------------------------------------------------------------------------
        */

        address,

        birthDay,

        passportDetails,

        /*
        |--------------------------------------------------------------------------
        | Данные приложения
        |--------------------------------------------------------------------------
        */

        role:
          "user",

        source:
          "1C",

        status:
          "ACTIVE",

        welcomeBonus:
          false,

        /*
        |--------------------------------------------------------------------------
        | Даты
        |--------------------------------------------------------------------------
        */

        createdAt:
          now,

        oneCSyncedAt:
          now,

        updatedFrom1C:
          now,
      };

      await clientRef.set(
        newClient
      );

      console.log(
        `1С → Firebase: создан новый клиент ${clientRef.id}`
      );

      return res.json({
        success: true,

        action: "created",

        clientId:
          clientRef.id,

        customer: {
          id:
            clientRef.id,

          name:
            customer.name || "",

          phone:

            normalizedPhone,

          bonusBalance:
            points,

          birthDay,

          address,

          passportDetails,
        },
      });
    } catch (error) {
      console.error(
        "Ошибка синхронизации клиента 1С → Firebase:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Ошибка получения клиента из 1С",

        error:
          error?.message ||
          String(error),
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET /api/clients/1c
|
| Получение клиента из 1С + синхронизация с PostgreSQL
|--------------------------------------------------------------------------
*/

app.get("/api/clients/1c", async (req, res) => {
  try {
    const rawPhone = String(
      req.query.phone || ""
    ).trim();

    if (!rawPhone) {
      return res.status(400).json({
        success: false,
        message: "Не указан телефон",
      });
    }

    const phone = normalizePhone(rawPhone);

    /*
    |--------------------------------------------------------------------------
    | Получаем клиента из 1С
    |--------------------------------------------------------------------------
    */

    const customer =
      await getOneCCustomer(phone);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Клиент не найден в 1С",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Нормализуем данные клиента
    |--------------------------------------------------------------------------
    */

    const customerPhone =
      normalizePhone(
        customer.phone || phone
      );

    const points = Number(
      customer.bonusBalance ?? 0
    );

    const customerName =
      customer.name || "";

    const birthDay =
      customer.birthDay || null;

    const address =
      customer.address || "";

    /*
    |--------------------------------------------------------------------------
    | Ищем клиента в PostgreSQL
    |--------------------------------------------------------------------------
    */

    const existing =
      await pgQuery(
        `
        SELECT id
        FROM clients
        WHERE phone = $1
        LIMIT 1
        `,
        [customerPhone]
      );

    let client;

    /*
    |--------------------------------------------------------------------------
    | Клиент существует → обновляем
    |--------------------------------------------------------------------------
    */

    if (existing.rows.length > 0) {

      const clientId =
        existing.rows[0].id;

      const result =
        await pgQuery(
          `
          UPDATE clients
          SET
            name = $1,
            phone = $2,
            points = $3,
            bonuses = $4,
            birth_day = $5,
            address = $6,
            source = $7,
            updated_at = NOW()
          WHERE id = $8
          RETURNING *
          `,
          [
            customerName,
            customerPhone,
            points,
            points,
            birthDay,
            address,
            "1C",
            clientId,
          ]
        );

      client = result.rows[0];

    }

    /*
    |--------------------------------------------------------------------------
    | Клиента нет → создаём
    |--------------------------------------------------------------------------
    */

    else {

      const clientId =
        crypto.randomUUID();

      const result =
        await pgQuery(
          `
          INSERT INTO clients (
            id,
            name,
            phone,
            login,
            points,
            bonuses,
            orders,
            status,
            role,
            birth_day,
            address,
            source,
            welcome_bonus,
            created_at,
            updated_at,
            raw
          )
          VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,
            $10,$11,$12,$13,NOW(),NOW(),$14::jsonb
          )
          RETURNING *
          `,
          [
            clientId,
            customerName,
            customerPhone,
            customerName,
            points,
            points,
            0,
            "ACTIVE",
            "user",
            birthDay,
            address,
            "1C",
            false,
            JSON.stringify(customer),
          ]
        );

      client = result.rows[0];

    }

    /*
    |--------------------------------------------------------------------------
    | Возвращаем клиента
    |--------------------------------------------------------------------------
    */

    return res.json({
      success: true,

      client: {
        id: client.id,
        name: client.name || "",
        phone: client.phone || "",
        points: Number(client.points || 0),
        bonuses: Number(
          client.bonuses || 0
        ),
        birthDay:
          client.birth_day || null,
        address:
          client.address || "",
        customerQR:
          customer.customerQR || null,
      },

      source: "1C",
    });

  } catch (error) {

    console.error(
      "Ошибка синхронизации клиента 1С → PostgreSQL:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Ошибка получения клиента из 1С",
      error:
        error?.message ||
        String(error),
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET /api/1c/clients
|
| Получение всех клиентов из PostgreSQL
|--------------------------------------------------------------------------
*/

app.get("/api/1c/clients", async (req, res) => {

  if (!check1CAccess(req, res)) {
    return;
  }

  try {

    const result =
      await pgQuery(
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
          birth_day,
          address,
          created_at,
          updated_at
        FROM clients
        ORDER BY created_at DESC NULLS LAST
        `
      );

    const clients =
      result.rows.map((client) => ({
        id: client.id,

        name:
          client.name || "",

        phone:
          client.phone || "",

        points:
          Number(client.points || 0),

        bonuses:
          Number(client.bonuses || 0),

        orders:
          Number(client.orders || 0),

        status:
          client.status || "NEW CLIENT",

        role:
          client.role || "user",

        birthDay:
          client.birth_day || null,

        address:
          client.address || "",

        createdAt:
          client.created_at
            ? new Date(
                client.created_at
              ).toISOString()
            : null,

        updatedAt:
          client.updated_at
            ? new Date(
                client.updated_at
              ).toISOString()
            : null,
      }));

    return res.json({
      success: true,

      count:
        clients.length,

      clients,
    });

  } catch (error) {

    console.error(
      "Ошибка выгрузки клиентов для 1С:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Ошибка получения клиентов",
      error:
        error?.message ||
        String(error),
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET /api/1c/client?phone=...
|
| Поиск клиента в PostgreSQL
|--------------------------------------------------------------------------
*/

app.get("/api/1c/client", async (req, res) => {

  if (!check1CAccess(req, res)) {
    return;
  }

  try {

    const rawPhone =
      String(
        req.query.phone || ""
      ).trim();

    if (!rawPhone) {

      return res.status(400).json({
        success: false,
        message:
          "Не указан телефон",
      });
    }

    const phone =
      normalizePhone(rawPhone);

    const result =
      await pgQuery(
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
          birth_day,
          address,
          created_at,
          updated_at
        FROM clients
        WHERE phone = $1
        LIMIT 1
        `,
        [phone]
      );

    if (result.rows.length === 0) {

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

        id:
          client.id,

        name:
          client.name || "",

        phone:
          client.phone || "",

        points:
          Number(
            client.points || 0
          ),

        bonuses:
          Number(
            client.bonuses || 0
          ),

        orders:
          Number(
            client.orders || 0
          ),

        status:
          client.status ||
          "NEW CLIENT",

        role:
          client.role ||
          "user",

        birthDay:
          client.birth_day ||
          null,

        address:
          client.address ||
          "",

        createdAt:
          client.created_at
            ? new Date(
                client.created_at
              ).toISOString()
            : null,

        updatedAt:
          client.updated_at
            ? new Date(
                client.updated_at
              ).toISOString()
            : null,
      },
    });

  } catch (error) {

    console.error(
      "Ошибка поиска клиента PostgreSQL:",
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
});

/*
|--------------------------------------------------------------------------
| POST /api/1c/bonus/add
|--------------------------------------------------------------------------
*/

app.post(
  "/api/1c/bonus/add",
  async (req, res) => {

    if (!check1CAccess(req, res)) {
      return;
    }

    try {

      const rawPhone =
        String(
          req.body.phone || ""
        ).trim();

      const points =
        Number(
          req.body.points
        );

      const reason =
        String(
          req.body.reason || ""
        ).trim() ||
        "Начисление бонусов из 1С";

      if (!rawPhone) {

        return res.status(400).json({
          success: false,
          message:
            "Не указан телефон",
        });
      }

      const phone =
        normalizePhone(rawPhone);

      if (
        !Number.isFinite(points) ||
        points <= 0
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Количество бонусов должно быть больше 0",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Находим и обновляем клиента
      |--------------------------------------------------------------------------
      */

      const updateResult =
        await pgQuery(
          `
          UPDATE clients
          SET
            points = COALESCE(points, 0) + $1,
            bonuses = COALESCE(bonuses, 0) + $1,
            updated_at = NOW()
          WHERE phone = $2
          RETURNING *
          `,
          [
            points,
            phone,
          ]
        );

      if (
        updateResult.rows.length === 0
      ) {

        return res.status(404).json({
          success: false,
          message:
            "Клиент не найден",
        });
      }

      const client =
        updateResult.rows[0];

      const newPoints =
        Number(
          client.points || 0
        );

      const previousPoints =
        newPoints - points;

      /*
      |--------------------------------------------------------------------------
      | Записываем операцию
      |--------------------------------------------------------------------------
      */

      await pgQuery(
        `
        INSERT INTO client_operations (
          id,
          client_id,
          type,
          points,
          reason,
          source,
          created_at
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,NOW()
        )
        `,
        [
          crypto.randomUUID(),
          client.id,
          "add",
          points,
          reason,
          "1C",
        ]
      );

      return res.json({
        success: true,

        message:
          "Бонусы начислены",

        client: {
          id:
            client.id,

          name:
            client.name || "",

          phone:
            client.phone || phone,
        },

        operation: {
          type: "add",
          points,
          reason,
        },

        previousPoints,

        points:
          newPoints,

        bonuses:
          Number(
            client.bonuses || 0
          ),
      });

    } catch (error) {

      console.error(
        "Ошибка начисления бонусов из 1С:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка начисления бонусов",
        error:
          error?.message ||
          String(error),
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| POST /api/1c/bonus/remove
|--------------------------------------------------------------------------
*/

app.post(
  "/api/1c/bonus/remove",
  async (req, res) => {

    if (!check1CAccess(req, res)) {
      return;
    }

    try {

      const rawPhone =
        String(
          req.body.phone || ""
        ).trim();

      const points =
        Number(
          req.body.points
        );

      const reason =
        String(
          req.body.reason || ""
        ).trim() ||
        "Списание бонусов из 1С";

      if (!rawPhone) {

        return res.status(400).json({
          success: false,
          message:
            "Не указан телефон",
        });
      }

      const phone =
        normalizePhone(rawPhone);

      if (
        !Number.isFinite(points) ||
        points <= 0
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Количество бонусов должно быть больше 0",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Получаем клиента
      |--------------------------------------------------------------------------
      */

      const clientResult =
        await pgQuery(
          `
          SELECT *
          FROM clients
          WHERE phone = $1
          LIMIT 1
          `,
          [phone]
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

      const existingClient =
        clientResult.rows[0];

      const currentPoints =
        Number(
          existingClient.points || 0
        );

      if (
        points > currentPoints
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Недостаточно бонусов",

          points:
            currentPoints,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Списываем бонусы
      |--------------------------------------------------------------------------
      */

      const updateResult =
        await pgQuery(
          `
          UPDATE clients
          SET
            points = COALESCE(points, 0) - $1,
            bonuses = COALESCE(bonuses, 0) - $1,
            updated_at = NOW()
          WHERE id = $2
          RETURNING *
          `,
          [
            points,
            existingClient.id,
          ]
        );

      const client =
        updateResult.rows[0];

      /*
      |--------------------------------------------------------------------------
      | Сохраняем операцию
      |--------------------------------------------------------------------------
      */

      await pgQuery(
        `
        INSERT INTO client_operations (
          id,
          client_id,
          type,
          points,
          reason,
          source,
          created_at
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,NOW()
        )
        `,
        [
          crypto.randomUUID(),
          client.id,
          "remove",
          points,
          reason,
          "1C",
        ]
      );

      return res.json({
        success: true,

        message:
          "Бонусы списаны",

        client: {
          id:
            client.id,

          name:
            client.name || "",

          phone:
            client.phone || phone,
        },

        operation: {
          type: "remove",
          points,
          reason,
        },

        previousPoints:
          currentPoints,

        points:
          Number(
            client.points || 0
          ),

        bonuses:
          Number(
            client.bonuses || 0
          ),
      });

    } catch (error) {

      console.error(
        "Ошибка списания бонусов из 1С:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка списания бонусов",
        error:
          error?.message ||
          String(error),
      });
    }
  }
);
/*
|--------------------------------------------------------------------------
| MOYSKLAD → POSTGRESQL
|
| Синхронизация товаров
|--------------------------------------------------------------------------
*/

let syncInProgress = false;

async function upsertProductToPostgres(product) {

  const normalized = {

    id:
      String(product.id),

    title:
      product.title ||
      product.name ||
      "",

    name:
      product.name ||
      product.title ||
      "",

    price:
      Number(product.price || 0),

    images:
      Array.isArray(product.images)
        ? product.images
        : [],

    /*
    |--------------------------------------------------------------------------
    | Категории
    |--------------------------------------------------------------------------
    */

    category:
      product.category || "",

    categoryGroup:
      product.categoryGroup || null,

    categoryPath:
      Array.isArray(product.categoryPath)
        ? product.categoryPath
        : [],

    categoryLeaf:
      product.categoryLeaf || null,

    /*
    |--------------------------------------------------------------------------
    | Основная информация
    |--------------------------------------------------------------------------
    */

    badge:
      product.badge == null
        ? null
        : String(product.badge),

    rating:
      Number(product.rating || 0),

    reviews:
      Number(product.reviews || 0),

    delivery:
      product.delivery ||
      "Уточняется",

    /*
    |--------------------------------------------------------------------------
    | Остатки
    |--------------------------------------------------------------------------
    */

    inStock:
      Boolean(product.inStock),

    stock:
      Number(product.stock || 0),

    reserve:
      Number(product.reserve || 0),

    inTransit:
      Number(product.inTransit || 0),

    quantity:
      Number(product.quantity || 0),

    /*
    |--------------------------------------------------------------------------
    | Описание
    |--------------------------------------------------------------------------
    */

    description:
      product.description || "",

    memory:
      product.memory || "",

    color:
      product.color || "",

    warranty:
      product.warranty || "",

    type:
      product.type || null,

    product:
      product.product == null
        ? null
        : String(product.product),

    characteristics:
      Array.isArray(product.characteristics)
        ? product.characteristics
        : [],

    variantsCount:
      Number(product.variantsCount || 0),

    weight:
      product.weight == null
        ? null
        : Number(product.weight),

    volume:
      product.volume == null
        ? null
        : Number(product.volume),

    /*
    |--------------------------------------------------------------------------
    | Идентификаторы
    |--------------------------------------------------------------------------
    */

    article:
      product.article || null,

    code:
      product.code || null,

    externalCode:
      product.externalCode || null,

    barcode:
      product.barcode || null,

    /*
    |--------------------------------------------------------------------------
    | Статусы
    |--------------------------------------------------------------------------
    */

    archived:
      Boolean(product.archived),

    /*
    ВАЖНО:
    hidden приходит из PostgreSQL,
    чтобы МойСклад не отменял ручное
    скрытие товара администратором.
    */

    hidden:
      Boolean(product.hidden),

    buyPrice:
      product.buyPrice == null
        ? null
        : Number(product.buyPrice),

    syncedAt:
      new Date(),
  };


  /*
  |--------------------------------------------------------------------------
  | INSERT / UPDATE
  |--------------------------------------------------------------------------
  */

  await pgQuery(
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

      synced_at,

      raw

    )

    VALUES (

      $1,

      $2,
      $3,
      $4,

      $5::jsonb,

      $6,
      $7,
      $8::jsonb,
      $9,

      $10,
      $11,
      $12,
      $13,

      $14,
      $15,
      $16,
      $17,
      $18,

      $19,
      $20,
      $21,
      $22,

      $23,
      $24,

      $25::jsonb,
      $26,

      $27,
      $28,

      $29,
      $30,
      $31,
      $32,

      $33,
      $34,

      $35,

      $36,

      $37::jsonb

    )

    ON CONFLICT (id)
    DO UPDATE SET

      title =
        EXCLUDED.title,

      name =
        EXCLUDED.name,

      price =
        EXCLUDED.price,

      images =
        EXCLUDED.images,

      category =
        EXCLUDED.category,

      category_group =
        EXCLUDED.category_group,

      category_path =
        EXCLUDED.category_path,

      category_leaf =
        EXCLUDED.category_leaf,

      badge =
        EXCLUDED.badge,

      rating =
        EXCLUDED.rating,

      reviews =
        EXCLUDED.reviews,

      delivery =
        EXCLUDED.delivery,

      in_stock =
        EXCLUDED.in_stock,

      stock =
        EXCLUDED.stock,

      reserve =
        EXCLUDED.reserve,

      in_transit =
        EXCLUDED.in_transit,

      quantity =
        EXCLUDED.quantity,

      description =
        EXCLUDED.description,

      memory =
        EXCLUDED.memory,

      color =
        EXCLUDED.color,

      warranty =
        EXCLUDED.warranty,

      type =
        EXCLUDED.type,

      product =
        EXCLUDED.product,

      characteristics =
        EXCLUDED.characteristics,

      variants_count =
        EXCLUDED.variants_count,

      weight =
        EXCLUDED.weight,

      volume =
        EXCLUDED.volume,

      article =
        EXCLUDED.article,

      code =
        EXCLUDED.code,

      external_code =
        EXCLUDED.external_code,

      barcode =
        EXCLUDED.barcode,

      archived =
        EXCLUDED.archived,

      /*
      hidden сохраняем из PostgreSQL
      */

      hidden =
        products.hidden,

      buy_price =
        EXCLUDED.buy_price,

      synced_at =
        EXCLUDED.synced_at,

      raw =
        EXCLUDED.raw,

      updated_at =
        NOW()

    `,
    [

      normalized.id,

      normalized.title,
      normalized.name,
      normalized.price,

      JSON.stringify(
        normalized.images
      ),

      normalized.category,
      normalized.categoryGroup,

      JSON.stringify(
        normalized.categoryPath
      ),

      normalized.categoryLeaf,

      normalized.badge,
      normalized.rating,
      normalized.reviews,
      normalized.delivery,

      normalized.inStock,
      normalized.stock,
      normalized.reserve,
      normalized.inTransit,
      normalized.quantity,

      normalized.description,
      normalized.memory,
      normalized.color,
      normalized.warranty,

      normalized.type,
      normalized.product,

      JSON.stringify(
        normalized.characteristics
      ),

      normalized.variantsCount,

      normalized.weight,
      normalized.volume,

      normalized.article,
      normalized.code,
      normalized.externalCode,
      normalized.barcode,

      normalized.archived,
      normalized.hidden,

      normalized.buyPrice,

      normalized.syncedAt,

      JSON.stringify(product),

    ]
  );
}


async function syncMoySkladToPostgres() {

  /*
  |--------------------------------------------------------------------------
  | Защита от параллельной синхронизации
  |--------------------------------------------------------------------------
  */

  if (syncInProgress) {

    console.log(
      "Синхронизация уже выполняется. Новый запуск пропущен."
    );

    return {
      success: false,
      skipped: true,
      message:
        "Синхронизация уже выполняется",
    };
  }


  syncInProgress = true;


  console.log("");
  console.log(
    "======================================"
  );
  console.log(
    "MOYSKLAD → POSTGRESQL: СИНХРОНИЗАЦИЯ"
  );
  console.log(
    "======================================"
  );


  try {

    /*
    |--------------------------------------------------------------------------
    | Получаем товары
    |--------------------------------------------------------------------------
    */

    console.log(
      "1. Получаем товары из МойСклад..."
    );

    const moySkladProducts =
      await getProducts();


    console.log(
      `2. Получено товаров: ${moySkladProducts.length}`
    );


    let created = 0;
    let updated = 0;
    let skipped = 0;


    /*
    |--------------------------------------------------------------------------
    | Обрабатываем товары
    |--------------------------------------------------------------------------
    */

    for (
      const product of moySkladProducts
    ) {

      try {

        /*
        |--------------------------------------------------------------------------
        | Проверяем ID
        |--------------------------------------------------------------------------
        */

        if (!product.id) {

          console.log(
            "Пропущен товар без ID:",
            product.name ||
            product.title
          );

          skipped++;

          continue;
        }


        const productId =
          String(product.id);


        /*
        |--------------------------------------------------------------------------
        | Проверяем существование товара
        |--------------------------------------------------------------------------
        */

        const existingResult =
          await pgQuery(
            `
            SELECT
              id,
              hidden
            FROM products
            WHERE id = $1
            LIMIT 1
            `,
            [
              productId
            ]
          );


        const exists =
          existingResult.rows.length > 0;


        /*
        |--------------------------------------------------------------------------
        | Получаем hidden из PostgreSQL
        |
        | МойСклад НЕ имеет права
        | менять ручное скрытие товара.
        |--------------------------------------------------------------------------
        */

        const existingHidden =
          exists
            ? Boolean(
                existingResult.rows[0].hidden
              )
            : false;


        /*
        |--------------------------------------------------------------------------
        | Остатки
        |--------------------------------------------------------------------------
        */

        const stock =
          Number(
            product.stock || 0
          );


        const quantity =
          Number(
            product.quantity || 0
          );


        /*
        |--------------------------------------------------------------------------
        | Формируем товар для PostgreSQL
        |--------------------------------------------------------------------------
        */

        const postgresProduct = {

          id:
            productId,


          /*
          ------------------------------------------------------------------
          Название
          ------------------------------------------------------------------
          */

          title:
            product.title ||
            product.name ||
            "",

          name:
            product.name ||
            product.title ||
            "",


          /*
          ------------------------------------------------------------------
          Цена
          ------------------------------------------------------------------
          */

          price:
            Number(
              product.price || 0
            ),


          /*
          ------------------------------------------------------------------
          Изображения
          ------------------------------------------------------------------
          */

          images:
            Array.isArray(product.images)
              ? product.images
              : [],


          /*
          ------------------------------------------------------------------
          Категории
          ------------------------------------------------------------------
          */

          category:
            product.category || "",

          categoryGroup:
            product.categoryGroup ||
            null,

          categoryPath:
            Array.isArray(
              product.categoryPath
            )
              ? product.categoryPath
              : [],

          categoryLeaf:
            product.categoryLeaf ||
            null,


          /*
          ------------------------------------------------------------------
          Дополнительно
          ------------------------------------------------------------------
          */

          badge:
            product.badge ||
            null,

          rating:
            Number(
              product.rating || 0
            ),

          reviews:
            Number(
              product.reviews || 0
            ),

          delivery:
            product.delivery ||
            "Уточняется",


          /*
          ------------------------------------------------------------------
          Остатки
          ------------------------------------------------------------------
          */

          stock,

          reserve:
            Number(
              product.reserve || 0
            ),

          inTransit:
            Number(
              product.inTransit || 0
            ),

          quantity,


          /*
          ВАЖНО

          Товар считается доступным,
          если есть stock ИЛИ quantity.
          */

          inStock:
            stock > 0 ||
            quantity > 0,


          /*
          ------------------------------------------------------------------
          Описание
          ------------------------------------------------------------------
          */

          description:
            product.description ||
            "",

          memory:
            product.memory ||
            "",

          color:
            product.color ||
            "",

          warranty:
            product.warranty ||
            "",


          /*
          ------------------------------------------------------------------
          Тип товара
          ------------------------------------------------------------------
          */

          type:
            product.type ||
            null,

          product:
            product.product ||
            null,


          /*
          ------------------------------------------------------------------
          Характеристики
          ------------------------------------------------------------------
          */

          characteristics:
            Array.isArray(
              product.characteristics
            )
              ? product.characteristics
              : [],

          variantsCount:
            Number(
              product.variantsCount || 0
            ),


          /*
          ------------------------------------------------------------------
          Вес / объём
          ------------------------------------------------------------------
          */

          weight:
            product.weight == null
              ? null
              : Number(
                  product.weight
                ),

          volume:
            product.volume == null
              ? null
              : Number(
                  product.volume
                ),


          /*
          ------------------------------------------------------------------
          Артикулы
          ------------------------------------------------------------------
          */

          article:
            product.article ||
            null,

          code:
            product.code ||
            null,

          externalCode:
            product.externalCode ||
            null,

          barcode:
            product.barcode ||
            null,


          /*
          ------------------------------------------------------------------
          Статусы
          ------------------------------------------------------------------
          */

          archived:
            Boolean(
              product.archived
            ),


          /*
          ВАЖНО

          hidden сохраняем из PostgreSQL.
          */

          hidden:
            existingHidden,


          /*
          ------------------------------------------------------------------
          Закупочная цена
          ------------------------------------------------------------------
          */

          buyPrice:
            product.buyPrice == null
              ? null
              : Number(
                  product.buyPrice
                ),
        };


        /*
        |--------------------------------------------------------------------------
        | Сохраняем товар
        |--------------------------------------------------------------------------
        */

        await upsertProductToPostgres(
          postgresProduct
        );


        /*
        |--------------------------------------------------------------------------
        | Логируем результат
        |--------------------------------------------------------------------------
        */

        if (exists) {

          updated++;

          console.log(
            `✓ Обновлён: ${postgresProduct.name}`
          );

        } else {

          created++;

          console.log(
            `+ Создан: ${postgresProduct.name}`
          );

        }


      } catch (productError) {

        skipped++;


        console.error(
          `✗ Ошибка товара ${
            product.name ||
            product.title ||
            product.id
          }:`,
          productError?.message ||
          productError
        );

      }

    }


    /*
    |--------------------------------------------------------------------------
    | Итог
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log(
      "======================================"
    );

    console.log(
      "СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА"
    );

    console.log(
      "======================================"
    );

    console.log(
      `Всего из МойСклад: ${moySkladProducts.length}`
    );

    console.log(
      `Создано: ${created}`
    );

    console.log(
      `Обновлено: ${updated}`
    );

    console.log(
      `Пропущено: ${skipped}`
    );

    console.log(
      "======================================"
    );


    return {

      success: true,

      moySkladCount:
        moySkladProducts.length,

      created,

      updated,

      skipped,

    };


  } catch (error) {

    console.error(
      "Ошибка синхронизации МойСклад → PostgreSQL:",
      error?.response?.data ||
      error?.message ||
      error
    );


    throw error;


  } finally {

    /*
    Всегда снимаем блокировку.
    Даже если произошла ошибка.
    */

    syncInProgress = false;

  }
}
/*
|--------------------------------------------------------------------------
| GET /api/moysklad/products
|
| Ручной запуск синхронизации
|--------------------------------------------------------------------------
*/

app.get(
  "/api/moysklad/products",
  async (req, res) => {
    try {
      const result =
        await syncMoySkladToPostgres();

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          "Ошибка синхронизации товаров",
        error:
          error?.message ||
          String(error),
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| АВТОМАТИЧЕСКАЯ СИНХРОНИЗАЦИЯ
|
| Каждые 30 минут
|--------------------------------------------------------------------------
*/

const ONE_C_SYNC_INTERVAL = 24 * 60 * 60 * 1000;

async function startOneCDailySync() {
  console.log("1С: ежедневная синхронизация клиентов запущена");

  const run = async () => {
    try {
      console.log("");
      console.log("======================================");
      console.log("1С: НАЧАЛО СУТОЧНОЙ СИНХРОНИЗАЦИИ");
      console.log("======================================");

      const customers = await getAllOneCCustomers();

      console.log(
        `1С: получено клиентов: ${customers.length}`
      );

      const BATCH_SIZE = 50;

      let totalSynced = 0;
      let totalCreated = 0;
      let totalUpdated = 0;
      let totalOperations = 0;

      for (
        let i = 0;
        i < customers.length;
        i += BATCH_SIZE
      ) {
        const batch = customers.slice(
          i,
          i + BATCH_SIZE
        );

        const batchNumber =
          Math.floor(i / BATCH_SIZE) + 1;

        const totalBatches =
          Math.ceil(
            customers.length / BATCH_SIZE
          );

        console.log(
          `1С: обработка пачки ${batchNumber}/${totalBatches}`
        );

        const result =
          await syncCustomersToPostgres(batch);

        totalSynced += result.synced || 0;
        totalCreated += result.created || 0;
        totalUpdated += result.updated || 0;
        totalOperations +=
          result.operations || 0;

        console.log(
          `1С: пачка ${batchNumber}/${totalBatches} завершена`,
          result
        );
      }

      console.log("");
      console.log("======================================");
      console.log("1С: СУТОЧНАЯ СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА");
      console.log("======================================");

      console.log({
        synced: totalSynced,
        created: totalCreated,
        updated: totalUpdated,
        operations: totalOperations,
      });

    } catch (error) {
      console.error(
        "1С: ОШИБКА СУТОЧНОЙ СИНХРОНИЗАЦИИ:",
        error?.message || error
      );
    }
  };

  // Синхронизация сразу после запуска Render
  await run();

  // Затем один раз в 24 часа
  setInterval(
    run,
    ONE_C_SYNC_INTERVAL
  );
}

const SYNC_INTERVAL =
  30 * 60 * 1000;

async function startAutoSync() {
  console.log(
    "Запускаем первоначальную синхронизацию..."
  );

  try {
    await syncMoySkladToPostgres();
  } catch (error) {
    console.error(
      "Первоначальная синхронизация не удалась:",
      error?.message ||
        error
    );
  }

  setInterval(
    async () => {
      console.log("");
      console.log(
        "⏰ Прошло 30 минут. Запускаем автоматическую синхронизацию..."
      );

      try {
        await syncMoySkladToPostgres();
      } catch (error) {
        console.error(
          "Автоматическая синхронизация завершилась ошибкой:",
          error?.message ||
            error
        );
      }
    },
    SYNC_INTERVAL
  );
}

/*
|--------------------------------------------------------------------------
| PostgreSQL products API
|--------------------------------------------------------------------------
*/

function mapPostgresProduct(row) {
  return {
    id: row.id,
    title: row.title ?? row.name ?? "",
    name: row.name ?? row.title ?? "",
    price: Number(row.price ?? 0),
    images: Array.isArray(row.images) ? row.images : [],
    category: row.category ?? "",
    categoryGroup: row.category_group ?? null,
    categoryPath: Array.isArray(row.category_path)
      ? row.category_path
      : [],
    categoryLeaf: row.category_leaf ?? null,
    badge: row.badge ?? null,
    rating: Number(row.rating ?? 0),
    reviews: Number(row.reviews ?? 0),
    delivery: row.delivery ?? "Уточняется",
    inStock: Boolean(row.in_stock),
    stock: Number(row.stock ?? 0),
    reserve: Number(row.reserve ?? 0),
    inTransit: Number(row.in_transit ?? 0),
    quantity: Number(row.quantity ?? 0),
    description: row.description ?? "",
    memory: row.memory ?? "",
    color: row.color ?? "",
    warranty: row.warranty ?? "",
    type: row.type ?? null,
    product: row.product ?? null,
    characteristics: Array.isArray(row.characteristics)
      ? row.characteristics
      : [],
    variantsCount: Number(row.variants_count ?? 0),
    weight: row.weight == null ? null : Number(row.weight),
    volume: row.volume == null ? null : Number(row.volume),
    article: row.article ?? null,
    code: row.code ?? null,
    externalCode: row.external_code ?? null,
    barcode: row.barcode ?? null,
    archived: Boolean(row.archived),
    updated: row.updated_at
      ? new Date(row.updated_at).toISOString()
      : null,
    hidden: Boolean(row.hidden),
    buyPrice:
      row.buy_price == null ? null : Number(row.buy_price),
    syncedAt: row.synced_at
      ? new Date(row.synced_at).toISOString()
      : null,
  };
}

const PRODUCT_COLUMNS = `
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
  updated_at,
  hidden,
  buy_price,
  synced_at
`;

/*
|--------------------------------------------------------------------------
| PRODUCTS CRUD
|--------------------------------------------------------------------------
*/

function mapProductRow(row) {
  return {
    id: row.id,
    title: row.title || "",
    name: row.name || row.title || "",
    price: Number(row.price || 0),
    images: Array.isArray(row.images) ? row.images : [],
    category: row.category || "",
    categoryGroup: row.category_group || null,
    categoryPath: Array.isArray(row.category_path)
      ? row.category_path
      : [],
    categoryLeaf: row.category_leaf || null,
    badge:
      row.badge === "Хит" ||
      row.badge === "Новинка" ||
      row.badge === "Акция"
        ? row.badge
        : undefined,
    rating: Number(row.rating || 0),
    reviews: Number(row.reviews || 0),
    delivery: row.delivery || "Уточняется",
    inStock: Boolean(row.in_stock),
    stock: Number(row.stock || 0),
    reserve: Number(row.reserve || 0),
    inTransit: Number(row.in_transit || 0),
    quantity: Number(row.quantity || 0),
    description: row.description || "",
    memory: row.memory || "",
    color: row.color || "",
    warranty: row.warranty || "",
    type: row.type || null,
    product: row.product || null,
    characteristics: Array.isArray(row.characteristics)
      ? row.characteristics
      : [],
    variantsCount: Number(row.variants_count || 0),
    weight:
      row.weight == null
        ? null
        : Number(row.weight),
    volume:
      row.volume == null
        ? null
        : Number(row.volume),
    article: row.article || null,
    code: row.code || null,
    externalCode: row.external_code || null,
    barcode: row.barcode || null,
    archived: Boolean(row.archived),
    updated: row.updated_at
      ? new Date(row.updated_at).toISOString()
      : null,
    hidden: Boolean(row.hidden),
  };
}

/*
|--------------------------------------------------------------------------
| POST /api/products
|--------------------------------------------------------------------------
*/

app.post("/api/products", async (req, res) => {
  try {
    const product = req.body || {};

    const title =
      String(
        product.title ??
          product.name ??
          ""
      ).trim();

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Не указано название товара",
      });
    }

    const id = crypto.randomUUID();

    const name = String(
      product.name ??
        title
    );

    const images = Array.isArray(
      product.images
    )
      ? product.images
          .map(String)
          .filter(Boolean)
      : [];

    const categoryPath = Array.isArray(
      product.categoryPath
    )
      ? product.categoryPath.map(String)
      : [];

    const characteristics =
      Array.isArray(
        product.characteristics
      )
        ? product.characteristics
        : [];

    const stock = Number(
      product.stock ?? 0
    );

    const reserve = Number(
      product.reserve ?? 0
    );

    const inTransit = Number(
      product.inTransit ?? 0
    );

    const quantity = Number(
      product.quantity ?? 0
    );

    const inStock =
      product.inStock !== undefined
        ? Boolean(product.inStock)
        : stock > 0 || quantity > 0;

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
        updated_at,
        hidden,
        raw
      )
      VALUES (
        $1, $2, $3, $4, $5::jsonb, $6, $7, $8::jsonb, $9,
        $10, $11, $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24, $25::jsonb, $26,
        $27, $28, $29, $30, $31, $32, $33, NOW(), $34, $35::jsonb
      )
      RETURNING *
      `,
      [
        id,
        title,
        name,
        Number(product.price ?? 0),
        JSON.stringify(images),
        String(product.category ?? ""),
        product.categoryGroup ?? null,
        JSON.stringify(categoryPath),
        product.categoryLeaf ?? null,
        product.badge ?? null,
        Number(product.rating ?? 0),
        Number(product.reviews ?? 0),
        String(
          product.delivery ??
            "Уточняется"
        ),
        inStock,
        stock,
        reserve,
        inTransit,
        quantity,
        String(
          product.description ?? ""
        ),
        String(product.memory ?? ""),
        String(product.color ?? ""),
        String(product.warranty ?? ""),
        product.type ?? null,
        product.product ?? null,
        JSON.stringify(characteristics),
        Number(
          product.variantsCount ?? 0
        ),
        product.weight == null
          ? null
          : Number(product.weight),
        product.volume == null
          ? null
          : Number(product.volume),
        product.article ?? null,
        product.code ?? null,
        product.externalCode ?? null,
        product.barcode ?? null,
        Boolean(
          product.archived ?? false
        ),
        Boolean(
          product.hidden ?? false
        ),
        JSON.stringify(product.raw ?? {}),
      ]
    );

    return res.status(201).json({
      success: true,
      product: mapProductRow(
        result.rows[0]
      ),
    });
  } catch (error) {
    console.error(
      "POST /api/products failed:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Ошибка создания товара",
    });
  }
});

/*
|--------------------------------------------------------------------------
| PATCH /api/products/:id
|--------------------------------------------------------------------------
*/

app.patch(
  "/api/products/:id",
  async (req, res) => {
    try {
      const input = req.body || {};

      const fields = [];
      const values = [];
      let index = 1;

      const scalarFields = {
        title: "title",
        name: "name",
        price: "price",
        category: "category",
        categoryGroup: "category_group",
        categoryLeaf: "category_leaf",
        badge: "badge",
        rating: "rating",
        reviews: "reviews",
        delivery: "delivery",
        inStock: "in_stock",
        stock: "stock",
        reserve: "reserve",
        inTransit: "in_transit",
        quantity: "quantity",
        description: "description",
        memory: "memory",
        color: "color",
        warranty: "warranty",
        type: "type",
        product: "product",
        variantsCount: "variants_count",
        weight: "weight",
        volume: "volume",
        article: "article",
        code: "code",
        externalCode: "external_code",
        barcode: "barcode",
        archived: "archived",
        hidden: "hidden",
      };

      for (
        const [key, column]
        of Object.entries(
          scalarFields
        )
      ) {
        if (
          input[key] === undefined
        ) {
          continue;
        }

        let value =
          input[key];

        if (
          [
            "price",
            "rating",
            "stock",
            "reserve",
            "inTransit",
            "quantity",
            "weight",
            "volume",
            "variantsCount",
            "reviews",
          ].includes(key)
        ) {
          value =
            value == null
              ? null
              : Number(value);
        } else if (
          [
            "inStock",
            "archived",
            "hidden",
          ].includes(key)
        ) {
          value = Boolean(value);
        } else {
          value =
            value == null
              ? null
              : String(value);
        }

        fields.push(
          `${column} = $${index}`
        );
        values.push(value);
        index += 1;
      }

      if (
        input.images !== undefined
      ) {
        fields.push(
          `images = $${index}::jsonb`
        );
        values.push(
          JSON.stringify(
            Array.isArray(
              input.images
            )
              ? input.images
                  .map(String)
                  .filter(Boolean)
              : []
          )
        );
        index += 1;
      }

      if (
        input.categoryPath !==
        undefined
      ) {
        fields.push(
          `category_path = $${index}::jsonb`
        );
        values.push(
          JSON.stringify(
            Array.isArray(
              input.categoryPath
            )
              ? input.categoryPath.map(
                  String
                )
              : []
          )
        );
        index += 1;
      }

      if (
        input.characteristics !==
        undefined
      ) {
        fields.push(
          `characteristics = $${index}::jsonb`
        );
        values.push(
          JSON.stringify(
            Array.isArray(
              input.characteristics
            )
              ? input.characteristics
              : []
          )
        );
        index += 1;
      }

      if (
        input.title !== undefined &&
        input.name === undefined
      ) {
        fields.push(
          `name = $${index}`
        );
        values.push(
          String(input.title)
        );
        index += 1;
      }

      if (
        (
          input.stock !==
            undefined ||
          input.quantity !==
            undefined
        ) &&
        input.inStock ===
          undefined
      ) {
        const stock =
          Number(
            input.stock ??
              0
          );

        const quantity =
          Number(
            input.quantity ??
              0
          );

        fields.push(
          `in_stock = $${index}`
        );
        values.push(
          stock > 0 ||
            quantity > 0
        );
        index += 1;
      }

      fields.push(
        `updated_at = NOW()`
      );

      if (
        fields.length === 1
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Нет данных для обновления",
        });
      }

      values.push(
        req.params.id
      );

      const result =
        await pgQuery(
          `
          UPDATE products
          SET ${fields.join(", ")}
          WHERE id = $${index}
          RETURNING *
          `,
          values
        );

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Товар не найден",
        });
      }

      return res.json({
        success: true,
        product:
          mapProductRow(
            result.rows[0]
          ),
      });
    } catch (error) {
      console.error(
        "PATCH /api/products/:id failed:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка обновления товара",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| DELETE /api/products/:id
|--------------------------------------------------------------------------
*/

app.delete(
  "/api/products/:id",
  async (req, res) => {
    try {
      const result =
        await pgQuery(
          `
          DELETE FROM products
          WHERE id = $1
          RETURNING id
          `,
          [req.params.id]
        );

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Товар не найден",
        });
      }

      return res.json({
        success: true,
        id: result.rows[0].id,
      });
    } catch (error) {
      console.error(
        "DELETE /api/products/:id failed:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Ошибка удаления товара",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET /api/products
|
| PostgreSQL catalog with cursor pagination
|--------------------------------------------------------------------------
*/

app.get("/api/products", async (req, res) => {
  try {
    const requestedLimit = Number(req.query.limit ?? 50);
    const limit = Math.max(
      1,
      Math.min(
        Number.isFinite(requestedLimit) ? requestedLimit : 50,
        100
      )
    );

    const cursorTitle =
      typeof req.query.cursorTitle === "string"
        ? req.query.cursorTitle
        : null;

    const cursorId =
      typeof req.query.cursorId === "string"
        ? req.query.cursorId
        : null;

    let result;

    if (cursorTitle !== null && cursorId !== null) {
      result = await pgQuery(
        `
        SELECT ${PRODUCT_COLUMNS}
        FROM products
        WHERE (title, id) > ($1, $2)
        ORDER BY title ASC, id ASC
        LIMIT $3
        `,
        [cursorTitle, cursorId, limit]
      );
    } else {
      result = await pgQuery(
        `
        SELECT ${PRODUCT_COLUMNS}
        FROM products
        ORDER BY title ASC, id ASC
        LIMIT $1
        `,
        [limit]
      );
    }

    const products = result.rows.map(mapPostgresProduct);

    const last =
      products.length > 0
        ? products[products.length - 1]
        : null;

    res.json({
      products,
      nextCursor:
        last
          ? {
              title: last.title,
              id: last.id,
            }
          : null,
      hasMore: products.length === limit,
    });
  } catch (error) {
    console.error("GET /api/products failed:", error);

    res.status(500).json({
      success: false,
      message: "Не удалось загрузить товары",
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET /api/products/search
|--------------------------------------------------------------------------
*/

app.get("/api/products/search", async (req, res) => {
  try {
    const term =
      typeof req.query.q === "string"
        ? req.query.q.trim()
        : "";

    const requestedLimit = Number(req.query.limit ?? 80);

    const limit = Math.max(
      1,
      Math.min(
        Number.isFinite(requestedLimit) ? requestedLimit : 80,
        100
      )
    );

    if (term.length < 2) {
      return res.json({
        products: [],
      });
    }

    const pattern = `%${term.toLowerCase()}%`;

    const result = await pgQuery(
      `
      SELECT ${PRODUCT_COLUMNS}
      FROM products
      WHERE
        LOWER(COALESCE(title, '')) LIKE $1
        OR LOWER(COALESCE(name, '')) LIKE $1
        OR LOWER(COALESCE(category, '')) LIKE $1
        OR LOWER(COALESCE(memory, '')) LIKE $1
        OR LOWER(COALESCE(color, '')) LIKE $1
        OR LOWER(COALESCE(description, '')) LIKE $1
      ORDER BY title ASC, id ASC
      LIMIT $2
      `,
      [pattern, limit]
    );

    res.json({
      products: result.rows.map(mapPostgresProduct),
    });
  } catch (error) {
    console.error("GET /api/products/search failed:", error);

    res.status(500).json({
      success: false,
      message: "Ошибка поиска товаров",
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET /api/products/categories
|--------------------------------------------------------------------------
*/

app.get("/api/products/categories", async (req, res) => {
  try {
    const result = await pgQuery(`
      SELECT DISTINCT category_name
      FROM (
        SELECT
          COALESCE(
            NULLIF(TRIM(category_group), ''),
            NULLIF(TRIM(SPLIT_PART(category, '/', 1)), '')
          ) AS category_name
        FROM products
      ) categories
      WHERE category_name IS NOT NULL
      ORDER BY category_name
    `);

    res.json({
      categories: result.rows.map(
        (row) => row.category_name
      ),
    });
  } catch (error) {
    console.error(
      "GET /api/products/categories failed:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Ошибка загрузки категорий",
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET /api/products/:id
|--------------------------------------------------------------------------
*/

app.get("/api/products/:id", async (req, res) => {
  try {
    const result = await pgQuery(
      `
      SELECT ${PRODUCT_COLUMNS}
      FROM products
      WHERE id = $1
      LIMIT 1
      `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Товар не найден",
      });
    }

    res.json({
      product: mapPostgresProduct(result.rows[0]),
    });
  } catch (error) {
    console.error("GET /api/products/:id failed:", error);

    res.status(500).json({
      success: false,
      message: "Ошибка загрузки товара",
    });
  }
});

/*
|--------------------------------------------------------------------------
| POST /api/auth/login
|
| Клиентский вход через PostgreSQL.
| Firebase больше не используется.
|--------------------------------------------------------------------------
*/

app.post("/api/auth/login", async (req, res) => {
  try {
    const name = String(
      req.body?.name || ""
    ).trim();

    const rawPhone = String(
      req.body?.phone || ""
    ).trim();

    if (!name || !rawPhone) {
      return res.status(400).json({
        success: false,
        message: "Введите имя и телефон",
      });
    }

    const phone = normalizePhone(rawPhone);

    console.log("");
    console.log("======================================");
    console.log("АВТОРИЗАЦИЯ КЛИЕНТА");
    console.log("Телефон:", phone);
    console.log("======================================");

    /*
    |--------------------------------------------------------------------------
    | 1. Получаем актуальные данные клиента из 1С
    |--------------------------------------------------------------------------
    */

    let oneCCustomer = null;

    try {
      console.log(
        "1С: получаем клиента..."
      );

      oneCCustomer =
        await getOneCCustomer(phone);

      console.log(
        "1С клиент получен:",
        !!oneCCustomer
      );

      console.log(
        "QR получен:",
        !!oneCCustomer?.customerQR
      );

    } catch (oneCError) {

      console.error(
        "Ошибка получения клиента из 1С:",
        oneCError?.message ||
        oneCError
      );

      /*
      Не останавливаем вход.

      Если 1С временно недоступна,
      используем данные PostgreSQL.
      */
    }

    /*
    |--------------------------------------------------------------------------
    | 2. Ищем клиента в PostgreSQL
    |--------------------------------------------------------------------------
    */

    const pgResult =
      await pgQuery(
        `
        SELECT
          id,
          name,
          phone,
          login,
          points,
          bonuses,
          orders,
          status,
          role
        FROM clients
        WHERE phone = $1
        LIMIT 1
        `,
        [phone]
      );

    /*
    |--------------------------------------------------------------------------
    | 3. Клиент найден
    |--------------------------------------------------------------------------
    */

    if (pgResult.rows.length > 0) {

      const client =
        pgResult.rows[0];

      console.log(
        "Клиент найден в PostgreSQL"
      );

      /*
      Если получили актуальные данные
      из 1С — обновляем бонусы и имя
      в PostgreSQL.
      */

      if (oneCCustomer) {

        const updatedName =
          oneCCustomer.name ||
          client.name ||
          name;

        const updatedPhone =
          normalizePhone(
            oneCCustomer.phone ||
            client.phone ||
            phone
          );

        const updatedPoints =
          Number(
            oneCCustomer.bonusBalance ??
            client.points ??
            0
          );

        try {

          await pgQuery(
            `
            UPDATE clients
            SET
              name = $1,
              phone = $2,
              points = $3,
              bonuses = $4
            WHERE id = $5
            `,
            [
              updatedName,
              updatedPhone,
              updatedPoints,
              updatedPoints,
              client.id,
            ]
          );

          console.log(
            "Клиент обновлён данными из 1С"
          );

        } catch (updateError) {

          console.error(
            "Ошибка обновления клиента:",
            updateError?.message ||
            updateError
          );
        }
      }

      return res.json({
        success: true,
        message: "Успешный вход",

        client: {

          id: client.id,

          name:
            oneCCustomer?.name ||
            client.name ||
            name,

          login:
            client.login ||
            oneCCustomer?.name ||
            client.name ||
            name,

          phone:
            oneCCustomer?.phone ||
            client.phone ||
            phone,

          points: Number(
            oneCCustomer?.bonusBalance ??
            client.points ??
            0
          ),

          bonuses: Number(
            oneCCustomer?.bonusBalance ??
            client.bonuses ??
            client.points ??
            0
          ),

          orders: Number(
            client.orders || 0
          ),

          status:
            client.status ||
            "MAX START",

          role:
            client.role ||
            "user",

          /*
          QR пока получаем напрямую из 1С.
          В PostgreSQL его пока не сохраняем.
          */

          customerQR:
            oneCCustomer?.customerQR ||
            null,
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 4. Клиент не найден
    |--------------------------------------------------------------------------
    */

    console.log(
      "Клиент не найден в PostgreSQL"
    );

    /*
    Создаём клиента сразу в PostgreSQL.
    */

    const clientId =
      crypto.randomUUID();

    /*
    Если клиент существует в 1С —
    используем данные из 1С.
    */

    const clientName =
      oneCCustomer?.name ||
      name;

    const clientPhone =
      normalizePhone(
        oneCCustomer?.phone ||
        phone
      );

    /*
    Бонусы из 1С.

    Если клиент новый и в 1С его нет —
    выдаём стартовые бонусы.
    */

    const points =
      Number(
        oneCCustomer?.bonusBalance ??
        100000
      );

    const bonuses =
      points;

    await pgQuery(
      `
      INSERT INTO clients (
        id,
        name,
        phone,
        login,
        points,
        bonuses,
        orders,
        status,
        role,
        source,
        welcome_bonus,
        created_at,
        raw
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,NOW(),$12::jsonb
      )
      `,
      [
        clientId,

        clientName,

        clientPhone,

        clientName,

        points,

        bonuses,

        0,

        oneCCustomer
          ? "ACTIVE"
          : "NEW CLIENT",

        "user",

        oneCCustomer
          ? "1C"
          : "telegram",

        !oneCCustomer,

        JSON.stringify(
          oneCCustomer || {
            name: clientName,
            phone: clientPhone,
          }
        ),
      ]
    );

    console.log(
      "Новый клиент создан в PostgreSQL:",
      clientId
    );

    return res.json({
      success: true,
      message: "Успешный вход",

      client: {

        id: clientId,

        name:
          clientName,

        login:
          clientName,

        phone:
          clientPhone,

        points,

        bonuses,

        orders: 0,

        status:
          oneCCustomer
            ? "ACTIVE"
            : "NEW CLIENT",

        role:
          "user",

        /*
        QR напрямую из 1С
        */

        customerQR:
          oneCCustomer?.customerQR ||
          null,
      },
    });

  } catch (error) {

    console.error(
      "POST /api/auth/login failed:",
      error?.message ||
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Ошибка авторизации",
    });
  }
});



app.get("/api/health/postgres", async (req, res) => {
  try {
    const result = await checkPostgres();
    res.json({
      success: true,
      postgres: result,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("PostgreSQL health check failed:", error);
    res.status(503).json({
      success: false,
      message: "PostgreSQL недоступен",
      error: error?.message || String(error),
    });
  }
});

/*
|--------------------------------------------------------------------------
| Запуск production API
|--------------------------------------------------------------------------
*/

app.listen(
  PORT,
  "0.0.0.0",
  async () => {
    console.log(
      `Production API запущен на порту ${PORT}`
    );

    await startAutoSync();
    await startOneCDailySync();
  }
);