import "dotenv/config";

import { query } from "./postgres.js";
import { getProductInfo } from "./imageParser.js";

const result = await query(`
  SELECT
    id,
    title,
    name,
    memory,
    color,
    characteristics,
    raw
  FROM products
  WHERE archived = false
  ORDER BY updated_at DESC
  LIMIT 10
`);

console.log("");
console.log("==========================================");
console.log("🧪 ТЕСТ РАСПОЗНАВАНИЯ ТОВАРОВ ИЗ МОЙСКЛАД");
console.log("===========================================");

for (const product of result.rows) {
  const info = getProductInfo(product);

  console.log("");
  console.log(`📦 ${product.title}`);
  console.log(`   Категория: ${info.category || "—"}`);
  console.log(`   Модель:  ${info.model || "—"}`);
  console.log(`   Память:  ${info.memory || "—"}`);
  console.log(`   Цвет:    ${info.color || "—"}`);
}

console.log("");
console.log("====================================");
console.log("✅ ТЕСТ ЗАВЕРШЁН");
console.log("====================================");