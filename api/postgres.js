import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL не задан для PostgreSQL");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function checkPostgres() {
  const result = await query("SELECT NOW() AS now, current_database() AS database");
  return result.rows[0];
}
