import webpush from "web-push";
import { query as pgQuery } from "./postgres.js";

/**
 * Модуль Web Push уведомлений.
 *
 * Работает без Firebase — чистый стандарт Web Push API.
 * Подписки хранятся в Postgres (таблица push_subscriptions).
 */

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} else {
  console.warn(
    "VAPID ключи не заданы — push-уведомления работать не будут"
  );
}

/**
 * Создаёт таблицу подписок, если её ещё нет.
 */
export async function initializePushTable() {
  await pgQuery(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      -- "admin" для админа, либо телефон пользователя
      owner_login TEXT NOT NULL,

      role TEXT NOT NULL CHECK (role IN ('user', 'admin')),

      endpoint TEXT NOT NULL UNIQUE,

      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pgQuery(`
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_owner
    ON push_subscriptions(owner_login)
  `);

  console.log("Таблица push_subscriptions готова");
}

/**
 * Сохраняет/обновляет подписку в БД.
 */
export async function saveSubscription({ ownerLogin, role, subscription }) {
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;

  if (!endpoint || !p256dh || !auth || !ownerLogin || !role) {
    throw new Error("Некорректные данные подписки");
  }

  await pgQuery(
    `
    INSERT INTO push_subscriptions (owner_login, role, endpoint, p256dh, auth)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (endpoint)
    DO UPDATE SET
      owner_login = EXCLUDED.owner_login,
      role = EXCLUDED.role,
      p256dh = EXCLUDED.p256dh,
      auth = EXCLUDED.auth
    `,
    [ownerLogin, role, endpoint, p256dh, auth]
  );
}

/**
 * Удаляет подписку (например, если браузер отписался).
 */
export async function removeSubscription(endpoint) {
  if (!endpoint) {
    return;
  }

  await pgQuery(
    `DELETE FROM push_subscriptions WHERE endpoint = $1`,
    [endpoint]
  );
}

/**
 * Отправляет push конкретному получателю (ownerLogin + role).
 *
 * ownerLogin:
 *  - для role="admin" можно передать "admin" (всем админам)
 *  - для role="user" передаём телефон пользователя
 */
export async function sendPushToOwner(ownerLogin, role, payload) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return;
  }

  const result = await pgQuery(
    `
    SELECT id, endpoint, p256dh, auth
    FROM push_subscriptions
    WHERE owner_login = $1 AND role = $2
    `,
    [ownerLogin, role]
  );

  const subscriptions = result.rows;

  if (subscriptions.length === 0) {
    return;
  }

  const notificationPayload = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (row) => {
      const pushSubscription = {
        endpoint: row.endpoint,
        keys: {
          p256dh: row.p256dh,
          auth: row.auth,
        },
      };

      try {
        await webpush.sendNotification(
          pushSubscription,
          notificationPayload
        );
      } catch (error) {
        // 410/404 — подписка умерла (пользователь отключил уведомления
        // или поменял браузер). Удаляем её, чтобы не пытаться слать вечно.
        if (error?.statusCode === 410 || error?.statusCode === 404) {
          await pgQuery(
            `DELETE FROM push_subscriptions WHERE id = $1`,
            [row.id]
          );
        } else {
          console.error(
            "Ошибка отправки push:",
            error?.statusCode,
            error?.body || error?.message
          );
        }
      }
    })
  );
}

/**
 * Регистрирует HTTP-роуты для подписки/отписки.
 *
 * Вызывать один раз при старте сервера:
 *   registerPushRoutes(app);
 */
export function registerPushRoutes(app) {
  // Отдаём публичный ключ фронтенду
  app.get("/api/push/public-key", (req, res) => {
    return res.json({
      success: true,
      publicKey: VAPID_PUBLIC_KEY,
    });
  });

  // Подписка пользователя или админа
  app.post("/api/push/subscribe", async (req, res) => {
    try {
      const { ownerLogin, role, subscription } = req.body || {};

      if (!ownerLogin || !role || !subscription) {
        return res.status(400).json({
          success: false,
          message: "Не хватает данных для подписки",
        });
      }

      await saveSubscription({ ownerLogin, role, subscription });

      return res.json({ success: true });
    } catch (error) {
      console.error("Ошибка подписки на push:", error);

      return res.status(500).json({
        success: false,
        message: "Не удалось оформить подписку",
      });
    }
  });

  // Отписка
  app.post("/api/push/unsubscribe", async (req, res) => {
    try {
      const { endpoint } = req.body || {};

      await removeSubscription(endpoint);

      return res.json({ success: true });
    } catch (error) {
      console.error("Ошибка отписки от push:", error);

      return res.status(500).json({
        success: false,
        message: "Не удалось отписаться",
      });
    }
  });
}
