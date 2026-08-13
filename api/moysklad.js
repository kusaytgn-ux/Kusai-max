import axios from "axios";

const MOYSKLAD_API_URL =
  process.env.MOYSKLAD_API_URL ||
  "https://api.moysklad.ru/api/remap/1.2";

function getAuth() {
  const login = process.env.MOYSKLAD_LOGIN;
  const password = process.env.MOYSKLAD_PASSWORD;

  if (!login || !password) {
    throw new Error(
      "Не указаны MOYSKLAD_LOGIN и MOYSKLAD_PASSWORD в .env"
    );
  }

  return {
    username: login,
    password,
  };
}

const moysklad = axios.create({
  baseURL: MOYSKLAD_API_URL,
  timeout: 30000,
  headers: {
    Accept: "application/json",
    "Accept-Encoding": "gzip",
    "X-Lognex-Remap-Beta-Feature": "assortmentWithoutStock",
  },
});

// ---------------------------------------------
// Получить весь ассортимент
// ---------------------------------------------

export async function getAssortment() {
  const response = await moysklad.get("/entity/assortment", {
    auth: getAuth(),
    params: {
      limit: 1000,
    },
  });

  return response.data;
}

// ---------------------------------------------
// Получить остатки
// ---------------------------------------------

async function getStockByType(stockType, assortmentIds) {
  if (!assortmentIds.length) {
    return [];
  }

  const response = await moysklad.get(
    "/report/stock/all/current",
    {
      auth: getAuth(),

      params: {
        stockType,
        filter: `assortmentId=${assortmentIds.join(",")}`,
      },
    }
  );

  return response.data;
}

// ---------------------------------------------
// Получить все типы остатков
// ---------------------------------------------

export async function getAllStocks(assortmentIds) {
  const [
    stock,
    reserve,
    inTransit,
    quantity,
  ] = await Promise.all([
    getStockByType("stock", assortmentIds),
    getStockByType("reserve", assortmentIds),
    getStockByType("inTransit", assortmentIds),
    getStockByType("quantity", assortmentIds),
  ]);

  return {
    stock,
    reserve,
    inTransit,
    quantity,
  };
}

// ---------------------------------------------
// Превращаем остатки в удобную Map
// ---------------------------------------------

function createStockMap(rows, field) {
  const map = new Map();

  for (const row of rows || []) {
    if (!row.assortmentId) {
      continue;
    }

    map.set(
      row.assortmentId,
      Number(row[field] || 0)
    );
  }

  return map;
}

// ---------------------------------------------
// Извлекаем цену
// ---------------------------------------------

function getSalePrice(item) {
  if (
    !Array.isArray(item.salePrices) ||
    item.salePrices.length === 0
  ) {
    return null;
  }

  const price = item.salePrices[0];

  if (!price) {
    return null;
  }

  return Number(price.value || 0);
}

// ---------------------------------------------
// Извлекаем штрихкод
// ---------------------------------------------

function getBarcode(item) {
  if (
    !Array.isArray(item.barcodes) ||
    item.barcodes.length === 0
  ) {
    return null;
  }

  const barcode = item.barcodes[0];

  if (!barcode) {
    return null;
  }

  return (
    barcode.ean13 ||
    barcode.ean8 ||
    barcode.code128 ||
    barcode.code39 ||
    null
  );
}

// ---------------------------------------------
// Определяем тип позиции
// ---------------------------------------------

function getItemType(item) {
  return item?.meta?.type || null;
}

// ---------------------------------------------
// Изображения
// ---------------------------------------------

async function getImages(item) {
  if (!item?.images?.meta?.href) {
    return [];
  }

  try {
    const response = await moysklad.get(
      item.images.meta.href,
      {
        auth: getAuth(),
      }
    );

    return response.data?.rows || [];
  } catch (error) {
    console.error(
      `Ошибка получения изображений ${item.id}:`,
      error.message
    );

    return [];
  }
}

// ---------------------------------------------
// Нормализация товара
// ---------------------------------------------

function normalizeProduct(
  item,
  stockMaps,
  images
) {
  const id = item.id;

  const type = getItemType(item);

  const parentProduct =
    item.product?.meta?.href || null;

  return {
    id,

    name: item.name || "",

    description:
      item.description ||
      item.descriptionShort ||
      "",

    price: getSalePrice(item),

    minPrice:
      item.minPrice?.value !== undefined
        ? Number(item.minPrice.value)
        : null,

    buyPrice:
      item.buyPrice?.value !== undefined
        ? Number(item.buyPrice.value)
        : null,

    article: item.article || null,

    code: item.code || null,

    externalCode:
      item.externalCode || null,

    barcode: getBarcode(item),

    type,

    archived:
      Boolean(item.archived),

    category:
      item.pathName || null,

    stock:
      stockMaps.stock.get(id) || 0,

    reserve:
      stockMaps.reserve.get(id) || 0,

    inTransit:
      stockMaps.inTransit.get(id) || 0,

    quantity:
      stockMaps.quantity.get(id) || 0,

    images,

    product:
      parentProduct,

    characteristics:
      Array.isArray(item.characteristics)
        ? item.characteristics.map(
            (characteristic) => ({
              id: characteristic.id,
              name: characteristic.name,
              value: characteristic.value,
            })
          )
        : [],

    variantsCount:
      item.variantsCount || 0,

    weight:
      item.weight !== undefined
        ? Number(item.weight)
        : null,

    volume:
      item.volume !== undefined
        ? Number(item.volume)
        : null,

    updated:
      item.updated || null,
  };
}

// ---------------------------------------------
// Главная функция синхронизации
// ---------------------------------------------

export async function getProducts() {
  const assortment =
    await getAssortment();

  const rows =
    assortment?.rows || [];

  const assortmentIds =
    rows
      .map((item) => item.id)
      .filter(Boolean);

  const stocks =
    await getAllStocks(
      assortmentIds
    );

  const stockMaps = {
    stock: createStockMap(
      stocks.stock,
      "stock"
    ),

    reserve: createStockMap(
      stocks.reserve,
      "reserve"
    ),

    inTransit: createStockMap(
      stocks.inTransit,
      "inTransit"
    ),

    quantity: createStockMap(
      stocks.quantity,
      "quantity"
    ),
  };

  // Получаем изображения параллельно
  const products =
    await Promise.all(
      rows.map(async (item) => {
        const images =
          await getImages(item);

        return normalizeProduct(
          item,
          stockMaps,
          images
        );
      })
    );

  return products;
}

// ---------------------------------------------
// Получить один товар
// ---------------------------------------------

export async function getProductById(id) {
  if (!id) {
    throw new Error(
      "Не указан ID товара"
    );
  }

  const response =
    await moysklad.get(
      `/entity/assortment/${id}`,
      {
        auth: getAuth(),
      }
    );

  const item =
    response.data;

  const stocks =
    await getAllStocks([id]);

  const stockMaps = {
    stock: createStockMap(
      stocks.stock,
      "stock"
    ),

    reserve: createStockMap(
      stocks.reserve,
      "reserve"
    ),

    inTransit: createStockMap(
      stocks.inTransit,
      "inTransit"
    ),

    quantity: createStockMap(
      stocks.quantity,
      "quantity"
    ),
  };

  const images =
    await getImages(item);

  return normalizeProduct(
    item,
    stockMaps,
    images
  );
}

// ---------------------------------------------
// Проверка соединения
// ---------------------------------------------

export async function testMoySklad() {
  const response =
    await moysklad.get(
      "/entity/assortment",
      {
        auth: getAuth(),
        params: {
          limit: 1,
        },
      }
    );

  return {
    success: true,
    status: response.status,
  };
}