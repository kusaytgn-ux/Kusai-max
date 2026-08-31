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
  const variants = getOneCPhoneVariants(phone);

  console.log("");
  console.log("======================================");
  console.log("1С: ПОИСК КЛИЕНТА");
  console.log("======================================");

  console.log("Исходный телефон:", phone);
  console.log("Варианты:", variants);

  for (const phoneVariant of variants) {
    const url =
      `${ONE_C_URL}/getCustomer?phone=` +
      encodeURIComponent(phoneVariant);

    console.log("");
    console.log(`1С: пробуем телефон ${phoneVariant}`);

    try {
      const response = await fetch(url, {
        method: "GET",

        headers: {
          Authorization: ONE_C_AUTH,
          Accept: "application/json",
        },

        dispatcher: oneCAgent,
      });

      const text = await response.text();

      console.log(`1С ответ: HTTP ${response.status}`);

      if (response.status === 404) {
        console.log(
          `1С: клиент ${phoneVariant} не найден`
        );

        continue;
      }

      if (!response.ok) {
        throw new Error(
          `1С HTTP ${response.status}: ${text}`
        );
      }

      let customer;

      try {
        customer = JSON.parse(text);
      } catch {
        throw new Error(
          `1С вернула некорректный JSON: ${text}`
        );
      }

      if (
        !customer ||
        (!customer.name && !customer.phone)
      ) {
        console.log("1С вернула пустые данные клиента");

        continue;
      }

      console.log("");
      console.log("1С: КЛИЕНТ НАЙДЕН");
      console.log("Имя:", customer.name || "");
      console.log("Телефон:", customer.phone || "");
      console.log("Бонусы:", customer.bonusBalance || 0);

      /*
      |--------------------------------------------------------------------------
      | ПОЛУЧАЕМ QR-КОД
      |--------------------------------------------------------------------------
      */

      console.log("");
      console.log("======================================");
      console.log("1С: ПОЛУЧЕНИЕ QR-КОДА КЛИЕНТА");
      console.log("======================================");

      try {
        const qrUrl =
          `${ONE_C_URL}/getCustomerQR?phone=` +
          encodeURIComponent(phoneVariant);

        console.log(
          `1С QR: пробуем ${phoneVariant}`
        );

        const qrResponse = await fetch(qrUrl, {
          method: "GET",

          headers: {
            Authorization: ONE_C_AUTH,

            Accept: "image/png, image/*, application/octet-stream",
          },

          dispatcher: oneCAgent,
        });

        console.log(
          `1С QR HTTP ${qrResponse.status}`
        );

        if (qrResponse.ok) {
          /*
          |--------------------------------------------------------------------------
          | ВАЖНО:
          | Получаем настоящий бинарный PNG
          |--------------------------------------------------------------------------
          */

          const qrArrayBuffer =
            await qrResponse.arrayBuffer();

          const qrBuffer =
            Buffer.from(qrArrayBuffer);

          console.log(
            `QR размер: ${qrBuffer.length} байт`
          );

          /*
          |--------------------------------------------------------------------------
          | Превращаем PNG в Base64
          |--------------------------------------------------------------------------
          */

          customer.customerQR =
            `data:image/png;base64,${qrBuffer.toString("base64")}`;

          console.log(
            "1С: QR-КОД УСПЕШНО ПОЛУЧЕН"
          );

          console.log(
            "QR: получен и преобразован в Base64"
          );
        } else {
          console.log(
            "QR-код не получен:",
            qrResponse.status
          );

          customer.customerQR = null;
        }
      } catch (qrError) {
        console.error(
          "Ошибка получения QR:",
          qrError?.message || qrError
        );

        customer.customerQR = null;
      }

      console.log("======================================");
      console.log("");

      return customer;
    } catch (error) {
      console.error(
        `Ошибка запроса 1С для ${phoneVariant}:`,
        error?.message || error
      );

      if (
        phoneVariant ===
        variants[variants.length - 1]
      ) {
        throw error;
      }
    }
  }

  console.log("");
  console.log(
    "1С: КЛИЕНТ НЕ НАЙДЕН НИ В ОДНОМ ФОРМАТЕ"
  );
  console.log("======================================");

  return null;
}
