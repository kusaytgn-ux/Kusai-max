import "dotenv/config";

import { syncProducts } from "./imageParser.js";

try {
  const result = await syncProducts(10);

  console.log("");

  console.log("========== ИТОГ ==========");

  console.dir(result, {
    depth: 10,
  });

  process.exit(0);

} catch (error) {
  console.error("");

  console.error("❌ ОШИБКА:", error);

  process.exit(1);
}