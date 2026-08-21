import "dotenv/config";
import { fetch, Agent } from "undici";
import pg from "pg";

const { Pool } = pg;

const ONEC_URL =
  "https://1c-srv.nalogreg.ru/kusaiRetailWork/hs/kusaiMaxConnector/getAllCustomers";

const login =
  process.env.ONE_C_LOGIN || "MAX-Connector";

const password = process.env.ONE_C_PASSWORD;

if (!password) {
  throw new Error("ONE_C_PASSWORD не задан в .env");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL не задан в .env");
}

const auth =
  "Basic " +
  Buffer.from(`${login}:${password}`).toString("base64");

const agent = new Agent({
  connect: {
    rejectUnauthorized: false,
  },
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

async function main() {
  console.log("Получаем клиентов из 1С...");

  const response = await fetch(ONEC_URL, {
    method: "GET",
    headers: {
      Authorization: auth,
      Accept: "application/json",
    },
    dispatcher: agent,
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `1С вернула HTTP ${response.status}: ${text.slice(0, 1000)}`
    );
  }

  const customers = JSON.parse(text);

  if (!Array.isArray(customers)) {
    throw new Error("Ответ 1С не является массивом клиентов");
  }

  console.log(`Получено клиентов: ${customers.length}`);

  let created = 0;
  let updated = 0;
  let operationsInserted = 0;

  for (const customer of customers) {
    const phone = normalizePhone(customer.phone);

    if (!phone || !customer.customerId) {
      console.log(
        "Пропускаем клиента без телефона или customerId:",
        customer.name
      );
      continue;
    }

    const existing = await pool.query(
      `
      SELECT id
      FROM clients
      WHERE onec_customer_id = $1
         OR regexp_replace(phone, '\\D', '', 'g') = $2
      LIMIT 1
      `,
      [customer.customerId, phone]
    );

    let clientId;

    if (existing.rows.length > 0) {
      clientId = existing.rows[0].id;

      await pool.query(
        `
        UPDATE clients
        SET
          name = $1,
          phone = $2,
          points = $3,
          bonuses = $3,
          orders = $4,
          onec_customer_id = $5,
          status = COALESCE(NULLIF(status, ''), 'ACTIVE'),
          updated_at = NOW()
        WHERE id = $6
        `,
        [
          customer.name || "",
          customer.phone || phone,
          Number(customer.bonusBalance || 0),
          Array.isArray(customer.salesHistory)
            ? customer.salesHistory.length
            : 0,
          customer.customerId,
          clientId,
        ]
      );

      updated++;
    } else {
      const result = await pool.query(
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
          onec_customer_id,
          created_at,
          updated_at,
          raw
        )
        VALUES (
          gen_random_uuid()::text,
          $1,
          $2,
          $3,
          $4,
          $4,
          $5,
          'ACTIVE',
          'user',
          '1c',
          $6,
          NOW(),
          NOW(),
          $7
        )
        RETURNING id
        `,
        [
          customer.name || "",
          customer.phone || phone,
          customer.name || "",
          Number(customer.bonusBalance || 0),
          Array.isArray(customer.salesHistory)
            ? customer.salesHistory.length
            : 0,
          customer.customerId,
          customer,
        ]
      );

      clientId = result.rows[0].id;
      created++;
    }

    /*
     * Синхронизация истории продаж.
     *
     * salesHistory[].id используется как уникальный ID операции.
     */
    const salesHistory = Array.isArray(customer.salesHistory)
      ? customer.salesHistory
      : [];

    for (const sale of salesHistory) {
      if (!sale.id) continue;

      const result = await pool.query(
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
          'sale',
          $3,
          $4,
          $5
        )
        ON CONFLICT DO NOTHING
        `,
        [
          clientId,
          sale.id,
          Number(sale.sum || 0),
          sale.goods || "",
          sale.date ? new Date(sale.date) : null,
        ]
      );

      operationsInserted += result.rowCount;
    }
  }

  console.log("");
  console.log("Синхронизация завершена.");
  console.log(`Новых клиентов: ${created}`);
  console.log(`Обновлено клиентов: ${updated}`);
  console.log(`Добавлено операций: ${operationsInserted}`);
}

try {
  await main();
} catch (error) {
  console.error("Ошибка синхронизации:");
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
  await agent.close();
}