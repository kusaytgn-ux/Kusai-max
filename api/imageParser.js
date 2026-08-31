import "dotenv/config";

import { fetch } from "undici";
import * as cheerio from "cheerio";

import { query } from "./postgres.js";

/**
 * ============================================================
 * CONFIG
 * ============================================================
 */

const STILTV_BASE = "https://stiltv.ru";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/139 Safari/537.36";

/**
 * ============================================================
 * CATEGORY MAP
 * ============================================================
 */

const CATEGORY_MAP = {
  // =========================
  // IPHONE
  // =========================

  "iphone 17 pro max":
    "https://stiltv.ru/apple-iphone/iphone-17-pro-max",

  "iphone 17 pro":
    "https://stiltv.ru/apple-iphone/iphone-17-pro",

  "iphone air":
    "https://stiltv.ru/apple-iphone/iphone-air",

  "iphone 17":
    "https://stiltv.ru/apple-iphone/apple-iphone-17",

  "iphone 16":
    "https://stiltv.ru/apple-iphone/apple-iphone-16",

  "iphone 15 plus":
    "https://stiltv.ru/apple-iphone/apple-iphone-15-plus",

  "iphone 15":
    "https://stiltv.ru/apple-iphone/apple-iphone-15",

  // =========================
  // AIRPODS
  // =========================

  "airpods 4":
    "https://stiltv.ru/apple/apple-airpods/apple-airpods-4-2024",

  "airpods pro 3":
    "https://stiltv.ru/apple/apple-airpods/airpods-pro-3",

  "airpods max":
    "https://stiltv.ru/apple/apple-airpods/apple-airpods-max",

  // =========================
  // APPLE WATCH
  // =========================

  "apple watch ultra 3":
    "https://stiltv.ru/apple-watch/apple-watch-ultra-3",

  "apple watch series 11":
    "https://stiltv.ru/apple-watch/apple-watch-series-11-aluminum",

  "apple watch ultra 2":
    "https://stiltv.ru/apple-watch/apple-watch-ultra-2",

  // =========================
  // MAC
  // =========================

  macbook:
    "https://stiltv.ru/apple/apple-macbook",

  "imac 24 2024":
    "https://stiltv.ru/apple/kompyutery-apple/imac-24-2024",

  "imac 24 2023":
    "https://stiltv.ru/apple/kompyutery-apple/imac-24-2023",

  // =========================
  // IPAD
  // =========================

  "ipad 11":
    "https://stiltv.ru/apple/apple-ipad/apple-ipad-11-2025",

  ipad_accessories:
    "https://stiltv.ru/apple/apple-ipad/apple-stilusy-klaviatury-dlya-ipad",

  // =========================
  // DYSON
  // =========================

  dyson:
    "https://stiltv.ru/dyson-catalog",

  // =========================
  // SAMSUNG
  // =========================

  samsung:
    "https://stiltv.ru/telefonyi/samsung-smarfoni",

  // =========================
  // PLAYSTATION
  // =========================

  playstation:
    "https://stiltv.ru/igrovye-pristavki",

  // =========================
  // YANDEX
  // =========================

  yandex:
    "https://stiltv.ru/audiotehnika/besprovodnye-akusticheskie-sistemy/?page=4",
};

/**
 * ============================================================
 * TEXT HELPERS
 * ============================================================
 */

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/iphone/g, "iphone")
    .replace(/гбайт/g, "gb")
    .replace(/гигабайт/g, "gb")
    .replace(/гб/g, "gb")
    .replace(/терабайт/g, "tb")
    .replace(/тб/g, "tb")
    .replace(/[()]/g, " ")
    .replace(/[,+]/g, " ")
    .replace(/[-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(url) {
  if (!url) return null;

  const value = String(url).trim();

  if (!value) return null;

  if (value.startsWith("//")) {
    return `https:${value}`;
  }

  if (value.startsWith("/")) {
    return `${STILTV_BASE}${value}`;
  }

  if (
    value.startsWith("https://") ||
    value.startsWith("http://")
  ) {
    return value;
  }

  return null;
}

/**
 * ============================================================
 * COLORS
 * ============================================================
 */

const COLOR_ALIASES = {
  black: [
    "black",
    "черный",
    "чёрный",
    "space black",
    "jet black",
    "midnight",
    "titanium black",
  ],

  white: [
    "white",
    "белый",
    "белая",
    "cloud white",
    "starlight",
  ],

  blue: [
    "blue",
    "синий",
    "голубой",
    "sky blue",
    "deep blue",
    "navy",
  ],

  silver: [
    "silver",
    "серебристый",
    "серебро",
  ],

  gray: [
    "gray",
    "grey",
    "серый",
    "space gray",
    "space grey",
    "graphite",
    "natural titanium",
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
    "золотая",
    "light gold",
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
  const normalized = normalizeText(text);

  for (const [color, aliases] of Object.entries(COLOR_ALIASES)) {
    for (const alias of aliases) {
      if (normalized.includes(normalizeText(alias))) {
        return color;
      }
    }
  }

  return "";
}

function getColorAliases(color) {
  return COLOR_ALIASES[color] || [];
}

/**
 * ============================================================
 * MEMORY
 * ============================================================
 */

function detectMemory(text) {
  const normalized = normalizeText(text);

  const slashMatch = normalized.match(
    /\b\d+\s*\/\s*(64|128|256|512|1024|2048)\b/i
  );

  if (slashMatch) {
    return `${slashMatch[1]}gb`;
  }

  const match = normalized.match(
    /\b(64|128|256|512|1024|2048)\s*(gb|tb)\b/i
  );

  if (match) {
    return `${match[1]}${match[2].toLowerCase()}`;
  }

  return "";
}

/**
 * ============================================================
 * REMOVE TECHNICAL WORDS
 * ============================================================
 */

function removeTechnicalWords(text) {
  return normalizeText(text)
    .replace(/\besim\b/gi, " ")
    .replace(/\be sim\b/gi, " ")
    .replace(/\be-sim\b/gi, " ")

    .replace(/\bsim\s*\+\s*esim\b/gi, " ")
    .replace(/\bsim\s*\+\s*e sim\b/gi, " ")
    .replace(/\bsim\s*\+\s*e-sim\b/gi, " ")

    .replace(/\b1sim\b/gi, " ")
    .replace(/\b2sim\b/gi, " ")

    .replace(/\bdual sim\b/gi, " ")
    .replace(/\bnano sim\b/gi, " ")
    .replace(/\bsim\b/gi, " ")

    .replace(/\b64\s*gb\b/gi, " ")
    .replace(/\b128\s*gb\b/gi, " ")
    .replace(/\b256\s*gb\b/gi, " ")
    .replace(/\b512\s*gb\b/gi, " ")
    .replace(/\b1024\s*gb\b/gi, " ")

    .replace(/\b64\b/g, " ")
    .replace(/\b128\b/g, " ")
    .replace(/\b256\b/g, " ")
    .replace(/\b512\b/g, " ")

    .replace(/\s+/g, " ")
    .trim();
}

/**
 * ============================================================
 * PRODUCT INFO
 * ============================================================
 */

export function getProductInfo(product) {
  const originalTitle = String(
    product.title || product.name || ""
  ).trim();

  let normalized = normalizeText(originalTitle);

  const memory = detectMemory(originalTitle);
  const color = detectColor(originalTitle);

  let categoryKey = "";
  let brand = "";
  let model = "";

  /**
   * ==========================================================
   * IPHONE
   * ==========================================================
   */

  if (
    /\biphone\b/i.test(originalTitle) ||
    /^(15|16|17|18)\b/.test(originalTitle)
  ) {
    brand = "apple";

    if (/17\s+pro\s+max/i.test(normalized)) {
      categoryKey = "iphone 17 pro max";
      model = "iphone 17 pro max";
    } else if (/17\s+pro/i.test(normalized)) {
      categoryKey = "iphone 17 pro";
      model = "iphone 17 pro";
    } else if (
      /\b17\s+air\b/i.test(normalized) ||
      /\biphone\s+air\b/i.test(normalized)
    ) {
      categoryKey = "iphone air";
      model = "iphone air";
    } else if (/\b17\b/.test(normalized)) {
      categoryKey = "iphone 17";
      model = "iphone 17";
    } else if (/\b16\b/.test(normalized)) {
      categoryKey = "iphone 16";
      model = "iphone 16";
    } else if (/15\s+plus/i.test(normalized)) {
      categoryKey = "iphone 15 plus";
      model = "iphone 15 plus";
    } else if (/\b15\b/.test(normalized)) {
      categoryKey = "iphone 15";
      model = "iphone 15";
    }
  }

  /**
   * ==========================================================
   * AIRPODS
   * ==========================================================
   */

  else if (/airpods/i.test(originalTitle)) {
    brand = "apple";

    if (/pro\s*3/i.test(normalized)) {
      categoryKey = "airpods pro 3";
      model = "airpods pro 3";
    } else if (/max/i.test(normalized)) {
      categoryKey = "airpods max";
      model = "airpods max";
    } else if (/\b4\b/.test(normalized)) {
      categoryKey = "airpods 4";
      model = "airpods 4";
    }
  }

  /**
   * ==========================================================
   * APPLE WATCH
   * ==========================================================
   */

  else if (
    /apple watch/i.test(originalTitle) ||
    /\bwatch ultra\b/i.test(originalTitle)
  ) {
    brand = "apple";

    if (/ultra\s*3/i.test(normalized)) {
      categoryKey = "apple watch ultra 3";
      model = "apple watch ultra 3";
    } else if (/ultra\s*2/i.test(normalized)) {
      categoryKey = "apple watch ultra 2";
      model = "apple watch ultra 2";
    } else if (
      /series\s*11/i.test(normalized) ||
      /\b11\b/.test(normalized)
    ) {
      categoryKey = "apple watch series 11";
      model = "apple watch series 11";
    }
  }

  /**
   * ==========================================================
   * MACBOOK
   * ==========================================================
   */

  else if (/macbook/i.test(normalized)) {
    brand = "apple";
    categoryKey = "macbook";

    model = removeTechnicalWords(normalized)
      .replace(/\bapple\b/g, "")
      .trim();
  }

  /**
   * ==========================================================
   * IMAC
   * ==========================================================
   */

  else if (/imac/i.test(normalized)) {
    brand = "apple";

    if (/2024/.test(normalized)) {
      categoryKey = "imac 24 2024";
      model = "imac 24";
    } else if (/2023/.test(normalized)) {
      categoryKey = "imac 24 2023";
      model = "imac 24";
    }
  }

  /**
   * ==========================================================
   * IPAD
   * ==========================================================
   */

  else if (/ipad/i.test(normalized)) {
    brand = "apple";

    if (
      /стилус|клавиатур|keyboard|pencil/i.test(
        originalTitle
      )
    ) {
      categoryKey = "ipad_accessories";
      model = removeTechnicalWords(normalized);
    } else if (/\b11\b/.test(normalized)) {
      categoryKey = "ipad 11";
      model = "ipad 11";
    }
  }

  /**
   * ==========================================================
   * DYSON
   * ==========================================================
   */

  else if (/dyson/i.test(normalized)) {
    brand = "dyson";
    categoryKey = "dyson";

    model = removeTechnicalWords(normalized)
      .replace(/\bdyson\b/g, "")
      .trim();
  }

  /**
   * ==========================================================
   * SAMSUNG
   * ==========================================================
   */

  else if (
    /samsung/i.test(normalized) ||
    /galaxy/i.test(normalized)
  ) {
    brand = "samsung";
    categoryKey = "samsung";

    model = removeTechnicalWords(normalized)
      .replace(/\bsamsung\b/g, "")
      .replace(/\bgalaxy\b/g, "galaxy")
      .trim();
  }

  /**
   * ==========================================================
   * PLAYSTATION
   * ==========================================================
   */

  else if (
    /playstation/i.test(normalized) ||
    /\bps[45]\b/i.test(normalized)
  ) {
    brand = "sony";
    categoryKey = "playstation";

    model = removeTechnicalWords(normalized)
      .replace(/\bsony\b/g, "")
      .replace(/\bplaystation\b/g, "playstation")
      .trim();
  }

  /**
   * ==========================================================
   * YANDEX
   * ==========================================================
   */

  else if (
    /яндекс/i.test(originalTitle) ||
    /yandex/i.test(normalized) ||
    /станция/i.test(originalTitle)
  ) {
    brand = "yandex";
    categoryKey = "yandex";

    model = removeTechnicalWords(normalized)
      .replace(/\bяндекс\b/g, "")
      .replace(/\byandex\b/g, "")
      .trim();
  }

  return {
    originalTitle,
    normalized,
    brand,
    categoryKey,
    categoryUrl:
      CATEGORY_MAP[categoryKey] || "",
    model,
    memory,
    color,
  };
}

/**
 * ============================================================
 * EXTRACT PRODUCT LINKS
 * ============================================================
 */

async function extractProductLinksFromCategory(url) {
  console.log(`📂 Открываем категорию: ${url}`);

  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Ошибка категории STILTV: HTTP ${response.status}`
    );
  }

  const html = await response.text();

  const $ = cheerio.load(html);

  const links = [];

  $("a").each((_, element) => {
    const href = $(element).attr("href");

    if (!href) return;

    const productUrl = normalizeUrl(href);

    if (!productUrl) return;

    if (!productUrl.startsWith(STILTV_BASE)) return;

    if (!productUrl.includes(".html")) return;

    const lowerUrl = productUrl.toLowerCase();

    if (
      lowerUrl.includes("/cart") ||
      lowerUrl.includes("/login") ||
      lowerUrl.includes("/search") ||
      lowerUrl.includes("/contacts")
    ) {
      return;
    }

    const title = $(element)
      .text()
      .replace(/\s+/g, " ")
      .trim();

    links.push({
      url: productUrl,
      title,
      normalizedUrl: normalizeText(
        decodeURIComponent(productUrl)
      ),
      normalizedTitle: normalizeText(title),
    });
  });

  const unique = Array.from(
    new Map(
      links.map((item) => [
        item.url,
        item,
      ])
    ).values()
  );

  console.log(`🔗 Найдено ссылок: ${unique.length}`);

  return unique;
}

/**
 * ============================================================
 * SCORE PRODUCT LINK
 * ============================================================
 */

function calculateLinkScore(productInfo, candidate) {
  const candidateText = normalizeText(
    `${candidate.title} ${decodeURIComponent(candidate.url)}`
  );

  let score = 0;

  /**
   * MODEL
   */

  const modelWords = normalizeText(
    productInfo.model
  )
    .split(" ")
    .filter(
      (word) =>
        word.length >= 2 &&
        ![
          "iphone",
          "apple",
          "samsung",
          "sony",
          "dyson",
        ].includes(word)
    );

  let matchedModelWords = 0;

  for (const word of modelWords) {
    if (candidateText.includes(word)) {
      matchedModelWords++;
    }
  }

  if (
    modelWords.length > 0 &&
    matchedModelWords === modelWords.length
  ) {
    score += 70;
  } else if (
    modelWords.length > 0 &&
    matchedModelWords >=
      Math.max(1, modelWords.length - 1)
  ) {
    score += 30;
  } else {
    return {
      score: 0,
      modelMatched: false,
      colorMatched: false,
      memoryMatched: false,
    };
  }

  /**
   * COLOR
   */

  let colorMatched = false;

  if (productInfo.color) {
    const aliases = getColorAliases(
      productInfo.color
    );

    colorMatched = aliases.some((alias) =>
      candidateText.includes(normalizeText(alias))
    );

    if (colorMatched) {
      score += 25;
    }
  }

  /**
   * MEMORY
   */

  let memoryMatched = false;

  if (productInfo.memory) {
    const memoryText = productInfo.memory;

    if (
      candidateText.includes(memoryText) ||
      candidateText.includes(
        memoryText.replace("gb", " gb")
      )
    ) {
      memoryMatched = true;
      score += 5;
    }
  }

  return {
    score,
    modelMatched:
      matchedModelWords > 0,
    colorMatched,
    memoryMatched,
  };
}

/**
 * ============================================================
 * FIND PRODUCT PAGE
 * ============================================================
 */

async function findProductPage(product) {
  const info = getProductInfo(product);

  console.log("");
  console.log("🔎 АНАЛИЗ ТОВАРА");
  console.log(`📦 ${info.originalTitle}`);
  console.log(`🏷 Бренд: ${info.brand || "не определён"}`);
  console.log(`📱 Модель: ${info.model || "не определена"}`);
  console.log(`🎨 Цвет: ${info.color || "не указан"}`);
  console.log(`💾 Память: ${info.memory || "не указана"}`);
  console.log(`📂 Категория: ${info.categoryKey || "не определена"}`);

  if (!info.categoryUrl) {
    console.log("❌ Для товара нет категории STILTV");

    return null;
  }

  const links =
    await extractProductLinksFromCategory(
      info.categoryUrl
    );

  if (!links.length) {
    return null;
  }

  const candidates = [];

  for (const link of links) {
    const result =
      calculateLinkScore(info, link);

    if (result.score > 0) {
      candidates.push({
        ...link,
        ...result,
      });
    }
  }

  candidates.sort(
    (a, b) => b.score - a.score
  );

  console.log("");
  console.log(
    `🎯 Подходящих ссылок: ${candidates.length}`
  );

  for (const candidate of candidates.slice(0, 10)) {
    console.log(
      `⭐ ${candidate.score} — ${candidate.title || candidate.url}`
    );

    console.log(candidate.url);
  }

  if (!candidates.length) {
    return null;
  }

  /**
   * Сначала ищем модель + цвет
   */

  const exactColorMatch =
    candidates.find(
      (item) =>
        item.modelMatched &&
        item.colorMatched
    );

  if (exactColorMatch) {
    console.log("");
    console.log("✅ Найдена ссылка с нужным цветом");

    return exactColorMatch;
  }

  /**
   * Если цвет не найден — берём лучшую модель
   */

  console.log("");
  console.log(
    "⚠️ Точный цвет не найден, используем лучшее совпадение модели"
  );

  return candidates[0];
}

/**
 * ============================================================
 * EXTRACT IMAGES
 * ============================================================
 */

async function extractImagesFromPage(url) {
  console.log("");
  console.log(`🌐 Открываем страницу товара: ${url}`);

  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Ошибка страницы товара: HTTP ${response.status}`
    );
  }

  const html = await response.text();

  const $ = cheerio.load(html);

  const images = [];

  function addImage(src) {
    if (!src) return;

    const imageUrl =
      normalizeUrl(src);

    if (!imageUrl) return;

    const lower =
      imageUrl.toLowerCase();

    if (
      !/\.(jpg|jpeg|png|webp)(\?|$)/i.test(
        lower
      )
    ) {
      return;
    }

    if (
      lower.includes("logo") ||
      lower.includes("icon") ||
      lower.includes("favicon") ||
      lower.includes("banner") ||
      lower.includes("sprite") ||
      lower.includes("placeholder") ||
      lower.includes("payment") ||
      lower.includes("delivery")
    ) {
      return;
    }

    images.push(imageUrl);
  }

  $("img").each((_, element) => {
    const src =
      $(element).attr("data-original") ||
      $(element).attr("data-src") ||
      $(element).attr("data-lazy-src") ||
      $(element).attr("src");

    addImage(src);

    const srcset =
      $(element).attr("srcset");

    if (srcset) {
      const variants =
        srcset.split(",");

      for (const variant of variants) {
        const image =
          variant.trim().split(/\s+/)[0];

        addImage(image);
      }
    }
  });

  /**
   * UNIQUE
   */

  const unique =
    Array.from(new Set(images));

  console.log(
    `🖼 Найдено изображений: ${unique.length}`
  );

  return unique.slice(0, 10);
}

/**
 * ============================================================
 * EXTRACT DESCRIPTION
 * ============================================================
 */

async function extractDescriptionFromPage(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    return null;
  }

  const html = await response.text();

  const $ = cheerio.load(html);

  const block =
    $("#tab-description");

  if (!block.length) {
    return null;
  }

  const clone =
    block.clone();

  clone.find(
    "script, style, iframe"
  ).remove();

  const description =
    clone
      .text()
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  return description || null;
}

/**
 * ============================================================
 * SAVE PRODUCT
 * ============================================================
 */

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
      `💾 Сохранено изображений: ${images.length}`
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

    console.log("💾 Описание сохранено");
  }
}

/**
 * ============================================================
 * FIND PRODUCT IMAGES
 * ============================================================
 */

export async function findProductImages(product) {
  console.log("");
  console.log(
    "===================================="
  );
  console.log("🖼 IMAGE PARSER");
  console.log(
    "===================================="
  );

  console.log(
    `📦 ${product.title || product.name}`
  );

  const page =
    await findProductPage(product);

  if (!page) {
    console.log(
      "❌ Страница товара не найдена"
    );

    return {
      success: false,
      images: [],
      matches: [],
    };
  }

  console.log("");
  console.log("🎯 НАЙДЕН ТОВАР");
  console.log(page.url);

  const images =
    await extractImagesFromPage(
      page.url
    );

  const description =
    await extractDescriptionFromPage(
      page.url
    );

  if (images.length > 0 || description) {
    await saveProductData(
      product.id,
      images,
      description
    );
  }

  return {
    success: images.length > 0,

    productId:
      product.id,

    productTitle:
      product.title,

    page:
      page.url,

    images,

    matches: [
      {
        url: page.url,
        title: page.title,
        score: page.score,
      },
    ],
  };
}

/**
 * ============================================================
 * PARSE ONE PRODUCT
 * ============================================================
 */

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

  return findProductImages(
    result.rows[0]
  );
}

/**
 * ============================================================
 * SYNC PRODUCTS
 * ============================================================
 */

export async function syncProducts(
  limit = 10
) {
  console.log("");
  console.log(
    "===================================="
  );
  console.log(
    "🔄 СИНХРОНИЗАЦИЯ ТОВАРОВ"
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
    `📦 Найдено товаров: ${result.rows.length}`
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
      "===================================="
    );

    console.log(
      `📦 ТОВАР ${i + 1} / ${result.rows.length}`
    );

    console.log(
      "===================================="
    );

    console.log(
      `📱 ${product.title}`
    );

    try {
      const parsed =
        await findProductImages(
          product
        );

      if (
        parsed.success &&
        parsed.images.length > 0
      ) {
        success++;

        console.log(
          `✅ Успешно: ${product.title}`
        );
      } else {
        failed++;

        console.log(
          `⚠️ Не найден: ${product.title}`
        );
      }
    } catch (error) {
      failed++;

      console.error(
        `❌ Ошибка ${product.title}:`,
        error.message
      );
    }

    if (
      i < result.rows.length - 1
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
    "🏁 СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА"
  );
  console.log(
    "===================================="
  );

  console.log(
    `📦 Всего: ${result.rows.length}`
  );

  console.log(
    `✅ Успешно: ${success}`
  );

  console.log(
    `❌ Не найдено: ${failed}`
  );

  return {
    total:
      result.rows.length,

    success,

    failed,
  };
}