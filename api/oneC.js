import "dotenv/config";
import { fetch, Agent } from "undici";

const ONE_C_URL =
  "https://1c-srv.nalogreg.ru/kusaiRetailWork/hs/kusaiMaxConnector";

const ONE_C_LOGIN =
  process.env.ONE_C_LOGIN || "MAX-Connector";

const ONE_C_PASSWORD =
  process.env.ONE_C_PASSWORD || "829Ypysa";

const ONE_C_AUTH =
  "Basic " +
  Buffer.from(
    `${ONE_C_LOGIN}:${ONE_C_PASSWORD}`
  ).toString("base64");

// =====================================================
// Временно, пока сертификат 1С просрочен
// =====================================================

const oneCAgent = new Agent({
  connect: {
    rejectUnauthorized: false,
  },
});

// =====================================================
// ПОЛУЧАЕМ ЧИСТЫЕ ЦИФРЫ ТЕЛЕФОНА
// =====================================================

function getPhoneDigits(phone) {
  const value = String(phone || "").trim();

  if (!value) {
    throw new Error("Не указан телефон");
  }

  const digits = value.replace(/\D/g, "");

  if (!digits) {
    throw new Error(
      `Некорректный телефон: ${phone}`
    );
  }

  return digits;
}

// =====================================================
// НОРМАЛИЗАЦИЯ ТЕЛЕФОНА
//
// В KUSAI MAX используем:
// +7XXXXXXXXXX
// =====================================================

export function normalizePhone(phone) {
  let value = String(phone || "").trim();

  if (!value) {
    throw new Error("Не указан телефон");
  }

  value = value.replace(/\D/g, "");

  if (value.startsWith("8")) {
    value = "7" + value.slice(1);
  }

  if (value.startsWith("9")) {
    value = "7" + value;
  }

  if (
    !value.startsWith("7") ||
    value.length !== 11
  ) {
    throw new Error(
      "Некорректный номер телефона"
    );
  }

  return "+" + value;
}

// =====================================================
// ВАРИАНТЫ ТЕЛЕФОНА ДЛЯ 1С
// =====================================================

function getOneCPhoneVariants(phone) {
  const normalized =
    normalizePhone(phone);

  const digits =
    normalized.replace(/\D/g, "");

  const localNumber =
    digits.slice(1);

  return [
    `+${digits}`,
    digits,
    `8${localNumber}`,
    localNumber,
  ];
}

// =====================================================
// ПРОВЕРКА СВЯЗИ С 1С
// =====================================================

export async function checkOneCHealth() {
  const response = await fetch(
    `${ONE_C_URL}/checkHealth`,
    {
      method: "GET",

      headers: {
        Authorization: ONE_C_AUTH,
        Accept: "application/json",
      },

      dispatcher: oneCAgent,
    }
  );

  const text =
    await response.text();

  console.log(
    "1С checkHealth:",
    response.status
  );

  if (!response.ok) {
    throw new Error(
      `1С HTTP ${response.status}: ${text}`
    );
  }

  return JSON.parse(text);
}

// =====================================================
// ПОЛУЧЕНИЕ ВСЕХ КЛИЕНТОВ ИЗ 1С
// =====================================================

export async function getAllOneCCustomers() {
  const url =
    `${ONE_C_URL}/getAllCustomers`;

  console.log("");
  console.log(
    "======================================"
  );
  console.log(
    "1С: ПОЛУЧЕНИЕ ВСЕХ КЛИЕНТОВ"
  );
  console.log(
    "======================================"
  );

  const response = await fetch(url, {
    method: "GET",

    headers: {
      Authorization: ONE_C_AUTH,
      Accept: "application/json",
    },

    dispatcher: oneCAgent,
  });

  const text =
    await response.text();

  console.log(
    `1С getAllCustomers: HTTP ${response.status}`
  );

  if (!response.ok) {
    throw new Error(
      `1С getAllCustomers HTTP ${response.status}: ${text}`
    );
  }

  const data = JSON.parse(text);

  if (!Array.isArray(data)) {
    throw new Error(
      "1С getAllCustomers вернул не массив клиентов"
    );
  }

  console.log(
    `1С: получено клиентов: ${data.length}`
  );

  return data;
}

// =====================================================
// ПОЛУЧЕНИЕ QR-КОДА КЛИЕНТА ИЗ 1С
//
// Метод:
// /getCustomerQR?phone=+79897040044
//
// Возвращает SVG
// =====================================================

export async function getOneCCustomerQR(phone) {
  const variants =
    getOneCPhoneVariants(phone);

  console.log("");
  console.log(
    "======================================"
  );
  console.log(
    "1С: ПОЛУЧЕНИЕ QR-КОДА КЛИЕНТА"
  );
  console.log(
    "======================================"
  );

  console.log(
    "Исходный телефон:",
    phone
  );

  for (const phoneVariant of variants) {
    const url =
      `${ONE_C_URL}/getCustomerQR?phone=` +
      encodeURIComponent(phoneVariant);

    console.log(
      `1С QR: пробуем ${phoneVariant}`
    );

    try {
      const response = await fetch(url, {
        method: "GET",

        headers: {
          Authorization: ONE_C_AUTH,

          Accept:
            "image/svg+xml, image/*, text/plain, */*",
        },

        dispatcher: oneCAgent,
      });

      const text =
        await response.text();

      console.log(
        `1С QR HTTP ${response.status}`
      );

      // ===============================================
      // QR ПОЛУЧЕН
      // ===============================================

      if (response.ok) {
        if (
          text &&
          text.trim().length > 0
        ) {
          console.log(
            "1С: QR-КОД УСПЕШНО ПОЛУЧЕН"
          );

          return text.trim();
        }
      }

      // Если клиента нет — пробуем другой формат
      if (response.status === 404) {
        console.log(
          `QR не найден для ${phoneVariant}`
        );

        continue;
      }

      if (!response.ok) {
        console.log(
          `Ошибка QR для ${phoneVariant}: ${text}`
        );
      }
    } catch (error) {
      console.error(
        `Ошибка получения QR для ${phoneVariant}:`,
        error?.message || error
      );
    }
  }

  console.log(
    "1С: QR-КОД НЕ НАЙДЕН"
  );

  return null;
}

// =====================================================
// ПОЛУЧЕНИЕ КЛИЕНТА ИЗ 1С
// =====================================================

export async function getOneCCustomer(phone) {
  const variants =
    getOneCPhoneVariants(phone);

  console.log("");
  console.log(
    "======================================"
  );
  console.log(
    "1С: ПОИСК КЛИЕНТА"
  );
  console.log(
    "======================================"
  );

  console.log(
    "Исходный телефон:",
    phone
  );

  console.log(
    "Варианты:",
    variants
  );

  for (const phoneVariant of variants) {
    const url =
      `${ONE_C_URL}/getCustomer?phone=` +
      encodeURIComponent(phoneVariant);

    console.log("");
    console.log(
      `1С: пробуем телефон ${phoneVariant}`
    );

    try {
      const response =
        await fetch(url, {
          method: "GET",

          headers: {
            Authorization:
              ONE_C_AUTH,

            Accept:
              "application/json",
          },

          dispatcher:
            oneCAgent,
        });

      const text =
        await response.text();

      console.log(
        `1С ответ: HTTP ${response.status}`
      );

      // ===============================================
      // КЛИЕНТ НАЙДЕН
      // ===============================================

      if (response.ok) {
        let customer;

        try {
          customer =
            JSON.parse(text);
        } catch {
          throw new Error(
            `1С вернула некорректный JSON: ${text}`
          );
        }

        if (
          customer &&
          (
            customer.name ||
            customer.phone
          )
        ) {
          console.log("");
          console.log(
            "1С: КЛИЕНТ НАЙДЕН"
          );

          console.log(
            "Имя:",
            customer.name || ""
          );

          console.log(
            "Телефон:",
            customer.phone || ""
          );

          console.log(
            "Бонусы:",
            customer.bonusBalance || 0
          );

          // ===========================================
          // QR-КОД
          //
          // Если 1С уже добавляет customerQR
          // в структуру клиента — используем его.
          //
          // Если нет — получаем отдельно.
          // ===========================================

          if (!customer.customerQR) {
            console.log(
              "Получаем QR-код отдельно..."
            );

            try {
              customer.customerQR =
                await getOneCCustomerQR(
                  customer.phone ||
                  phone
                );
            } catch (error) {
              console.error(
                "Не удалось получить QR:",
                error?.message || error
              );

              customer.customerQR =
                null;
            }
          }

          console.log(
            "QR:",
            customer.customerQR
              ? "получен"
              : "не получен"
          );

          console.log(
            "======================================"
          );

          console.log("");

          return customer;
        }

        console.log(
          "1С вернула пустые данные клиента."
        );
      }

      // ===============================================
      // 404 — ПРОБУЕМ СЛЕДУЮЩИЙ ФОРМАТ
      // ===============================================

      if (response.status === 404) {
        console.log(
          `1С: клиент ${phoneVariant} не найден, пробуем следующий формат...`
        );

        continue;
      }

      if (!response.ok) {
        throw new Error(
          `1С HTTP ${response.status}: ${text}`
        );
      }
    } catch (error) {
      console.error(
        `Ошибка запроса 1С для ${phoneVariant}:`,
        error?.message ||
        error
      );

      if (
        phoneVariant ===
        variants[
          variants.length - 1
        ]
      ) {
        throw error;
      }
    }
  }

  console.log("");
  console.log(
    "1С: КЛИЕНТ НЕ НАЙДЕН НИ В ОДНОМ ФОРМАТЕ"
  );
  console.log(
    "======================================"
  );
  console.log("");

  return null;
}