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
    Accept: "application/json;charset=utf-8",
    "Accept-Encoding": "gzip",
    "X-Lognex-Remap-Beta-Feature":
      "assortmentWithoutStock",
  },
});

// ============================================================
// ПОЛУЧИТЬ ВЕСЬ АССОРТИМЕНТ
// ============================================================

export async function getAssortment() {
  console.log(
    "=== MOYSKLAD: получаем весь ассортимент ==="
  );

  const allRows = [];

  const limit = 1000;
  let offset = 0;

  while (true) {
    console.log(
      `MOYSKLAD: запрашиваем ассортимент offset=${offset}, limit=${limit}`
    );

    const response = await moysklad.get(
      "/entity/assortment",
      {
        auth: getAuth(),

        params: {
          limit,
          offset,
        },
      }
    );

    const rows =
      response.data?.rows || [];

    console.log(
      `MOYSKLAD: получено товаров: ${rows.length}`
    );

    allRows.push(...rows);

    if (rows.length < limit) {
      break;
    }

    offset += limit;

    await new Promise((resolve) =>
      setTimeout(resolve, 300)
    );
  }

  console.log(
    `=== MOYSKLAD: всего товаров получено: ${allRows.length} ===`
  );

  return {
    rows: allRows,
  };
}

// ============================================================
// ПОЛУЧИТЬ ОСТАТКИ
// ============================================================

async function getStockByType(
  stockType,
  assortmentIds
) {
  if (!assortmentIds.length) {
    return [];
  }

  const chunkSize = 50;

  const result = [];

  for (
    let i = 0;
    i < assortmentIds.length;
    i += chunkSize
  ) {
    const chunk =
      assortmentIds.slice(
        i,
        i + chunkSize
      );

    const batchNumber =
      Math.floor(i / chunkSize) + 1;

    console.log(
      `MOYSKLAD: ${stockType}, пачка ${batchNumber}, товаров: ${chunk.length}`
    );

    try {
      const response =
        await moysklad.get(
          "/report/stock/all/current",
          {
            auth: getAuth(),

            headers: {
              Accept:
                "application/json;charset=utf-8",
            },

            params: {
              stockType,

              filter:
                `assortmentId=${chunk.join(",")}`,
            },
          }
        );

      const rows =
        response.data?.rows || [];

      if (Array.isArray(rows)) {
        result.push(...rows);
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 300)
      );
    } catch (error) {
      console.error(
        `MOYSKLAD: ошибка остатков "${stockType}", пачка ${batchNumber}`
      );

      console.error(
        error.response?.data ||
          error.message
      );

      throw error;
    }
  }

  console.log(
    `=== MOYSKLAD: остатки "${stockType}" получены: ${result.length} ===`
  );

  return result;
}

// ============================================================
// ПОЛУЧИТЬ ВСЕ ТИПЫ ОСТАТКОВ
// ============================================================

export async function getAllStocks(
  assortmentIds
) {
  console.log(
    "=== MOYSKLAD: начинаем получение всех остатков ==="
  );

  const stock =
    await getStockByType(
      "stock",
      assortmentIds
    );

  const reserve =
    await getStockByType(
      "reserve",
      assortmentIds
    );

  const inTransit =
    await getStockByType(
      "inTransit",
      assortmentIds
    );

  const quantity =
    await getStockByType(
      "quantity",
      assortmentIds
    );

  console.log(
    "=== MOYSKLAD: все остатки получены ==="
  );

  return {
    stock,
    reserve,
    inTransit,
    quantity,
  };
}

// ============================================================
// СОЗДАТЬ MAP ОСТАТКОВ
// ============================================================

function createStockMap(
  rows,
  field
) {
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

// ============================================================
// ЦЕНА
// ============================================================
//
// МойСклад хранит цены в КОПЕЙКАХ.
//
// Например:
//
// 4599000 -> 45990.00 ₽
// 4599123 -> 45991.23 ₽
//
// Поэтому здесь делим value на 100.
// ============================================================

function convertPrice(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numericValue =
    Number(value);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return numericValue / 100;
}

// ============================================================
// ПОЛУЧИТЬ ПРОДАЖНУЮ ЦЕНУ
// ============================================================

function getSalePrice(item) {
  if (
    !Array.isArray(
      item.salePrices
    ) ||
    item.salePrices.length === 0
  ) {
    return null;
  }

  const price =
    item.salePrices[0];

  if (!price) {
    return null;
  }

  return convertPrice(
    price.value
  );
}

// ============================================================
// ШТРИХКОД
// ============================================================

function getBarcode(item) {
  if (
    !Array.isArray(
      item.barcodes
    ) ||
    item.barcodes.length === 0
  ) {
    return null;
  }

  const barcode =
    item.barcodes[0];

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

// ============================================================
// ТИП ПОЗИЦИИ
// ============================================================

function getItemType(item) {
  return item?.meta?.type || null;
}

// ============================================================
// НОРМАЛИЗАЦИЯ ТОВАРА
// ============================================================

function normalizeProduct(
  item,
  stockMaps
) {
  const id = item.id;

  const type =
    getItemType(item);

  const parentProduct =
    item.product?.meta?.href ||
    null;

  // Получаем цену
  const price =
    getSalePrice(item);

  // Минимальная цена
  const minPrice =
    item.minPrice?.value !== undefined
      ? convertPrice(
          item.minPrice.value
        )
      : null;

  // Закупочная цена
  const buyPrice =
    item.buyPrice?.value !== undefined
      ? convertPrice(
          item.buyPrice.value
        )
      : null;

  return {
    // Постоянный ID МойСклада
    id,

    // Основная информация
    name:
      item.name || "",

    description:
      item.description ||
      item.descriptionShort ||
      "",

    // ========================================================
    // ЦЕНЫ В РУБЛЯХ
    // ========================================================

    price,

    minPrice,

    buyPrice,

    // Идентификаторы
    article:
      item.article || null,

    code:
      item.code || null,

    externalCode:
      item.externalCode || null,

    barcode:
      getBarcode(item),

    // Тип
    type,

    // Архив
    archived:
      Boolean(item.archived),

    // Категория
    category:
      item.pathName || null,

    // Остатки
    stock:
      stockMaps.stock.get(id) || 0,

    reserve:
      stockMaps.reserve.get(id) || 0,

    inTransit:
      stockMaps.inTransit.get(id) || 0,

    quantity:
      stockMaps.quantity.get(id) || 0,

    // Связанный товар
    product:
      parentProduct,

    // Характеристики
    characteristics:
      Array.isArray(
        item.characteristics
      )
        ? item.characteristics.map(
            (characteristic) => ({
              id:
                characteristic.id,

              name:
                characteristic.name,

              value:
                characteristic.value,
            })
          )
        : [],

    // Варианты
    variantsCount:
      item.variantsCount || 0,

    // Вес
    weight:
      item.weight !== undefined
        ? Number(item.weight)
        : null,

    // Объём
    volume:
      item.volume !== undefined
        ? Number(item.volume)
        : null,

    // Дата изменения
    updated:
      item.updated || null,
  };
}

// ============================================================
// ПОЛУЧИТЬ ВСЕ ТОВАРЫ
// ============================================================

export async function getProducts() {
  console.log("");

  console.log(
    "======================================"
  );

  console.log(
    "MOYSKLAD: НАЧАЛО ПОЛУЧЕНИЯ ТОВАРОВ"
  );

  console.log(
    "======================================"
  );

  // ----------------------------------------------------------
  // 1. Получаем ассортимент
  // ----------------------------------------------------------

  console.log(
    "1. Получаем ассортимент..."
  );

  const assortment =
    await getAssortment();

  const rows =
    assortment?.rows || [];

  console.log(
    `2. Ассортимент получен: ${rows.length}`
  );

  // ----------------------------------------------------------
  // 2. Собираем ID
  // ----------------------------------------------------------

  const assortmentIds =
    rows
      .map(
        (item) => item.id
      )
      .filter(Boolean);

  console.log(
    `3. ID товаров собрано: ${assortmentIds.length}`
  );

  // ----------------------------------------------------------
  // 3. Получаем остатки
  // ----------------------------------------------------------

  console.log(
    "4. Получаем остатки..."
  );

  const stocks =
    await getAllStocks(
      assortmentIds
    );

  // ----------------------------------------------------------
  // 4. Создаём карты остатков
  // ----------------------------------------------------------

  console.log(
    "5. Создаём карты остатков..."
  );

  const stockMaps = {
    stock:
      createStockMap(
        stocks.stock,
        "stock"
      ),

    reserve:
      createStockMap(
        stocks.reserve,
        "reserve"
      ),

    inTransit:
      createStockMap(
        stocks.inTransit,
        "inTransit"
      ),

    quantity:
      createStockMap(
        stocks.quantity,
        "quantity"
      ),
  };

  // ----------------------------------------------------------
  // 5. Нормализуем товары
  // ----------------------------------------------------------

  console.log(
    "6. Обрабатываем товары..."
  );

  const products =
    rows.map(
      (item) =>
        normalizeProduct(
          item,
          stockMaps
        )
    );

  console.log(
    `7. Товары полностью обработаны: ${products.length}`
  );

  console.log(
    "======================================"
  );

  console.log(
    "MOYSKLAD: ПОЛУЧЕНИЕ ТОВАРОВ ЗАВЕРШЕНО"
  );

  console.log(
    "======================================"
  );

  return products;
}

// ============================================================
// ПОЛУЧИТЬ ОДИН ТОВАР
// ============================================================

export async function getProductById(
  id
) {
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

  // Получаем только остатки.
  // Изображения НЕ запрашиваем.

  const stocks =
    await getAllStocks([id]);

  const stockMaps = {
    stock:
      createStockMap(
        stocks.stock,
        "stock"
      ),

    reserve:
      createStockMap(
        stocks.reserve,
        "reserve"
      ),

    inTransit:
      createStockMap(
        stocks.inTransit,
        "inTransit"
      ),

    quantity:
      createStockMap(
        stocks.quantity,
        "quantity"
      ),
  };

  return normalizeProduct(
    item,
    stockMaps
  );
}

// ============================================================
// ПРОВЕРКА СОЕДИНЕНИЯ
// ============================================================

export async function testMoySklad() {
  try {
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
      status:
        response.status,
    };
  } catch (error) {
    console.error(
      "=== МОЙСКЛАД ERROR ==="
    );

    console.error(
      "status:",
      error.response?.status
    );

    console.error(
      "data:",
      error.response?.data
    );

    console.error(
      "headers:",
      error.response?.headers
    );

    console.error(
      "message:",
      error.message
    );

    console.error(
      "======================"
    );

    throw error;
  }
}