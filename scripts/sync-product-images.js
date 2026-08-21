import "dotenv/config";
import { fetch } from "undici";
import { query as pgQuery } from "../api/postgres.js";

const SOURCE_ORIGIN = "https://stiltv.ru";

const DEFAULT_LIMIT = 20;
const MIN_CONFIDENCE = 85;
const SAFE_MIN_SCORE = 100;
const MIN_GAP = 10;
const REQUEST_DELAY_MS = 350;

const args = process.argv.slice(2);

const SAFE_APPLY = args.includes("--apply-safe");
const NORMAL_APPLY = args.includes("--apply");
const DRY_RUN =
  !SAFE_APPLY && !NORMAL_APPLY;

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
    200,
    Number(
      getArgValue("--limit", DEFAULT_LIMIT)
    )
  )
);

function log(message = "") {
  console.log(message);
}

function sleep(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

/*
|--------------------------------------------------------------------------
| TEXT
|--------------------------------------------------------------------------
*/

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[×х]/g, "x")
    .replace(/&nbsp;/g, " ")
    .replace(/гб/gi, "gb")
    .replace(/тб/gi, "tb")
    .replace(/[^a-zа-я0-9+]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(" ")
    .filter(Boolean);
}

/*
|--------------------------------------------------------------------------
| MODEL
|--------------------------------------------------------------------------
*/

function normalizeModelText(value) {
  let text = normalizeText(value);

  text = text
    .replace(/^apple\s+/i, "")
    .replace(/^appe\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (/^\d+(\s|$)/.test(text)) {
    text = `iphone ${text}`;
  }

  return text
    .replace(/\biphone\s+iphone\b/g, "iphone")
    .replace(/\bpro\s+max\b/g, "pro max")
    .replace(/\s+/g, " ")
    .trim();
}

function extractModel(value) {
  const text = normalizeText(value);

  const iphoneMatch = text.match(
    /(?:^|\s)(?:apple\s+)?(?:iphone\s*)?(se|\d+)(?:\s+(pro\s+max|pro|plus|air))?(?=\s|$)/i
  );

  if (iphoneMatch) {
    return normalizeModelText(
      `iphone ${iphoneMatch[1]} ${
        iphoneMatch[2] ?? ""
      }`
    );
  }

  const patterns = [
    /\bgalaxy\s+[a-z]\d+(?:\s+ultra|\s*\+|\s+edge|\s+fold|\s+flip)?\b/i,
    /\bxiaomi\s+[a-z0-9-]+(?:\s+[a-z0-9-]+){0,3}/i,
    /\bredmi\s+[a-z0-9-]+(?:\s+[a-z0-9-]+){0,3}/i,
    /\bdyson\s+[a-z0-9-]+(?:\s+[a-z0-9-]+){0,4}/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) {
      return normalizeModelText(match[0]);
    }
  }

  return "";
}

/*
|--------------------------------------------------------------------------
| MEMORY
|--------------------------------------------------------------------------
*/

function extractMemory(value) {
  const text = normalizeText(value);

  const explicit = text.match(
    /(\d+(?:\.\d+)?)\s*(gb|tb)\b/i
  );

  if (explicit) {
    return `${explicit[1]}${explicit[2]}`;
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

/*
|--------------------------------------------------------------------------
| COLOR
|--------------------------------------------------------------------------
*/

const COLOR_ALIASES = [
  ["space black", "space black"],
  ["cloud white", "cloud white"],
  ["deep blue", "deep blue"],
  ["natural titanium", "natural titanium"],
  ["black titanium", "black titanium"],
  ["white titanium", "white titanium"],
  ["desert titanium", "desert titanium"],
  ["cosmic orange", "cosmic orange"],

  ["черный", "black"],
  ["чёрный", "black"],
  ["black", "black"],

  ["белый", "white"],
  ["white", "white"],

  ["синий", "blue"],
  ["голубой", "blue"],
  ["blue", "blue"],

  ["зеленый", "green"],
  ["зелёный", "green"],
  ["green", "green"],

  ["розовый", "pink"],
  ["pink", "pink"],

  ["желтый", "yellow"],
  ["желтыи", "yellow"],
  ["yellow", "yellow"],

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

  ["лавандовый", "lavender"],
  ["лавандовыи", "lavender"],
  ["lavender", "lavender"],

  ["midnight", "midnight"],
  ["sage", "sage"],
  ["orange", "orange"],
];

function normalizeColor(value) {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  for (
    const [
      source,
      target,
    ] of COLOR_ALIASES
  ) {
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
    ["blue", "deep blue"],
    ["purple", "violet"],
    ["white", "cloud white"],
  ];

  return aliases.some(
    ([x, y]) =>
      (left === x && right === y) ||
      (left === y && right === x)
  );
}

/*
|--------------------------------------------------------------------------
| SIM / ESIM
|--------------------------------------------------------------------------
*/

function extractSimType(value) {
  const text = normalizeText(value);

  const hasEsim =
    /\besim\b/i.test(text);

  const hasNanoSim =
    /\bnano\s*sim\b/i.test(text) ||
    /\bnanosim\b/i.test(text);

  const hasSim =
    /\bsim\b/i.test(text);

  if (hasNanoSim && hasEsim) {
    return "nano+esim";
  }

  if (
    hasEsim &&
    !hasNanoSim &&
    !hasSim
  ) {
    return "esim";
  }

  if (
    hasNanoSim &&
    !hasEsim
  ) {
    return "nano-sim";
  }

  if (
    hasSim &&
    hasEsim
  ) {
    return "nano+esim";
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| CATEGORY
|--------------------------------------------------------------------------
*/

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
      return "/apple-iphone";

    case "iphone 17 pro":
      return "/apple-iphone/iphone-17-pro";

    case "iphone 17 pro max":
      return "/apple-iphone/iphone-17-pro-max";

    default:
      return null;
  }
}

/*
|--------------------------------------------------------------------------
| FETCH
|--------------------------------------------------------------------------
*/

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml",
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

/*
|--------------------------------------------------------------------------
| HTML HELPERS
|--------------------------------------------------------------------------
*/

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value) {
  return decodeHtml(
    String(value ?? "")
      .replace(
        /<script[\s\S]*?<\/script>/gi,
        " "
      )
      .replace(
        /<style[\s\S]*?<\/style>/gi,
        " "
      )
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
      value,
      SOURCE_ORIGIN
    ).href;
  } catch {
    return null;
  }
}

function extractAttribute(
  tag,
  name
) {
  const regex = new RegExp(
    `${name}\\s*=\\s*["']([^"']+)["']`,
    "i"
  );

  return (
    tag.match(regex)?.[1] ??
    null
  );
}

/*
|--------------------------------------------------------------------------
| CATEGORY PRODUCTS
|--------------------------------------------------------------------------
*/

function parseCategoryProducts(html) {
  const products = [];
  const seen = new Set();

  const regex =
    /<a\b[^>]*data-hpm-href=["']1["'][^>]*href=["']([^"']+\.html[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match;

  while (
    (match = regex.exec(html))
  ) {
    const url = absoluteUrl(
      decodeHtml(match[1])
    );

    if (
      !url ||
      seen.has(url)
    ) {
      continue;
    }

    const body = match[2];

    const imgTag =
      body.match(
        /<img\b[^>]*>/i
      )?.[0] ?? "";

    const alt = stripHtml(
      extractAttribute(
        imgTag,
        "alt"
      )
    );

    const bodyTitle =
      stripHtml(body);

    const title =
      alt || bodyTitle;

    if (
      !title ||
      title.length < 8 ||
      title.length > 200
    ) {
      continue;
    }

    const thumbnail =
      absoluteUrl(
        extractAttribute(
          imgTag,
          "src"
        ) ||
          extractAttribute(
            imgTag,
            "data-src"
          )
      );

    seen.add(url);

    products.push({
      url,
      title,
      thumbnail,
      memory:
        extractMemory(title),
      color:
        normalizeColor(title),
      simType:
        extractSimType(title),
    });
  }

  return products;
}

/*
|--------------------------------------------------------------------------
| SCORE
|--------------------------------------------------------------------------
*/

function scoreCandidate(
  product,
  candidate
) {
  let score = 0;

  const productModel =
    extractModel(
      `${product.title} ${product.name ?? ""}`
    );

  const candidateModel =
    extractModel(
      candidate.title
    );

  if (
    !productModel ||
    !candidateModel
  ) {
    return 0;
  }

  if (
    normalizeText(
      productModel
    ) ===
    normalizeText(
      candidateModel
    )
  ) {
    score += 55;
  } else {
    return 0;
  }

  const productMemory =
    extractMemory(
      `${product.title} ${product.memory ?? ""}`
    );

  const candidateMemory =
    extractMemory(
      candidate.title
    );

  if (productMemory) {
    if (!candidateMemory) {
      return 0;
    }

    if (
      productMemory !==
      candidateMemory
    ) {
      return 0;
    }

    score += 25;
  }

  const productColor =
    normalizeColor(
      `${product.title} ${
        product.color ?? ""
      }`
    );

  if (productColor) {
    if (!candidate.color) {
      return 0;
    }

    if (
      !colorsEqual(
        productColor,
        candidate.color
      )
    ) {
      return 0;
    }

    score += 20;
  }

  const productSim =
    extractSimType(
      product.title
    );

  const candidateSim =
    candidate.simType;

  if (
    productSim &&
    candidateSim &&
    productSim === candidateSim
  ) {
    score += 10;
  }

  return score;
}

/*
|--------------------------------------------------------------------------
| IMAGE FILTER
|--------------------------------------------------------------------------
*/

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
    /\.(svg)(\?|$)/i.test(
      lower
    )
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

  if (
    lower.includes("pickup") ||
    lower.includes("express") ||
    lower.includes("delivery") ||
    lower.includes("logo") ||
    lower.includes("favicon") ||
    lower.includes("sprite") ||
    lower.includes("icon")
  ) {
    return false;
  }

  if (
    lower.includes("/123/6000/") ||
    lower.includes("yandex") ||
    lower.includes(
      "50144511b-1000x1000"
    )
  ) {
    return false;
  }

  return true;
}

/*
|--------------------------------------------------------------------------
| PRODUCT PAGE IMAGES
|--------------------------------------------------------------------------
*/

function parseProductImages(
  html,
  expectedTitle
) {
  const images = [];
  const seen = new Set();

  const expectedModel =
    extractModel(
      expectedTitle
    );

  const expectedMemory =
    extractMemory(
      expectedTitle
    );

  const expectedColor =
    normalizeColor(
      expectedTitle
    );

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
    (match =
      imgRegex.exec(html))
  ) {
    const tag =
      match[0];

    const alt =
      stripHtml(
        extractAttribute(
          tag,
          "alt"
        )
      );

    /*
     * Для самого товара фильтруем
     * по alt, если alt присутствует.
     */
    if (alt) {
      const altModel =
        extractModel(
          alt
        );

      if (
        expectedModel &&
        altModel &&
        normalizeText(
          altModel
        ) !==
          normalizeText(
            expectedModel
          )
      ) {
        continue;
      }

      const altMemory =
        extractMemory(
          alt
        );

      if (
        expectedMemory &&
        altMemory &&
        altMemory !==
          expectedMemory
      ) {
        continue;
      }

      const altColor =
        normalizeColor(
          alt
        );

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

  return [
    ...new Set(images),
  ].slice(0, 6);
}

/*
|--------------------------------------------------------------------------
| FIND MATCH
|--------------------------------------------------------------------------
*/

async function findMatch(
  product
) {
  const categoryPath =
    getCategoryPath(
      product
    );

  if (!categoryPath) {
    return {
      status:
        "unsupported_model",
      candidates: [],
    };
  }

  const categoryUrl =
    `${SOURCE_ORIGIN}${categoryPath}`;

  log(
    `    category: ${categoryUrl}`
  );

  const categoryHtml =
    await fetchHtml(
      categoryUrl
    );

  const candidates =
    parseCategoryProducts(
      categoryHtml
    );

  log(
    `    cards: ${candidates.length}`
  );

  if (
    candidates.length === 0
  ) {
    return {
      status: "empty",
      candidates: [],
    };
  }

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
      .sort(
        (a, b) =>
          b.score -
          a.score
      );

  const qualified =
    scored.filter(
      (candidate) =>
        candidate.score >=
        MIN_CONFIDENCE
    );

  if (
    qualified.length === 0
  ) {
    return {
      status: "not_found",
      candidates:
        scored.slice(
          0,
          8
        ),
    };
  }

  const best =
    qualified[0];

  const second =
    qualified[1];

  if (
    second &&
    best.score -
      second.score <
      MIN_GAP
  ) {
    return {
      status: "ambiguous",
      candidates:
        qualified.slice(
          0,
          8
        ),
    };
  }

  const productHtml =
    await fetchHtml(
      best.url
    );

  const images =
    parseProductImages(
      productHtml,
      best.title
    );

  if (
    images.length === 0
  ) {
    return {
      status:
        "no_images",
      candidate: best,
      candidates:
        qualified.slice(
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
      qualified.slice(
        0,
        8
      ),
  };
}

/*
|--------------------------------------------------------------------------
| DATABASE
|--------------------------------------------------------------------------
*/

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
      ORDER BY title, id
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

/*
|--------------------------------------------------------------------------
| MAIN
|--------------------------------------------------------------------------
*/

async function main() {
  log("");
  log(
    "=============================================="
  );
  log(
    "KUSAI MAX — SYNC PRODUCT IMAGES"
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
      "Mode: APPLY-SAFE — записываются только score >= 100 и однозначные совпадения"
    );
  } else {
    log(
      "Mode: APPLY — БД БУДЕТ ИЗМЕНЕНА"
    );
  }

  log(`Limit: ${LIMIT}`);
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
  let ambiguous = 0;
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

      if (
        result.status ===
        "matched"
      ) {
        matched++;

        const candidate =
          result.candidate;

        const second =
          result.candidates?.[1];

        const uniqueEnough =
          !second ||
          candidate.score -
            second.score >=
            MIN_GAP;

        const safeEnough =
          candidate.score >=
            SAFE_MIN_SCORE &&
          uniqueEnough &&
          candidate.images.length >
            0;

        log(
          `✅ MATCH ${candidate.score}/100`
        );

        log(
          `   ${candidate.title}`
        );

        log(
          `   ${candidate.url}`
        );

        log(
          `   images: ${candidate.images.length}`
        );

        for (
          const image of
            candidate.images
        ) {
          log(
            `   ${image}`
          );
        }

        if (SAFE_APPLY) {
          if (safeEnough) {
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
              "   ⚠️ SAFE APPLY: пропущено — недостаточно уверенное совпадение"
            );
          }
        } else if (
          NORMAL_APPLY
        ) {
          await updateProductImages(
            product.id,
            candidate.images
          );

          log(
            "   💾 images записаны в PostgreSQL"
          );
        } else {
          log(
            "   DRY RUN: PostgreSQL не изменён"
          );
        }

        await sleep(
          REQUEST_DELAY_MS
        );

        continue;
      }

      if (
        result.status ===
        "ambiguous"
      ) {
        ambiguous++;

        log(
          "⚠️ AMBIGUOUS — пропущено"
        );

        for (
          const candidate of
            result.candidates
        ) {
          log(
            `   [${candidate.score ?? "-"}] ${candidate.title}`
          );

          log(
            `   ${candidate.url}`
          );
        }

        continue;
      }

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

      if (
        result.status ===
        "no_images"
      ) {
        noImages++;

        log(
          "⚠️ Товар найден, но подходящих изображений нет"
        );

        log(
          `   ${result.candidate?.title ?? "-"}`
        );

        log(
          `   ${result.candidate?.url ?? "-"}`
        );

        continue;
      }

      if (
        result.status ===
        "empty"
      ) {
        notFound++;

        log(
          "❌ Категория не содержит товарных карточек"
        );

        continue;
      }

      notFound++;

      log(
        "❌ MATCH НЕ НАЙДЕН"
      );

      if (
        result.candidates?.length
      ) {
        for (
          const candidate of
            result.candidates.slice(
              0,
              5
            )
        ) {
          log(
            `   [${candidate.score ?? "-"}] ${candidate.title}`
          );

          log(
            `   ${candidate.url}`
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

  log("");
  log(
    "=============================================="
  );
  log("RESULT");
  log(
    "=============================================="
  );

  log(
    `matched:       ${matched}`
  );

  log(
    `safe_applied:  ${safeApplied}`
  );

  log(
    `ambiguous:     ${ambiguous}`
  );

  log(
    `not_found:     ${notFound}`
  );

  log(
    `unsupported:   ${unsupported}`
  );

  log(
    `no_images:     ${noImages}`
  );

  log(
    `skipped_unsafe:${skippedUnsafe}`
  );

  log(
    `errors:        ${errors}`
  );

  log("");

  if (DRY_RUN) {
    log(
      "DRY RUN завершён. PostgreSQL не изменён."
    );

    log(
      "Безопасное применение: --apply-safe"
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

main().catch((error) => {
  console.error(
    "FATAL:",
    error
  );

  process.exit(1);
});