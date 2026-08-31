import "dotenv/config";
import { parseOneProduct } from "./imageParser.js";

const PRODUCT_ID =
  "8405f76e-d5a8-11f0-0a80-0f140009748e";

try {
  const result = await parseOneProduct(PRODUCT_ID);

  console.log("");
  console.log("========== РЕЗУЛЬТАТ ==========");

  console.dir(result, {
    depth: 10,
  });

  process.exit(0);
} catch (error) {
  console.error("");
  console.error("❌ ОШИБКА:", error);

  process.exit(1);
}