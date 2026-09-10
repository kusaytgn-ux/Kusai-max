import "dotenv/config";
import axios from "axios";

const MOYSKLAD_API_URL =
  process.env.MOYSKLAD_API_URL ||
  "https://api.moysklad.ru/api/remap/1.2";

const login = process.env.MOYSKLAD_LOGIN;
const password = process.env.MOYSKLAD_PASSWORD;

const auth = {
  username: login,
  password,
};

async function getAssortment() {
  const response = await axios.get(
    `${MOYSKLAD_API_URL}/entity/assortment`,
    {
      auth,
      params: {
        limit: 1000,
      },
    }
  );

  return response.data?.rows || [];
}

async function main() {
  console.log("Ищу AirPods в МойСклад...\n");

  const products = await getAssortment();

  const airpods = products.filter((item) =>
    String(item.name || "")
      .toLowerCase()
      .includes("airpods")
  );

  console.log(`Найдено AirPods: ${airpods.length}\n`);

  if (!airpods.length) {
    console.log("AirPods не найдены.");
    return;
  }

  for (const product of airpods.slice(0, 10)) {
    console.log("----------------------------------------");
    console.log("Название:", product.name);
    console.log("ID:", product.id);
    console.log("Тип:", product.meta?.type);
    console.log("Цена:", product.salePrices?.[0]?.value);

    try {
      const type = product.meta?.type;

      const response = await axios.get(
        `${MOYSKLAD_API_URL}/entity/${type}/${product.id}/images`,
        {
          auth,
        }
      );

      const images = response.data?.rows || [];

      console.log("Фотографий:", images.length);

      if (images.length) {
        console.log(
          "Первая фотография:"
        );

        console.dir(images[0], {
          depth: 10,
        });
      }
    } catch (error) {
      console.log(
        "Ошибка получения фотографий:",
        error.response?.data || error.message
      );
    }

    console.log("----------------------------------------\n");
  }
}

main().catch((error) => {
  console.error(
    "Ошибка:",
    error.response?.data || error.message
  );

  process.exit(1);
});