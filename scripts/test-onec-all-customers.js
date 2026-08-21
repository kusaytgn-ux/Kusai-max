import "dotenv/config";
import { fetch, Agent } from "undici";

const url =
  "https://1c-srv.nalogreg.ru/kusaiRetailWork/hs/kusaiMaxConnector/getAllCustomers";

const login =
  process.env.ONE_C_LOGIN || "MAX-Connector";

const password =
  process.env.ONE_C_PASSWORD;

if (!password) {
  throw new Error(
    "ONE_C_PASSWORD не задан в .env"
  );
}

const auth =
  "Basic " +
  Buffer.from(
    `${login}:${password}`
  ).toString("base64");

const agent = new Agent({
  connect: {
    rejectUnauthorized: false,
  },
});

console.log(
  "Запрос getAllCustomers..."
);

const startedAt = Date.now();

try {
  const response = await fetch(
    url,
    {
      method: "GET",
      headers: {
        Authorization: auth,
        Accept: "application/json",
      },
      dispatcher: agent,
    }
  );

  const text =
    await response.text();

  console.log(
    `HTTP ${response.status}`
  );

  console.log(
    `Время: ${Date.now() - startedAt} ms`
  );

  console.log(
    `Размер ответа: ${text.length} bytes`
  );

  console.log(text);
} catch (error) {
  console.error(
    "Ошибка запроса к 1С:"
  );

  console.error(error);
}

await agent.close();