import mysql from "mysql2/promise";
import "dotenv/config";

const connection = await mysql.createConnection({
  host: process.env.GALLERY_DB_HOST,
  port: Number(process.env.GALLERY_DB_PORT || 3306),
  user: process.env.GALLERY_DB_USER,
  password: process.env.GALLERY_DB_PASSWORD,
  database: process.env.GALLERY_DB_NAME,
});

try {
  console.log("🔄 Подключаемся к базе...");

  const [rows] = await connection.query("SELECT 1 AS test");

  console.log("✅ БАЗА УСПЕШНО ПОДКЛЮЧЕНА!");
  console.log(rows);

  await connection.end();
} catch (error) {
  console.error("❌ Ошибка подключения:");
  console.error(error.message);
}