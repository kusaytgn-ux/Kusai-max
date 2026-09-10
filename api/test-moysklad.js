import "dotenv/config";

import { getProducts } from "./moysklad.js";

try {
  console.log("🚀 Получаем товары из МойСклад...");

  const products = await getProducts();

  console.log("");
  console.log("========== ПЕРВЫЕ 20 ТОВАРОВ ==========");
  console.log("");

  products.slice(0, 20).forEach((product, index) => {
    console.log(`${index + 1}.`);
    console.log(`ID: ${product.id}`);
    console.log(`Название: ${product.name}`);
    console.log(`Артикул: ${product.article || "-"}`);
    console.log(`Код: ${product.code || "-"}`);
    console.log(`Штрихкод: ${product.barcode || "-"}`);
    console.log("-----------------------------------");
  });

  console.log("");
  console.log(`📦 ВСЕГО ТОВАРОВ: ${products.length}`);

} catch (error) {
  console.error("❌ ОШИБКА:");
  console.error(error.response?.data || error.message);
}