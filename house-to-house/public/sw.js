// House to House service worker.
//
// Two jobs, both deliberately minimal:
//   1. Offline fallback — if a full page navigation fails (no network), show a
//      friendly offline page instead of the browser's dinosaur. NOTHING
//      authenticated is cached: only navigations are intercepted, and only to
//      fall back when the network is genuinely down.
//   2. Push readiness — the push / notificationclick handlers are in place so
//      that when web-push is switched on (Phase 2), reminders can arrive as a
//      real notification with no further service-worker work.

const OFFLINE_URL = "/offline.html";
const CACHE = "h2h-offline-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Only guard top-level page loads; API/RSC/asset requests pass through
  // untouched so live data is never served from a stale cache.
  if (req.method !== "GET" || req.mode !== "navigate") return;
  event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
});

// --- Push (wired now; activated in Phase 2 once VAPID keys exist) ---
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "House to House", body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "House to House", {
      body: data.body,
      icon: data.icon || "/icon-192.png",
      badge: "/badge.png",
      data: { url: data.url || "/check-in" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const hit = wins.find((w) => w.url.includes(url));
      if (hit) return hit.focus();
      return self.clients.openWindow(url);
    }),
  );
});
