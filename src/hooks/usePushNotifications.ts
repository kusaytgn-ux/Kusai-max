import { useCallback, useEffect, useState } from "react";

/**
 * Хук подписки на Web Push уведомления (без Firebase).
 *
 * Использование:
 *   const { isSupported, permission, subscribe } =
 *     usePushNotifications(ownerLogin, role);
 *
 * ownerLogin:
 *   - для пользователя — его телефон (user.phone)
 *   - для админа — строка "admin"
 *
 * role: "user" | "admin"
 */

const getApiUrl = () =>
  (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(
    /\/$/,
    ""
  );

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);

  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function usePushNotifications(
  ownerLogin: string | undefined | null,
  role: "user" | "admin"
) {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(
      "serviceWorker" in navigator &&
        "PushManager" in window &&
        typeof Notification !== "undefined"
    );
  }, []);

  // Проверяем — вдруг подписка уже оформлена (после перезахода).
  useEffect(() => {
    if (!isSupported) {
      return;
    }

    (async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const existing = await registration?.pushManager.getSubscription();

        setIsSubscribed(Boolean(existing));
      } catch (error) {
        console.error("Ошибка проверки push-подписки:", error);
      }
    })();
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !ownerLogin) {
      return false;
    }

    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        return false;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const existing = await registration.pushManager.getSubscription();

      if (existing) {
        setIsSubscribed(true);
        return true;
      }

      const apiUrl = getApiUrl();

      const keyResponse = await fetch(`${apiUrl}/api/push/public-key`);
      const keyData = await keyResponse.json();

      if (!keyData.success || !keyData.publicKey) {
        console.error("Не удалось получить VAPID публичный ключ");
        return false;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });

      await fetch(`${apiUrl}/api/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerLogin,
          role,
          subscription: subscription.toJSON(),
        }),
      });

      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.error("Ошибка подписки на push:", error);
      return false;
    }
  }, [isSupported, ownerLogin, role]);

  return { permission, isSubscribed, isSupported, subscribe };
}
