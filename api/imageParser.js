import "dotenv/config";

import { fetch } from "undici";
import * as cheerio from "cheerio";

import { query } from "./postgres.js";

// ============================================================
// CONFIG
// ============================================================

const BASE_URL = "https://gallery-mobile.ru";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/139 Safari/537.36";

// ============================================================
// REQUEST
// ============================================================

async function requestPage(url) {
  console.log(`🌐 GET: ${url}`);

  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,

      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

      "Accept-Language":
        "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Ошибка загрузки страницы: HTTP ${response.status}`
    );
  }

  return await response.text();
}

// ============================================================
// URL NORMALIZATION
// ============================================================

function normalizeUrl(url) {
  if (!url) return null;

  let value = String(url).trim();

  if (!value) return null;

  if (value.startsWith("//")) {
    return `https:${value}`;
  }

  if (value.startsWith("/")) {
    return `${BASE_URL}${value}`;
  }

  if (
    value.startsWith("https://") ||
    value.startsWith("http://")
  ) {
    return value;
  }

  return null;
}

// ============================================================
// TEXT NORMALIZATION
// ============================================================

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[®™]/g, "")
    .replace(/[()]/g, " ")
    .replace(/[,+]/g, " ")
    .replace(/[-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================
// TECHNICAL WORDS
// ============================================================

const STOP_WORDS = new Set([
  "apple",
  "samsung",
  "xiaomi",
  "sony",
  "dyson",
  "yandex",
  "google",
  "gb",
  "tb",
  "esim",
  "sim",
  "dual",
  "nano",
]);

// ============================================================
// MEMORY
// ============================================================

function detectMemory(text) {
  const value = String(text || "");

  const match = value.match(
    /\b(32|64|128|256|512|1024|2048)\s*(GB|TB|ГБ|ТБ)\b/i
  );

  if (!match) return "";

  return `${match[1]}${match[2]
    .toLowerCase()
    .replace("гб", "gb")
    .replace("тб", "tb")}`;
}

// ============================================================
// COLOR
// ============================================================

const COLOR_ALIASES = {
  black: [
    "black",
    "черный",
    "чёрный",
    "space black",
    "jet black",
    "midnight",
  ],

  white: [
    "white",
    "белый",
    "starlight",
  ],

  silver: [
    "silver",
    "серебристый",
    "серебро",
  ],

  blue: [
    "blue",
    "синий",
    "голубой",
    "sky blue",
  ],

  gray: [
    "gray",
    "grey",
    "серый",
    "space gray",
    "graphite",
  ],

  green: [
    "green",
    "зеленый",
    "зелёный",
  ],

  pink: [
    "pink",
    "розовый",
  ],

  purple: [
    "purple",
    "фиолетовый",
    "lavender",
  ],

  gold: [
    "gold",
    "golden",
    "золотой",
  ],

  yellow: [
    "yellow",
    "желтый",
    "жёлтый",
  ],

  orange: [
    "orange",
    "оранжевый",
  ],

  red: [
    "red",
    "красный",
  ],
};

function detectColor(text) {
  const value = normalizeText(text);

  for (const [color, aliases] of Object.entries(
    COLOR_ALIASES
  )) {
    for (const alias of aliases) {
      if (
        value.includes(normalizeText(alias))
      ) {
        return color;
      }
    }
  }

  return "";
}

function getColorAliases(color) {
  return COLOR_ALIASES[color] || [];
}

// ============================================================
// REMOVE MEMORY
// ============================================================

function removeMemory(text) {
  return String(text || "")
    .replace(
      /\b(32|64|128|256|512|1024|2048)\s*(GB|TB|ГБ|ТБ)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================
// REMOVE SIM
// ============================================================

function removeSim(text) {
  return String(text || "")
    .replace(/\beSIM\b/gi, " ")
    .replace(/\be-SIM\b/gi, " ")
    .replace(/\bDual SIM\b/gi, " ")
    .replace(/\bNano SIM\b/gi, " ")
    .replace(/\b1 SIM\b/gi, " ")
    .replace(/\b2 SIM\b/gi, " ")
    .replace(/\bSIM\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================
// CREATE SEARCH QUERIES
// ============================================================

function createSearchQueries(title) {
  const original = String(title || "").trim();

  const memory = detectMemory(original);
  const color = detectColor(original);

  const queries = [];

  // ==========================================================
  // 1. ОРИГИНАЛ
  // ==========================================================

  queries.push(original);

  // ==========================================================
  // 2. БЕЗ APPLE
  // ==========================================================

  let withoutBrand = original
    .replace(/^Apple\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (withoutBrand) {
    queries.push(withoutBrand);
  }

  // ==========================================================
  // 3. БЕЗ SIM, НО С ПАМЯТЬЮ
  // ==========================================================

  let withoutSim = removeSim(withoutBrand);

  withoutSim = withoutSim
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (withoutSim) {
    queries.push(withoutSim);
  }

  // ==========================================================
  // 4. ЧИСТОЕ НАЗВАНИЕ БЕЗ ПАМЯТИ И SIM
  // ==========================================================

  let clean = withoutSim;

  clean = removeMemory(clean);

  clean = clean
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (clean) {
    queries.push(clean);
  }

  // ==========================================================
  // 5. БЕЗ ЦВЕТА
  // ==========================================================

  let withoutColor = clean;

  if (color) {
    for (const alias of getColorAliases(color)) {
      const escapedAlias = alias.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const regex = new RegExp(
        `\\b${escapedAlias}\\b`,
        "gi"
      );

      withoutColor = withoutColor.replace(
        regex,
        " "
      );
    }

    withoutColor = withoutColor
      .replace(/\s+/g, " ")
      .trim();
  }

  if (
    withoutColor &&
    withoutColor !== clean
  ) {
    queries.push(withoutColor);
  }

  return {
    original,
    clean,
    memory,
    color,

    queries: [
      ...new Set(
        queries.filter(Boolean)
      ),
    ],
  };
}

// ============================================================
// PRODUCT TITLE ANALYSIS
// ============================================================

function getProductInfo(product) {
  const title = String(
    product.title ||
      product.name ||
      ""
  ).trim();

  const search = createSearchQueries(title);

  return {
    originalTitle: title,

    normalizedTitle:
      normalizeText(title),

    searchTitle:
      search.clean,

    memory:
      search.memory,

    color:
      search.color,

    queries:
      search.queries,
  };
}

// ============================================================
// PRODUCT URL CHECK
// ============================================================

function isProductUrl(url) {
  if (!url) return false;

  try {
    const parsed = new URL(url);

    if (!parsed.hostname.includes("gallery-mobile.ru")) {
      return false;
    }

    const path = parsed.pathname
      .replace(/\/+$/, "")
      .toLowerCase();

    if (!path.includes("/catalog/")) {
      return false;
    }

    const badPaths = [
      "/cart",
      "/login",
      "/search",
      "/contacts",
      "/compare",
      "/favorite",
    ];

    if (
      badPaths.some((badPath) =>
        path.includes(badPath)
      )
    ) {
      return false;
    }

    const parts = path
      .split("/")
      .filter(Boolean);

    const catalogIndex = parts.indexOf("catalog");

    if (catalogIndex === -1) {
      return false;
    }

    // После catalog должно быть хотя бы несколько частей
    return parts.length > catalogIndex + 2;

  } catch {
    return false;
  }
}

// ============================================================
// EXTRACT LINKS
// ============================================================

function extractLinks(html) {
  const $ = cheerio.load(html);

  const links = [];

  $("a").each((_, element) => {
    const href =
      $(element).attr("href");

    if (!href) return;

    const url = normalizeUrl(href);

    if (!url) return;

    if (!isProductUrl(url)) {
      return;
    }

    const title = $(element)
      .text()
      .replace(/\s+/g, " ")
      .trim();

    // Убираем пустые ссылки

    if (!title) return;

    // Убираем SVG/CSS мусор

    if (
      title.includes(".cls-") ||
      title.includes("{fill:") ||
      title.includes("fill-rule") ||
      title.length < 2
    ) {
      return;
    }

    links.push({
      url,
      title,
    });
  });

  return Array.from(
    new Map(
      links.map((item) => [
        item.url,
        item,
      ])
    ).values()
  );
}

// ============================================================
// SEARCH URL VARIANTS
// ============================================================

function createSearchUrls(queryText) {
  const encoded =
    encodeURIComponent(queryText);

  return [
    `${BASE_URL}/search/?q=${encoded}`,
    `${BASE_URL}/search/?query=${encoded}`,
    `${BASE_URL}/catalog/?q=${encoded}`,
    `${BASE_URL}/catalog/?search=${encoded}`,
  ];
}

// ============================================================
// SEARCH PRODUCTS
// ============================================================

async function searchProductsOnSite(
  searchQuery
) {
  console.log("");

  console.log(
    `🔎 ИЩЕМ: ${searchQuery}`
  );

  const urls =
    createSearchUrls(searchQuery);

  const results = [];

  for (const url of urls) {
    try {
      console.log(
        `➡️ Проверяем поиск: ${url}`
      );

      const html =
        await requestPage(url);

      const links =
        extractLinks(html);

      console.log(
        `🔗 Найдено товаров: ${links.length}`
      );

      results.push(...links);

      if (links.length > 0) {
        break;
      }

    } catch (error) {
      console.log(
        `⚠️ Не удалось: ${error.message}`
      );
    }
  }

  return Array.from(
    new Map(
      results.map((item) => [
        item.url,
        item,
      ])
    ).values()
  );
}

// ============================================================
// SCORE PRODUCT
// ============================================================

function calculateProductScore(
  productInfo,
  candidate
) {
  const candidateText =
    normalizeText(
      `${candidate.title} ${candidate.url}`
    );

  const sourceText =
    normalizeText(
      productInfo.originalTitle
    );

  const words =
    sourceText
      .split(" ")
      .filter(
        (word) =>
          word.length > 1 &&
          !STOP_WORDS.has(word) &&
          !/^\d+$/.test(word)
      );

  let score = 0;
  let matchedWords = 0;

  for (const word of words) {
    if (
      candidateText.includes(word)
    ) {
      matchedWords++;
      score += 10;
    }
  }

  // Процент совпадения

  if (words.length > 0) {
    const ratio =
      matchedWords / words.length;

    score += Math.round(
      ratio * 50
    );
  }

  // ==========================================================
  // COLOR
  // ==========================================================

  let colorMatched = false;

  if (productInfo.color) {
    const aliases =
      getColorAliases(
        productInfo.color
      );

    colorMatched =
      aliases.some((alias) =>
        candidateText.includes(
          normalizeText(alias)
        )
      );

    if (colorMatched) {
      score += 30;
    }
  }

  // ==========================================================
  // MEMORY
  // ==========================================================

  let memoryMatched = false;

  if (productInfo.memory) {
    const memoryNumber =
      productInfo.memory.replace(
        /(gb|tb)/gi,
        ""
      );

    const memoryUnit =
      productInfo.memory
        .match(/(gb|tb)/i)?.[1]
        ?.toLowerCase();

    const variants = [
      productInfo.memory,

      productInfo.memory.replace(
        "gb",
        " gb"
      ),

      productInfo.memory.replace(
        "tb",
        " tb"
      ),

      `${memoryNumber}${memoryUnit}`,

      `${memoryNumber} ${memoryUnit}`,
    ];

    memoryMatched =
      variants.some((memory) =>
        candidateText.includes(
          normalizeText(memory)
        )
      );

    if (memoryMatched) {
      score += 40;
    }
  }

  return {
    score,
    matchedWords,
    colorMatched,
    memoryMatched,
  };
}

// ============================================================
// FIND BEST PRODUCT
// ============================================================

async function findProductPage(product) {
  const info =
    getProductInfo(product);

  console.log("");

  console.log(
    "===================================="
  );

  console.log(
    "🔎 ПОИСК ТОВАРА"
  );

  console.log(
    "===================================="
  );

  console.log(
    `📦 Оригинал: ${info.originalTitle}`
  );

  console.log(
    `🔍 Поиск: ${info.searchTitle}`
  );

  console.log(
    `🎨 Цвет: ${info.color || "нет"}`
  );

  console.log(
    `💾 Память: ${info.memory || "нет"}`
  );

  console.log("");

  console.log(
    "📝 Варианты поиска:"
  );

  info.queries.forEach((item) => {
    console.log(`• ${item}`);
  });

  const candidates = [];

  // ==========================================================
  // SEARCH
  // ==========================================================

  for (
    const searchQuery of info.queries
  ) {
    const links =
      await searchProductsOnSite(
        searchQuery
      );

    for (const link of links) {
      const score =
        calculateProductScore(
          info,
          link
        );

      if (score.score > 0) {
        candidates.push({
          ...link,
          ...score,
        });
      }
    }

    if (candidates.length > 0) {
      break;
    }

    await new Promise(
      (resolve) =>
        setTimeout(resolve, 700)
    );
  }

  // ==========================================================
  // UNIQUE
  // ==========================================================

  const uniqueCandidates =
    Array.from(
      new Map(
        candidates.map((item) => [
          item.url,
          item,
        ])
      ).values()
    );

  uniqueCandidates.sort(
    (a, b) =>
      b.score - a.score
  );

  console.log("");

  console.log(
    `🎯 Кандидатов: ${uniqueCandidates.length}`
  );

  uniqueCandidates
    .slice(0, 10)
    .forEach((item) => {
      console.log(
        `⭐ ${item.score} | ${item.title}`
      );

      console.log(item.url);

      console.log(
        `🎨 Цвет: ${item.colorMatched}`
      );

      console.log(
        `💾 Память: ${item.memoryMatched}`
      );
    });

  if (!uniqueCandidates.length) {
    return null;
  }

  const best =
    uniqueCandidates[0];

  // Минимальная защита от неправильного товара

  if (best.score < 40) {
    console.log("");

    console.log(
      "❌ Нет достаточно точного совпадения"
    );

    console.log(
      `Лучший результат: ${best.title}`
    );

    console.log(
      `Score: ${best.score}`
    );

    return null;
  }

  console.log("");

  console.log(
    "🏆 ВЫБРАН ТОВАР:"
  );

  console.log(best.title);

  console.log(best.url);

  return best;
}

// ============================================================
// IMAGE URL
// ============================================================

function isImageUrl(url) {
  if (!url) return false;

  const value =
    url.toLowerCase();

  return (
    value.includes(".jpg") ||
    value.includes(".jpeg") ||
    value.includes(".png") ||
    value.includes(".webp") ||
    value.includes(".avif")
  );
}

// ============================================================
// BAD IMAGES
// ============================================================

function isBadImage(url) {
  const value =
    url.toLowerCase();

  const badWords = [
    "logo",
    "icon",
    "favicon",
    "sprite",
    "banner",
    "payment",
    "delivery",
    "placeholder",
    "loader",
    "instagram",
    "telegram",
    "whatsapp",
  ];

  return badWords.some(
    (word) =>
      value.includes(word)
  );
}

// ============================================================
// EXTRACT IMAGES
// ============================================================

async function extractImagesFromPage(url) {

  console.log("");

  console.log(
    "🖼 ПОЛУЧАЕМ ИЗОБРАЖЕНИЯ"
  );

  const html = await requestPage(url);

  const $ = cheerio.load(html);

  const images = [];

  // ============================================================
  // ПРОВЕРКА ИЗОБРАЖЕНИЯ
  // ============================================================

  function isGoodProductImage(imageUrl) {

    if (!imageUrl) return false;

    const value = imageUrl.toLowerCase();

    // Только изображения

    if (!isImageUrl(value)) {
      return false;
    }

    // Логотипы, иконки и мусор

    if (isBadImage(value)) {
      return false;
    }

    // Маленькие превью

    if (
      value.includes("/60_60_") ||
      value.includes("/100_100_") ||
      value.includes("/150_150_") ||
      value.includes("/200_200_")
    ) {
      return false;
    }

    // Нам нужны оригиналы товаров.
    // Игнорируем resize_cache — оригинал обычно
    // лежит в /upload/iblock/

    if (
      value.includes("/upload/resize_cache/")
    ) {
      return false;
    }

    // Исключаем технические изображения сайта

    const badPaths = [
      "/upload/cmax/",
      "/template/",
      "/assets/",
      "/bitrix/",
    ];

    if (
      badPaths.some((path) =>
        value.includes(path)
      )
    ) {
      return false;
    }

    return true;

  }

  // ============================================================
  // ДОБАВЛЕНИЕ ИЗОБРАЖЕНИЯ
  // ============================================================

  function addImage(value) {

    if (!value) return;

    const imageUrl = normalizeUrl(value);

    if (!imageUrl) return;

    if (
      !isGoodProductImage(imageUrl)
    ) {
      return;
    }

    images.push(imageUrl);

  }

  // ============================================================
  // IMG
  // ============================================================

  $("img").each(
    (_, element) => {

      const sources = [

        $(element).attr("src"),

        $(element).attr("data-src"),

        $(element).attr("data-original"),

        $(element).attr("data-lazy-src"),

        $(element).attr("data-image"),

      ];

      for (const source of sources) {

        addImage(source);

      }

    }
  );

  // ============================================================
  // ССЫЛКИ НА ИЗОБРАЖЕНИЯ
  // ============================================================

  $("a").each(
    (_, element) => {

      const href =
        $(element).attr("href");

      addImage(href);

    }
  );

  // ============================================================
  // УБИРАЕМ ДУБЛИКАТЫ
  // ============================================================

  const unique = [
    ...new Set(images)
  ];

  console.log("");

  console.log(
    `🖼 Найдено качественных фото: ${unique.length}`
  );

  unique.forEach(
    (image, index) => {

      console.log(
        `${index + 1}. ${image}`
      );

    }
  );

  return unique;

}

// ============================================================
// EXTRACT DESCRIPTION
// ============================================================

async function extractDescriptionFromPage(
  url
) {
  const html =
    await requestPage(url);

  const $ =
    cheerio.load(html);

  $(
    "script, style, noscript, iframe, svg"
  ).remove();

  const selectors = [
    "[itemprop='description']",
    ".product-description",
    ".product__description",
    ".description",
    "#description",
  ];

  for (
    const selector of selectors
  ) {
    const block =
      $(selector).first();

    if (block.length) {
      const text =
        block
          .text()
          .replace(/\u00a0/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      if (text.length > 30) {
        console.log(
          "📝 Описание найдено"
        );

        return text;
      }
    }
  }

  return null;
}

// ============================================================
// SAVE PRODUCT
// ============================================================

async function saveProductData(
  productId,
  images,
  description
) {
  if (images.length > 0) {
    await query(
      `
      UPDATE products
      SET
        images = $1::jsonb,
        updated_at = NOW()
      WHERE id = $2
      `,
      [
        JSON.stringify(images),
        productId,
      ]
    );

    console.log(
      `💾 Сохранено фото: ${images.length}`
    );
  }

  if (description) {
    await query(
      `
      UPDATE products
      SET
        description = $1,
        updated_at = NOW()
      WHERE id = $2
      `,
      [
        description,
        productId,
      ]
    );

    console.log(
      "💾 Описание сохранено"
    );
  }
}

// ============================================================
// MAIN
// ============================================================

export async function findProductImages(
  product
) {
  console.log("");

  console.log(
    "===================================="
  );

  console.log(
    "🚀 GALLERY MOBILE PARSER"
  );

  console.log(
    "===================================="
  );

  console.log(
    `📦 ${product.title}`
  );

  const page =
    await findProductPage(product);

  if (!page) {
    console.log(
      "❌ Товар не найден"
    );

    return {
      success: false,
      images: [],
      matches: [],
    };
  }

  console.log("");

  console.log(
    "🌐 СТРАНИЦА ТОВАРА:"
  );

  console.log(page.url);

  const images =
    await extractImagesFromPage(
      page.url
    );

  let description = null;

  try {
    description =
      await extractDescriptionFromPage(
        page.url
      );

  } catch (error) {
    console.log(
      "⚠️ Описание получить не удалось:",
      error.message
    );
  }

  if (
    images.length > 0 ||
    description
  ) {
    await saveProductData(
      product.id,
      images,
      description
    );
  }

  return {
    success:
      images.length > 0,

    productId:
      product.id,

    productTitle:
      product.title,

    page:
      page.url,

    images,

    description,

    matches: [
      {
        url: page.url,
        title: page.title,
        score: page.score,
      },
    ],
  };
}

// ============================================================
// PARSE ONE PRODUCT
// ============================================================

export async function parseOneProduct(
  productId
) {
  console.log(
    `🔍 Получаем товар: ${productId}`
  );

  const result =
    await query(
      `
      SELECT *
      FROM products
      WHERE id = $1
      LIMIT 1
      `,
      [productId]
    );

  if (!result.rows.length) {
    throw new Error(
      `Товар ${productId} не найден`
    );
  }

  return await findProductImages(
    result.rows[0]
  );
}

// ============================================================
// SYNC PRODUCTS
// ============================================================

export async function syncProducts(
  limit = 10
) {
  console.log("");

  console.log(
    "===================================="
  );

  console.log(
    "🔄 СИНХРОНИЗАЦИЯ GALLERY MOBILE"
  );

  console.log(
    "===================================="
  );

  const result =
    await query(
      `
      SELECT *
      FROM products
      ORDER BY title
      LIMIT $1
      `,
      [limit]
    );

  console.log(
    `📦 Товаров: ${result.rows.length}`
  );

  let success = 0;
  let failed = 0;

  for (
    let i = 0;
    i < result.rows.length;
    i++
  ) {
    const product =
      result.rows[i];

    console.log("");

    console.log(
      `📦 ${i + 1}/${result.rows.length}`
    );

    console.log(
      `➡️ ${product.title}`
    );

    try {
      const parsed =
        await findProductImages(
          product
        );

      if (parsed.success) {
        success++;

        console.log(
          "✅ УСПЕШНО"
        );

      } else {
        failed++;

        console.log(
          "❌ НЕ НАЙДЕН"
        );
      }

    } catch (error) {
      failed++;

      console.error(
        "❌ ОШИБКА:",
        error.message
      );
    }

    // Пауза между товарами

    if (
      i <
      result.rows.length - 1
    ) {
      await new Promise(
        (resolve) =>
          setTimeout(resolve, 1500)
      );
    }
  }

  console.log("");

  console.log(
    "===================================="
  );

  console.log(
    "🏁 ГОТОВО"
  );

  console.log(
    `📦 Всего: ${result.rows.length}`
  );

  console.log(
    `✅ Успешно: ${success}`
  );

  console.log(
    `❌ Ошибки: ${failed}`
  );

  return {
    total:
      result.rows.length,

    success,

    failed,
  };
}