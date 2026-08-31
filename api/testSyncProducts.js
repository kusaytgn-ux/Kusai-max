import "dotenv/config";

import {
  syncProducts,
} from "./imageParser.js";

try {
  await syncProducts(1900);

  console.log("");
  console.log("✅ Тест завершён");

  process.exit(0);
} catch (error) {
  console.error("");
  console.error(
    "❌ Ошибка синхронизации:",
    error
  );

  process.exit(1);
}