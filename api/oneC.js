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

// Временно, пока сертификат 1С просрочен.
const oneCAgent = new Agent({
  connect: {
    rejectUnauthorized: false,
  },
});

/*
|--------------------------------------------------------------------------
| Получаем чистые цифры телефона
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Нормализация телефона
|
| Внутри KUSAI MAX используем формат +7XXXXXXXXXX
|--------------------------------------------------------------------------
*/

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

  if (!value.startsWith("7") || value.length !== 11) {
    throw new Error("Некорректный номер телефона");
  }

  return "+" + value;
}

/*
|--------------------------------------------------------------------------
| Варианты телефона для 1С
|--------------------------------------------------------------------------
|
| Например:
|
| +79604700446
| 79604700446
| 89604700446
| 9604700446
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Проверка связи с 1С
|--------------------------------------------------------------------------
*/

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

export async function getAllOneCCustomers() {
  const url = `${ONE_C_URL}/getAllCustomers`;

  console.log("");
  console.log("======================================");
  console.log("1С: ПОЛУЧЕНИЕ ВСЕХ КЛИЕНТОВ");
  console.log("======================================");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: ONE_C_AUTH,
      Accept: "application/json",
    },
    dispatcher: oneCAgent,
  });

  const text = await response.text();

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

/*
|--------------------------------------------------------------------------
| Получение клиента из 1С
|--------------------------------------------------------------------------
*/

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

  /*
  |--------------------------------------------------------------------------
  | Пробуем каждый формат
  |--------------------------------------------------------------------------
  */

  for (const phoneVariant of variants) {
    const url =
      `${ONE_C_URL}/getCustomer?phone=` +
      encodeURIComponent(phoneVariant);

    console.log("");
    console.log(
      `1С: пробуем телефон ${phoneVariant}`
    );

    console.log(
      `1С GET: ${url}`
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

      console.log(
        "1С ответ BODY:",
        text
      );

      /*
      |--------------------------------------------------------------------------
      | Клиент найден
      |--------------------------------------------------------------------------
      */

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

        /*
        |--------------------------------------------------------------------------
        | Проверяем, действительно ли есть данные клиента
        |--------------------------------------------------------------------------
        */

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

      /*
      |--------------------------------------------------------------------------
      | 404 — пробуем следующий формат
      |--------------------------------------------------------------------------
      */

      if (response.status === 404) {
        console.log(
          `1С: клиент ${phoneVariant} не найден, пробуем следующий формат...`
        );

        continue;
      }

      /*
      |--------------------------------------------------------------------------
      | Другая HTTP ошибка
      |--------------------------------------------------------------------------
      */

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

      /*
      |--------------------------------------------------------------------------
      | Если это последний вариант —
      | отдаём ошибку наружу.
      |--------------------------------------------------------------------------
      */

      if (
        phoneVariant ===
        variants[variants.length - 1]
      ) {
        throw error;
      }
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Ни один формат не сработал
  |--------------------------------------------------------------------------
  */

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
