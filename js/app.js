// Shell de la plataforma: sesión, navegación entre módulos y permisos por rol.
import { exigirSesion, cerrarSesion } from "./auth.js";
import { APP_VERSION } from "./version.js";
import { notificarError, notificarOk } from "./notificaciones.js";
import { prepararCacheOffline, fechaUltimaPrecarga } from "./offline.js";
import { initDashboard } from "./mod-dashboard.js";
import { initAsistencia } from "./mod-asistencia.js";
import { initEstudiantes } from "./mod-estudiantes.js";
import { initHorarios } from "./mod-horarios.js";
import { initGrados } from "./mod-grados.js";
import { initUsuarios } from "./mod-usuarios.js";

const sesion = exigirSesion();
if (!sesion) throw new Error("Sin sesión");

// Red de seguridad: ningún error (de módulos o promesas sin capturar) debe
// pasar en silencio; se muestra como notificación roja.
window.addEventListener("unhandledrejection", (e) => {
  notificarError("Error inesperado", e.reason);
});
window.addEventListener("error", (e) => {
  notificarError("Error inesperado", e.error || new Error(e.message));
});

// Contexto compartido con todos los módulos.
const ctx = { sesion, esAdmin: sesion.rol === "admin" };

const MODULOS = {
  dashboard:   { titulo: "Dashboard",   init: initDashboard },
  asistencia:  { titulo: "Asistencia",  init: initAsistencia },
  estudiantes: { titulo: "Estudiantes", init: initEstudiantes },
  horarios:    { titulo: "Horarios",    init: initHorarios },
  grados:      { titulo: "Grados",      init: initGrados, soloAdmin: true },
  usuarios:    { titulo: "Usuarios",    init: initUsuarios, soloAdmin: true },
};

// Oculta las entradas de menú exclusivas de administradores.
if (!ctx.esAdmin) {
  document.querySelectorAll(".nav-item").forEach(b => {
    if (MODULOS[b.dataset.modulo]?.soloAdmin) b.hidden = true;
  });
}

document.getElementById("nombre-usuario").textContent =
  `${sesion.nombre} (${sesion.rol})`;
document.getElementById("lbl-version").textContent = "v" + APP_VERSION;

document.getElementById("btn-salir").addEventListener("click", () => {
  cerrarSesion();
  location.href = "index.html";
});

/* ---------- Datos para imprimir sin internet ---------- */

// Service worker: cachea los archivos estáticos para que las páginas
// (incluidas las hojas de impresión) abran sin conexión.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(err =>
    console.warn("No se pudo registrar el service worker:", err));
}

const lblOffline = document.getElementById("lbl-offline");
const btnOffline = document.getElementById("btn-offline");

function pintarEstadoOffline(ts) {
  lblOffline.textContent = ts
    ? "Datos sin conexión: " +
      new Date(ts).toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" })
    : "Datos sin conexión: sin descargar";
}

// Descarga en caché los datos de todos los grados para imprimir offline.
// Se lanza solo al entrar a la app y con el botón "Actualizar datos".
async function actualizarCacheOffline(manual) {
  if (!navigator.onLine) {
    if (manual) notificarError("Sin conexión: no se pueden actualizar los datos.");
    return;
  }
  btnOffline.disabled = true;
  try {
    const ts = await prepararCacheOffline(sesion);
    pintarEstadoOffline(ts);
    if (manual) notificarOk("Datos listos para imprimir sin internet.");
  } catch (err) {
    console.error(err);
    pintarEstadoOffline(fechaUltimaPrecarga());
    if (manual) notificarError("No se pudo actualizar la caché", err);
  } finally {
    btnOffline.disabled = false;
  }
}

btnOffline.addEventListener("click", () => actualizarCacheOffline(true));
pintarEstadoOffline(fechaUltimaPrecarga());
actualizarCacheOffline(false);

async function mostrarModulo(nombre) {
  if (MODULOS[nombre].soloAdmin && !ctx.esAdmin) return;
  document.querySelectorAll(".nav-item").forEach(b =>
    b.classList.toggle("activo", b.dataset.modulo === nombre));
  for (const key of Object.keys(MODULOS)) {
    document.getElementById("seccion-" + key).hidden = key !== nombre;
  }
  const seccion = document.getElementById("seccion-" + nombre);
  seccion.innerHTML = `<p class="info">Cargando...</p>`;
  try {
    await MODULOS[nombre].init(seccion, ctx);
  } catch (err) {
    console.error(err);
    seccion.innerHTML =
      `<p class="aviso">Error al cargar el módulo: ${err.message}</p>`;
  }
}

document.getElementById("menu").addEventListener("click", (e) => {
  const boton = e.target.closest(".nav-item");
  if (boton) mostrarModulo(boton.dataset.modulo);
});

mostrarModulo("dashboard");
