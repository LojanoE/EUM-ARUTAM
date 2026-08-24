// Service worker: permite abrir la plataforma y las hojas de impresión sin
// internet. Precachea los archivos estáticos y mantiene en caché los scripts
// del CDN de Firebase; el tráfico de Firestore (firestore.googleapis.com) no
// pasa por aquí: lo maneja la caché persistente del propio SDK.
// Cambiar CACHE al modificar archivos estáticos, para forzar la renovación.
const CACHE = "uem-arutam-v1";

const ESTATICOS = [
  "./",
  "index.html",
  "app.html",
  "imprimir.html",
  "reporte.html",
  "css/styles.css",
  "css/print.css",
  "js/app.js",
  "js/auth.js",
  "js/data.js",
  "js/firebase-config.js",
  "js/imprimir.js",
  "js/reporte.js",
  "js/offline.js",
  "js/version.js",
  "js/notificaciones.js",
  "js/mod-asistencia.js",
  "js/mod-dashboard.js",
  "js/mod-estudiantes.js",
  "js/mod-grados.js",
  "js/mod-horarios.js",
  "js/mod-usuarios.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ESTATICOS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first con revalidación en segundo plano: responde rápido desde caché
// (o de la red si aún no está cacheado) y actualiza la copia cuando hay
// internet. Sin internet, responde siempre desde caché.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const cacheable =
    url.origin === location.origin || url.origin === "https://www.gstatic.com";
  if (!cacheable) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const red = fetch(e.request).then((resp) => {
        if (resp.ok) {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copia));
        }
        return resp;
      }).catch(() => cached);
      return cached || red;
    })
  );
});
