/**
 * Service Worker for Web Push notifications.
 *
 * This file must live at public/sw.js so Vite copies it
 * to the root of the built site -> https://your-domain/sw.js
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * A push arrives from the server -> show a system notification.
 */
self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: "Kusai Max",
      body: event.data ? event.data.text() : "",
    };
  }

  const title = data.title || "Kusai Max";

  const options = {
    body: data.body || "",
    icon: "/kusai-max-logo.png",
    badge: "/favicon.svg",
    tag: data.tag || "kusai-max-notification",
    data: {
      url: data.url || "/",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * Click on notification -> open/focus the right page.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientsList) => {
        for (const client of clientsList) {
          const clientUrl = new URL(client.url);

          if (clientUrl.pathname === targetUrl && "focus" in client) {
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
