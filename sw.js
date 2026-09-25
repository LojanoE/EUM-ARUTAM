// Service worker: permite abrir la plataforma y las hojas de impresión sin
// internet. Precachea los archivos estáticos y mantiene en caché los scripts
// del CDN de Firebase; el tráfico de Firestore (firestore.googleapis.com) no
// pasa por aquí: lo maneja la caché persistente del propio SDK.
// Cambiar CACHE al modificar archivos estáticos, para forzar la renovación.
const CACHE = "uem-arutam-v6";

// Cuánto se espera a la red antes de servir la copia guardada. Con internet
// lento igual se abre la app (desde caché); sin internet falla enseguida.
const ESPERA_RED_MS = 4000;

const ESTATICOS = [
  "./",
  "index.html",
  "app.html",
  "imprimir.html",
  "imprimir-lote.html",
  "reporte.html",
  "css/styles.css",
  "css/print.css",
  "js/app.js",
  "js/auth.js",
  "js/data.js",
  "js/firebase-config.js",
  "js/imprimir.js",
  "js/imprimir-lote.js",
  "js/hoja-asistencia.js",
  "js/reporte.js",
  "js/offline.js",
  "js/version.js",
  "js/notificaciones.js",
  "js/mod-asistencia.js",
  "js/mod-dashboard.js",
  "js/mod-estudiantes.js",
  "js/mod-grados.js",
  "js/mod-horarios.js",
  "js/mod-himnos.js",
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

// Los archivos propios van "red primero": si hay internet, la pantalla
// siempre muestra la versión recién desplegada. Antes eran "caché primero
// con revalidación", que respondía con la copia vieja y guardaba la nueva
// para la próxima carga: tras cada despliegue la app quedaba una recarga
// atrasada y seguía mostrando la versión anterior.
// Los scripts del CDN de Firebase sí van "caché primero": su URL lleva el
// número de versión, así que nunca cambian de contenido.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  if (url.origin === "https://www.gstatic.com") {
    e.respondWith(cachePrimero(e.request));
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(redPrimero(e.request));
  }
});

async function cachePrimero(request) {
  const guardado = await caches.match(request);
  if (guardado) return guardado;
  const resp = await fetch(request);
  if (resp.ok) (await caches.open(CACHE)).put(request, resp.clone());
  return resp;
}

async function redPrimero(request) {
  try {
    const resp = await conLimiteDeTiempo(fetch(request), ESPERA_RED_MS);
    if (resp.ok) {
      const copia = resp.clone();
      caches.open(CACHE).then((c) => c.put(request, copia));
    }
    return resp;
  } catch (err) {
    const guardado = await caches.match(request);
    if (guardado) return guardado;
    throw err;
  }
}

function conLimiteDeTiempo(promesa, ms) {
  return new Promise((resolver, rechazar) => {
    const t = setTimeout(() => rechazar(new Error("Tiempo de espera agotado")), ms);
    promesa.then(
      (v) => { clearTimeout(t); resolver(v); },
      (e) => { clearTimeout(t); rechazar(e); }
    );
  });
}
