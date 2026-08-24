import "dotenv/config";
import { fetch } from "undici";
import { query as pgQuery } from "../api/postgres.js";

const SOURCE_ORIGIN = "https://stiltv.ru";

const DEFAULT_LIMIT = 100;

const SAFE_MIN_SCORE = 80;
const REQUEST_DELAY_MS = 350;

const MAX_CATEGORY_DEPTH = 2;
const MAX_CATEGORY_PAGES = 40;
const MAX_IMAGES = 6;

const args = process.argv.slice(2);

const SAFE_APPLY = args.includes("--apply-safe");
const NORMAL_APPLY = args.includes("--apply");

const DRY_RUN = !SAFE_APPLY && !NORMAL_APPLY;

function getArgValue(name, fallback) {
  const index = args.indexOf(name);

  if (index === -1) {
    return fallback;
  }

  return args[index + 1] ?? fallback;
}

const LIMIT = Math.max(
  1,
  Math.min(
    2000,
    Number(getArgValue("--limit", DEFAULT_LIMIT))
  )
);

function log(message = "") {
  console.log(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ============================================================
   TEXT
============================================================ */

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[×х]/g, "x")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/гб/gi, "gb")
    .replace(/тб/gi, "tb")
    .replace(/[^a-zа-я0-9+]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ============================================================
   MODEL
============================================================ */

function normalizeModelText(value) {
  let text = normalizeText(value);

  text = text
    .replace(/^apple\s+/i, "")
    .replace(/^appe\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

function extractModel(value) {
  const text = normalizeText(value);

  /* AirPods */

  if (/\bairpods\s+max\s+2\b/i.test(text)) {
    return "airpods max 2";
  }

  if (/\bairpods\s+max\b/i.test(text)) {
    return "airpods max";
  }

  if (
    /\bairpods\s+4\b/i.test(text) &&
    (
      /\banc\b/i.test(text) ||
      /active\s+noise\s+cancellation/i.test(text)
    )
  ) {
    return "airpods 4 anc";
  }

  if (/\bairpods\s+4\b/i.test(text)) {
    return "airpods 4";
  }

  if (/\bairpods\s+pro\s+3\b/i.test(text)) {
    return "airpods pro 3";
  }

  if (/\bairpods\s+pro\b/i.test(text)) {
    return "airpods pro";
  }

  if (/\bearpods\b/i.test(text)) {
    return "earpods";
  }

  /* AirTag */

  if (/\bairtag\b/i.test(text)) {
    return "airtag";
  }

  /* iMac */

  if (/\bimac\b/i.test(text) || /\baimac\b/i.test(text)) {
    return "imac";
  }

  /* iPad Air */

  if (/\bipad\s+air\s+13\b/i.test(text)) {
    return "ipad air 13";
  }

  if (/\bipad\s+air\s+11\b/i.test(text)) {
    return "ipad air 11";
  }

  if (/\bipad\s+air\b/i.test(text)) {
    return "ipad air";
  }

  /* iPad Pro */

  if (/\bipad\s+pro\s+13\b/i.test(text)) {
    return "ipad pro 13";
  }

  if (/\bipad\s+pro\s+12\.9\b/i.test(text)) {
    return "ipad pro 12.9";
  }

  if (/\bipad\s+pro\s+11\b/i.test(text)) {
    return "ipad pro 11";
  }

  if (/\bipad\s+pro\b/i.test(text)) {
    return "ipad pro";
  }

  /* iPad */

  if (/\bipad\s+11\b/i.test(text)) {
    return "ipad 11";
  }

  if (/\bipad\s+10\.9\b/i.test(text)) {
    return "ipad 10.9";
  }

  if (/\bipad\s+10\.2\b/i.test(text)) {
    return "ipad 10.2";
  }

  if (/\bipad\b/i.test(text)) {
    return "ipad";
  }

  /* iPhone */

  const iphonePatterns = [
    /\biphone\s+17\s+pro\s+max\b/i,
    /\biphone\s+17\s+pro\b/i,
    /\biphone\s+17\s+air\b/i,
    /\biphone\s+17\b/i,

    /\biphone\s+16\s+pro\s+max\b/i,
    /\biphone\s+16\s+pro\b/i,
    /\biphone\s+16\s+plus\b/i,
    /\biphone\s+16\b/i,

    /\biphone\s+15\s+pro\s+max\b/i,
    /\biphone\s+15\s+pro\b/i,
    /\biphone\s+15\s+plus\b/i,
    /\biphone\s+15\b/i,

    /\biphone\s+14\s+pro\s+max\b/i,
    /\biphone\s+14\s+pro\b/i,
    /\biphone\s+14\s+plus\b/i,
    /\biphone\s+14\b/i,

    /\biphone\s+13\s+pro\s+max\b/i,
    /\biphone\s+13\s+pro\b/i,
    /\biphone\s+13\s+mini\b/i,
    /\biphone\s+13\b/i,

    /\biphone\s+12\s+pro\s+max\b/i,
    /\biphone\s+12\s+pro\b/i,
    /\biphone\s+12\s+mini\b/i,
    /\biphone\s+12\b/i,

    /\biphone\s+11\s+pro\s+max\b/i,
    /\biphone\s+11\s+pro\b/i,
    /\biphone\s+11\b/i,

    /\biphone\s+se\b/i,
  ];

  for (const pattern of iphonePatterns) {
    const match = text.match(pattern);

    if (match) {
      return normalizeModelText(match[0]);
    }
  }

  /* Other brands */

  const otherPatterns = [
    /\bgalaxy\s+[a-z]\d+(?:\s+ultra|\s+\+|\s+edge|\s+fold|\s+flip)?\b/i,
    /\bxiaomi\s+[a-z0-9-]+(?:\s+[a-z0-9-]+){0,3}/i,
    /\bredmi\s+[a-z0-9-]+(?:\s+[a-z0-9-]+){0,3}/i,
    /\bdyson\s+[a-z0-9-]+(?:\s+[a-z0-9-]+){0,4}/i,
  ];

  for (const pattern of otherPatterns) {
    const match = text.match(pattern);

    if (match) {
      return normalizeModelText(match[0]);
    }
  }

  return "";
}

/* ============================================================
   MODEL EQUALITY
============================================================ */

function modelsEqual(a, b) {
  const left = normalizeModelText(a);
  const right = normalizeModelText(b);

  if (!left || !right) {
    return false;
  }

  if (left === right) {
    return true;
  }

  /*
   * iPhone Air
   */

  if (
    (left === "iphone air" && right === "iphone 17 air") ||
    (left === "iphone 17 air" && right === "iphone air")
  ) {
    return true;
  }

  /*
   * iMac
   */

  if (left === "imac" && right === "imac") {
    return true;
  }

  /*
   * Более общий iPad Air.
   *
   * Например:
   * ipad air 11
   * ipad air
   *
   * разрешаем как близкое совпадение,
   * но потом память/цвет увеличат точность.
   */

  if (
    (left === "ipad air 11" && right === "ipad air") ||
    (left === "ipad air" && right === "ipad air 11")
  ) {
    return true;
  }

  if (
    (left === "ipad pro 11" && right === "ipad pro") ||
    (left === "ipad pro" && right === "ipad pro 11")
  ) {
    return true;
  }

  /*
   * AirPods нельзя смешивать.
   */

  if (
    left === "airpods 4 anc" &&
    right === "airpods 4"
  ) {
    return false;
  }

  if (
    left === "airpods 4" &&
    right === "airpods 4 anc"
  ) {
    return false;
  }

  if (
    left === "airpods max 2" &&
    right === "airpods max"
  ) {
    return false;
  }

  if (
    left === "airpods max" &&
    right === "airpods max 2"
  ) {
    return false;
  }

  return false;
}

/* ============================================================
   MEMORY
============================================================ */

function extractMemory(value) {
  const text = normalizeText(value);

  const explicit = text.match(
    /(\d+(?:\.\d+)?)\s*(gb|tb)\b/i
  );

  if (explicit) {
    const amount = explicit[1];
    const unit = explicit[2].toLowerCase();

    return `${amount}${unit}`;
  }

  const bare = text.match(
    /(?:^|\s)(64|128|256|512|1024)(?=\s|$)/i
  );

  if (!bare) {
    return null;
  }

  const amount = Number(bare[1]);

  if (amount === 1024) {
    return "1tb";
  }

  return `${amount}gb`;
}

/* ============================================================
   COLOR
============================================================ */

const COLOR_ALIASES = [
  ["space black", "space black"],
  ["space gray", "space gray"],
  ["space grey", "space gray"],
  ["cosmic orange", "cosmic orange"],
  ["cloud white", "cloud white"],
  ["deep blue", "deep blue"],
  ["natural titanium", "natural titanium"],
  ["black titanium", "black titanium"],
  ["white titanium", "white titanium"],
  ["desert titanium", "desert titanium"],

  ["starlight", "starlight"],
  ["midnight", "midnight"],
  ["sage", "sage"],
  ["light gold", "light gold"],
  ["sky blue", "sky blue"],
  ["mist blue", "mist blue"],
  ["lavender", "lavender"],

  ["черный", "black"],
  ["чёрный", "black"],
  ["черная", "black"],
  ["чёрная", "black"],
  ["black", "black"],

  ["белый", "white"],
  ["белая", "white"],
  ["white", "white"],

  ["синий", "blue"],
  ["голубой", "blue"],
  ["blue", "blue"],

  ["зеленый", "green"],
  ["зелёный", "green"],
  ["green", "green"],

  ["розовый", "pink"],
  ["pink", "pink"],

  ["фиолетовый", "purple"],
  ["фиолетовыи", "purple"],
  ["purple", "purple"],
  ["violet", "purple"],

  ["серебристый", "silver"],
  ["серебро", "silver"],
  ["silver", "silver"],

  ["золотой", "gold"],
  ["золотои", "gold"],
  ["gold", "gold"],

  ["оранжевый", "orange"],
  ["оранжевый", "orange"],
  ["orange", "orange"],
];

function normalizeColor(value) {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  const sorted = [...COLOR_ALIASES].sort(
    (a, b) => b[0].length - a[0].length
  );

  for (const [source, target] of sorted) {
    if (text.includes(source)) {
      return target;
    }
  }

  return null;
}

function colorsEqual(a, b) {
  if (!a || !b) {
    return true;
  }

  const left = normalizeColor(a);
  const right = normalizeColor(b);

  if (!left || !right) {
    return true;
  }

  if (left === right) {
    return true;
  }

  const aliases = [
    ["black", "space black"],
    ["black", "midnight"],
    ["blue", "deep blue"],
    ["blue", "sky blue"],
    ["blue", "mist blue"],
    ["purple", "violet"],
    ["white", "cloud white"],
    ["green", "sage"],
    ["orange", "cosmic orange"],
  ];

  return aliases.some(
    ([x, y]) =>
      (left === x && right === y) ||
      (left === y && right === x)
  );
}

/* ============================================================
   SIM
============================================================ */

function extractSimType(value) {
  const text = normalizeText(value);

  const hasEsim = /\besim\b/i.test(text);

  const hasNanoSim =
    /\bnano\s*sim\b/i.test(text) ||
    /\bnanosim\b/i.test(text);

  const hasSim = /\bsim\b/i.test(text);

  if (hasNanoSim && hasEsim) {
    return "nano+esim";
  }

  if (hasEsim && !hasNanoSim && !hasSim) {
    return "esim";
  }

  if (hasNanoSim && !hasEsim) {
    return "nano-sim";
  }

  if (hasSim && hasEsim) {
    return "nano+esim";
  }

  return null;
}

/* ============================================================
   CATEGORY
============================================================ */

function getCategoryPath(product) {
  const model = extractModel(
    `${product.title} ${product.name ?? ""}`
  );

  switch (normalizeText(model)) {
    case "iphone 15":
      return "/apple-iphone/apple-iphone-15";

    case "iphone 15 plus":
      return "/apple-iphone/apple-iphone-15-plus";

    case "iphone 15 pro":
      return "/apple-iphone/apple-iphone-15-pro";

    case "iphone 15 pro max":
      return "/apple-iphone/apple-iphone-15-pro-max";

    case "iphone 16":
      return "/apple-iphone/apple-iphone-16";

    case "iphone 16 plus":
      return "/apple-iphone/apple-iphone-16-plus";

    case "iphone 16 pro":
      return "/apple-iphone/apple-iphone-16-pro";

    case "iphone 16 pro max":
      return "/apple-iphone/Apple-iPhone-16-Pro-Max";

    case "iphone 17":
      return "/apple-iphone/apple-iphone-17";

    case "iphone 17 air":
      return "/apple-iphone/iphone-air";

    case "iphone 17 pro":
      return "/apple-iphone/iphone-17-pro";

    case "iphone 17 pro max":
      return "/apple-iphone/iphone-17-pro-max";

    case "imac":
      return "/apple/kompyutery-apple/imac-24-2024";

    case "airpods 4":
    case "airpods 4 anc":
      return "/apple/apple-airpods/apple-airpods-4-2024";

    case "airpods max":
    case "airpods max 2":
      return "/apple/apple-airpods/apple-airpods-max";

    case "airpods pro":
    case "airpods pro 3":
      return "/apple/apple-airpods/airpods-pro-3";

    case "airtag":
      return "/apple/apple-ipad";

    case "ipad":
    case "ipad 11":
    case "ipad 10":
    case "ipad 10.2":
    case "ipad 10.9":
    case "ipad air":
    case "ipad air 11":
    case "ipad air 13":
    case "ipad pro":
    case "ipad pro 11":
    case "ipad pro 12.9":
    case "ipad pro 13":
      return "/apple/apple-ipad";

    default:
      return null;
  }
}

/* ============================================================
   FETCH
============================================================ */

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36",

      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

      "Accept-Language":
        "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    },

    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(
      `STILTV HTTP ${response.status}: ${url}`
    );
  }

  return response.text();
}

/* ============================================================
   HTML
============================================================ */

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtml(value) {
  return decodeHtml(
    String(value ?? "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(value) {
  if (!value) {
    return null;
  }

  try {
    return new URL(
      decodeHtml(value),
      SOURCE_ORIGIN
    ).href;
  } catch {
    return null;
  }
}

function extractAttribute(tag, name) {
  const regex = new RegExp(
    `${name}\\s*=\\s*["']([^"']+)["']`,
    "i"
  );

  return tag.match(regex)?.[1] ?? null;
}

/* ============================================================
   PRODUCT LINKS
============================================================ */

function isProductUrl(url) {
  if (!url) {
    return false;
  }

  const lower = url.toLowerCase();

  if (!lower.startsWith(SOURCE_ORIGIN)) {
    return false;
  }

  if (!lower.endsWith(".html")) {
    return false;
  }

  return true;
}

/* ============================================================
   CATEGORY PRODUCTS
============================================================ */

function parseCategoryProducts(html) {
  const products = [];
  const seen = new Set();

  const linkRegex =
    /<a\b[^>]*href=["']([^"']+\.html[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match;

  while ((match = linkRegex.exec(html))) {
    const url = absoluteUrl(match[1]);

    if (!isProductUrl(url)) {
      continue;
    }

    if (seen.has(url)) {
      continue;
    }

    const body = match[2];

    const imgTag =
      body.match(/<img\b[^>]*>/i)?.[0] ?? "";

    const alt = stripHtml(
      extractAttribute(imgTag, "alt")
    );

    const bodyTitle = stripHtml(body);

    const title = alt || bodyTitle;

    if (!title) {
      continue;
    }

    if (title.length < 5 || title.length > 400) {
      continue;
    }

    /*
     * Не берём служебные ссылки.
     */

    const lowerTitle = title.toLowerCase();

    if (
      lowerTitle.includes("купить") &&
      lowerTitle.length < 15
    ) {
      continue;
    }

    const thumbnail = absoluteUrl(
      extractAttribute(imgTag, "src") ||
      extractAttribute(imgTag, "data-src") ||
      extractAttribute(imgTag, "data-original")
    );

    seen.add(url);

    products.push({
      url,
      title,

      thumbnail,

      memory: extractMemory(title),

      color: normalizeColor(title),

      simType: extractSimType(title),

      model: extractModel(title),
    });
  }

  return products;
}

/* ============================================================
   CATEGORY LINKS
============================================================ */

function parseCategoryLinks(html) {
  const links = new Set();

  const regex =
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi;

  let match;

  while ((match = regex.exec(html))) {
    const url = absoluteUrl(match[1]);

    if (!url) {
      continue;
    }

    if (!url.startsWith(SOURCE_ORIGIN)) {
      continue;
    }

    if (!url.includes("/apple")) {
      continue;
    }

    if (url.endsWith(".html")) {
      continue;
    }

    if (
      url.includes("#") ||
      url.includes("?") ||
      url.includes("javascript:")
    ) {
      continue;
    }

    links.add(url);
  }

  return [...links];
}

/* ============================================================
   COLLECT PRODUCTS FROM CATEGORY TREE
============================================================ */

async function collectProductsFromCategory(
  rootUrl
) {
  const allProducts = [];
  const seenProducts = new Set();
  const seenPages = new Set();

  const queue = [
    {
      url: rootUrl,
      depth: 0,
    },
  ];

  while (
    queue.length > 0 &&
    seenPages.size < MAX_CATEGORY_PAGES
  ) {
    const current = queue.shift();

    if (!current) {
      break;
    }

    const {
      url,
      depth,
    } = current;

    if (seenPages.has(url)) {
      continue;
    }

    seenPages.add(url);

    log(
      `    🔎 category depth=${depth}: ${url}`
    );

    let html;

    try {
      html = await fetchHtml(url);
    } catch (error) {
      log(
        `    ⚠️ Не удалось открыть категорию: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`
      );

      continue;
    }

    const products =
      parseCategoryProducts(html);

    for (const product of products) {
      if (
        !seenProducts.has(product.url)
      ) {
        seenProducts.add(product.url);
        allProducts.push(product);
      }
    }

    log(
      `       товаров найдено: ${products.length}`
    );

    /*
     * Если нашли товары — всё равно
     * продолжаем один уровень вниз,
     * потому что нужная модель может
     * находиться в отдельной подкатегории.
     */

    if (depth < MAX_CATEGORY_DEPTH) {
      const links =
        parseCategoryLinks(html);

      for (const link of links) {
        if (seenPages.has(link)) {
          continue;
        }

        queue.push({
          url: link,
          depth: depth + 1,
        });
      }
    }

    await sleep(REQUEST_DELAY_MS);
  }

  return allProducts;
}

/* ============================================================
   TOKEN SIMILARITY
============================================================ */

function getTokens(value) {
  return normalizeText(value)
    .split(" ")
    .filter(Boolean);
}

function tokenSimilarity(a, b) {
  const left = new Set(getTokens(a));
  const right = new Set(getTokens(b));

  if (
    left.size === 0 ||
    right.size === 0
  ) {
    return 0;
  }

  let common = 0;

  for (const token of left) {
    if (right.has(token)) {
      common++;
    }
  }

  return (
    common /
    Math.max(left.size, right.size)
  );
}

/* ============================================================
   SCORE
============================================================ */

function scoreCandidate(
  product,
  candidate
) {
  const productText =
    `${product.title} ${product.name ?? ""}`;

  const productModel =
    extractModel(productText);

  const candidateModel =
    extractModel(candidate.title);

  if (
    !productModel ||
    !candidateModel
  ) {
    return 0;
  }

  if (
    !modelsEqual(
      productModel,
      candidateModel
    )
  ) {
    return 0;
  }

  let score = 60;

  /*
   * Model exact.
   */

  if (
    normalizeModelText(productModel) ===
    normalizeModelText(candidateModel)
  ) {
    score += 10;
  }

  /*
   * Memory.
   */

  const productMemory =
    extractMemory(
      `${product.title} ${product.memory ?? ""}`
    );

  const candidateMemory =
    candidate.memory;

  if (
    productMemory &&
    candidateMemory
  ) {
    if (
      productMemory ===
      candidateMemory
    ) {
      score += 20;
    } else {
      /*
       * Память есть, но другая —
       * почти наверняка не тот товар.
       */

      return 0;
    }
  }

  /*
   * Цвет.
   */

  const productColor =
    normalizeColor(
      `${product.title} ${product.color ?? ""}`
    );

  const candidateColor =
    candidate.color;

  if (
    productColor &&
    candidateColor
  ) {
    if (
      colorsEqual(
        productColor,
        candidateColor
      )
    ) {
      score += 10;
    } else {
      /*
       * Если оба цвета определены
       * и они разные — не match.
       */

      return 0;
    }
  }

  /*
   * Дополнительное сравнение названий.
   */

  const similarity =
    tokenSimilarity(
      productText,
      candidate.title
    );

  if (similarity >= 0.7) {
    score += 5;
  }

  return Math.min(
    100,
    score
  );
}

/* ============================================================
   IMAGE FILTER
============================================================ */

function isUsableImage(url) {
  if (!url) {
    return false;
  }

  const lower =
    url.toLowerCase();

  if (
    !lower.includes(
      "stiltv.ru/image/"
    )
  ) {
    return false;
  }

  if (
    /\.svg(?:\?|$)/i.test(lower)
  ) {
    return false;
  }

  if (
    /-(?:60x60|74x74|100x100|120x120|150x150|200x200)\.(?:png|jpg|jpeg|webp)(?:\?|$)/i.test(
      lower
    )
  ) {
    return false;
  }

  const forbidden = [
    "pickup",
    "express",
    "delivery",
    "logo",
    "favicon",
    "sprite",
    "icon",
    "yandex",
  ];

  if (
    forbidden.some(
      (word) =>
        lower.includes(word)
    )
  ) {
    return false;
  }

  return true;
}

/* ============================================================
   PRODUCT PAGE IMAGES
============================================================ */

function parseProductImages(
  html,
  expectedTitle
) {
  const images = [];
  const seen = new Set();

  const expectedModel =
    extractModel(expectedTitle);

  const expectedColor =
    normalizeColor(expectedTitle);

  function add(url) {
    const absolute =
      absoluteUrl(url);

    if (
      !isUsableImage(
        absolute
      )
    ) {
      return;
    }

    if (
      seen.has(absolute)
    ) {
      return;
    }

    seen.add(absolute);

    images.push(absolute);
  }

  const imgRegex =
    /<img\b[^>]*>/gi;

  let match;

  while (
    (match = imgRegex.exec(html))
  ) {
    const tag = match[0];

    const alt =
      stripHtml(
        extractAttribute(
          tag,
          "alt"
        )
      );

    if (alt) {
      const altModel =
        extractModel(alt);

      if (
        expectedModel &&
        altModel &&
        !modelsEqual(
          expectedModel,
          altModel
        )
      ) {
        continue;
      }

      const altColor =
        normalizeColor(alt);

      if (
        expectedColor &&
        altColor &&
        !colorsEqual(
          expectedColor,
          altColor
        )
      ) {
        continue;
      }
    }

    add(
      extractAttribute(
        tag,
        "data-src"
      )
    );

    add(
      extractAttribute(
        tag,
        "data-original"
      )
    );

    add(
      extractAttribute(
        tag,
        "data-lazy-src"
      )
    );

    add(
      extractAttribute(
        tag,
        "src"
      )
    );

    const srcset =
      extractAttribute(
        tag,
        "srcset"
      );

    if (srcset) {
      for (
        const item of
        srcset.split(",")
      ) {
        add(
          item
            .trim()
            .split(/\s+/)[0]
        );
      }
    }
  }

  /*
   * Прямые ссылки на изображения
   * внутри HTML / JSON.
   */

  const imageUrlRegex =
    /https?:\/\/stiltv\.ru\/image\/[^"'\\\s<>]+/gi;

  const directUrls =
    html.match(
      imageUrlRegex
    ) ?? [];

  for (
    const url of directUrls
  ) {
    add(
      decodeHtml(url)
    );
  }

  return [
    ...new Set(images),
  ].slice(
    0,
    MAX_IMAGES
  );
}

/* ============================================================
   FIND MATCH
============================================================ */

async function findMatch(
  product
) {
  /*
   * 1. Используем category из БД,
   * если она есть.
   */

  let categoryUrl = null;

  if (product.category) {
    const raw =
      String(
        product.category
      ).trim();

    if (
      raw.startsWith("http")
    ) {
      categoryUrl = raw;
    } else if (
      raw.startsWith("/")
    ) {
      categoryUrl =
        `${SOURCE_ORIGIN}${raw}`;
    }
  }

  /*
   * 2. Иначе определяем категорию
   * автоматически.
   */

  if (!categoryUrl) {
    const path =
      getCategoryPath(
        product
      );

    if (!path) {
      return {
        status:
          "unsupported_model",
        candidates: [],
      };
    }

    categoryUrl =
      `${SOURCE_ORIGIN}${path}`;
  }

  log(
    `    category: ${categoryUrl}`
  );

  /*
   * 3. Главное изменение:
   *
   * теперь не берём только 9 карточек.
   *
   * обходим дерево категорий.
   */

  const candidates =
    await collectProductsFromCategory(
      categoryUrl
    );

  log(
    `    TOTAL CANDIDATES: ${candidates.length}`
  );

  if (
    candidates.length === 0
  ) {
    return {
      status: "empty",
      candidates: [],
    };
  }

  /*
   * 4. Считаем score.
   */

  const scored =
    candidates
      .map(
        (candidate) => ({
          ...candidate,

          score:
            scoreCandidate(
              product,
              candidate
            ),
        })
      )
      .filter(
        (candidate) =>
          candidate.score > 0
      )
      .sort(
        (a, b) =>
          b.score - a.score
      );

  if (
    scored.length === 0
  ) {
    return {
      status: "not_found",
      candidates:
        candidates
          .slice(0, 8)
          .map(
            (candidate) => ({
              ...candidate,
              score: 0,
            })
          ),
    };
  }

  /*
   * 5. Лучший кандидат.
   */

  const best =
    scored[0];

  /*
   * Защита от слабого совпадения.
   */

  if (
    best.score <
    SAFE_MIN_SCORE
  ) {
    return {
      status: "not_found",
      candidates:
        scored.slice(0, 8),
    };
  }

  log(
    `    🎯 BEST MATCH: ${best.score}/100`
  );

  /*
   * 6. Открываем страницу
   * конкретного товара.
   */

  const productHtml =
    await fetchHtml(
      best.url
    );

  /*
   * 7. Получаем картинки.
   */

  const images =
    parseProductImages(
      productHtml,
      best.title
    );

  if (
    images.length === 0
  ) {
    return {
      status: "no_images",

      candidate: best,

      candidates:
        scored.slice(
          0,
          8
        ),
    };
  }

  return {
    status: "matched",

    candidate: {
      ...best,
      images,
    },

    candidates:
      scored.slice(
        0,
        8
      ),
  };
}

/* ============================================================
   DATABASE
============================================================ */

async function getProductsWithoutImages() {
  const result =
    await pgQuery(
      `
      SELECT
        id,
        title,
        name,
        memory,
        color,
        category,
        article,
        code,
        external_code,
        barcode,
        images
      FROM products
      WHERE
        images IS NULL
        OR jsonb_array_length(images) = 0
      ORDER BY
        title,
        id
      LIMIT $1
      `,
      [LIMIT]
    );

  return result.rows;
}

async function updateProductImages(
  id,
  images
) {
  await pgQuery(
    `
    UPDATE products
    SET
      images = $1::jsonb,
      updated_at = NOW()
    WHERE id = $2
    `,
    [
      JSON.stringify(images),
      id,
    ]
  );
}

/* ============================================================
   MAIN
============================================================ */

async function main() {
  log("");

  log(
    "=============================================="
  );

  log(
    "KUSAI MAX — AUTO PRODUCT IMAGE SYNC"
  );

  log(
    "=============================================="
  );

  if (DRY_RUN) {
    log(
      "Mode: DRY RUN — БД НЕ ИЗМЕНЯЕТСЯ"
    );
  } else if (SAFE_APPLY) {
    log(
      "Mode: APPLY-SAFE — безопасная запись"
    );
  } else {
    log(
      "Mode: APPLY — БД БУДЕТ ИЗМЕНЕНА"
    );
  }

  log(
    `Limit: ${LIMIT}`
  );

  log(
    `Source: ${SOURCE_ORIGIN}`
  );

  log("");

  const products =
    await getProductsWithoutImages();

  log(
    `Товаров без изображений: ${products.length}`
  );

  log("");

  let matched = 0;
  let safeApplied = 0;
  let notFound = 0;
  let unsupported = 0;
  let noImages = 0;
  let skippedUnsafe = 0;
  let errors = 0;

  for (
    const product of products
  ) {
    log(
      "--------------------------------------------------"
    );

    log(
      `PRODUCT: ${product.title}`
    );

    log(
      `id: ${product.id}`
    );

    log(
      `model: ${
        extractModel(
          `${product.title} ${
            product.name ?? ""
          }`
        ) || "-"
      }`
    );

    log(
      `memory: ${
        extractMemory(
          `${product.title} ${
            product.memory ?? ""
          }`
        ) || "-"
      }`
    );

    log(
      `color: ${
        normalizeColor(
          `${product.title} ${
            product.color ?? ""
          }`
        ) || "-"
      }`
    );

    try {
      const result =
        await findMatch(
          product
        );

      /*
       * MATCH
       */

      if (
        result.status ===
        "matched"
      ) {
        matched++;

        const candidate =
          result.candidate;

        log("");

        log(
          `✅ MATCH ${candidate.score}/100`
        );

        log(
          `   ${candidate.title}`
        );

        log(
          `   model: ${
            candidate.model || "-"
          }`
        );

        log(
          `   memory: ${
            candidate.memory ?? "-"
          }`
        );

        log(
          `   color: ${
            candidate.color ?? "-"
          }`
        );

        log(
          `   ${candidate.url}`
        );

        log(
          `   images: ${
            candidate.images.length
          }`
        );

        for (
          const image of
          candidate.images
        ) {
          log(
            `   ${image}`
          );
        }

        /*
         * SAFE APPLY
         */

        if (SAFE_APPLY) {
          if (
            candidate.score >=
              SAFE_MIN_SCORE &&
            candidate.images.length >
              0
          ) {
            await updateProductImages(
              product.id,
              candidate.images
            );

            safeApplied++;

            log(
              "   💾 SAFE APPLY: images записаны в PostgreSQL"
            );
          } else {
            skippedUnsafe++;

            log(
              "   ⚠️ SAFE APPLY: пропущено"
            );
          }
        }

        /*
         * NORMAL APPLY
         */

        else if (
          NORMAL_APPLY
        ) {
          await updateProductImages(
            product.id,
            candidate.images
          );

          log(
            "   💾 images записаны в PostgreSQL"
          );
        }

        /*
         * DRY RUN
         */

        else {
          log(
            "   DRY RUN: PostgreSQL не изменён"
          );
        }

        await sleep(
          REQUEST_DELAY_MS
        );

        continue;
      }

      /*
       * UNSUPPORTED
       */

      if (
        result.status ===
        "unsupported_model"
      ) {
        unsupported++;

        log(
          "⚠️ Модель пока не поддерживается"
        );

        continue;
      }

      /*
       * NO IMAGES
       */

      if (
        result.status ===
        "no_images"
      ) {
        noImages++;

        log(
          "⚠️ Товар найден, но изображений нет"
        );

        log(
          `   ${
            result.candidate?.title ??
            "-"
          }`
        );

        log(
          `   ${
            result.candidate?.url ??
            "-"
          }`
        );

        continue;
      }

      /*
       * NOT FOUND
       */

      notFound++;

      log(
        "❌ MATCH НЕ НАЙДЕН"
      );

      if (
        result.candidates?.length
      ) {
        log(
          "   Лучшие кандидаты:"
        );

        for (
          const candidate of
          result.candidates.slice(
            0,
            8
          )
        ) {
          log(
            `   [${candidate.score ?? 0}] ${candidate.title}`
          );

          log(
            `       model: ${
              candidate.model ||
              "-"
            }`
          );

          log(
            `       memory: ${
              candidate.memory ??
              "-"
            }`
          );

          log(
            `       color: ${
              candidate.color ??
              "-"
            }`
          );

          log(
            `       ${candidate.url}`
          );
        }
      }
    } catch (error) {
      errors++;

      log(
        `❌ ERROR: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`
      );
    }

    await sleep(
      REQUEST_DELAY_MS
    );
  }

  /*
   * RESULT
   */

  log("");

  log(
    "=============================================="
  );

  log(
    "RESULT"
  );

  log(
    "=============================================="
  );

  log(
    `matched:        ${matched}`
  );

  log(
    `safe_applied:   ${safeApplied}`
  );

  log(
    `not_found:      ${notFound}`
  );

  log(
    `unsupported:    ${unsupported}`
  );

  log(
    `no_images:      ${noImages}`
  );

  log(
    `skipped_unsafe: ${skippedUnsafe}`
  );

  log(
    `errors:         ${errors}`
  );

  log("");

  if (DRY_RUN) {
    log(
      "DRY RUN завершён. PostgreSQL не изменён."
    );

    log(
      "Для записи используй: node scripts/sync-product-images.js --limit 100 --apply-safe"
    );
  } else if (SAFE_APPLY) {
    log(
      "APPLY-SAFE завершён."
    );
  } else {
    log(
      "APPLY завершён."
    );
  }
}

main().catch(
  (error) => {
    console.error(
      "FATAL:",
      error
    );

    process.exit(1);
  }
);