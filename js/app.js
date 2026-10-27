// Shell de la plataforma: sesión, navegación entre módulos y permisos por rol.
import { exigirSesion, cerrarSesion } from "./auth.js";
import { APP_VERSION } from "./version.js";
import { notificarAccion, notificarError, notificarOk } from "./notificaciones.js";
import { prepararCacheOffline, fechaUltimaPrecarga } from "./offline.js";
import { initDashboard } from "./mod-dashboard.js";
import { initAsistencia } from "./mod-asistencia.js";
import { initEstudiantes } from "./mod-estudiantes.js";
import { initHorarios } from "./mod-horarios.js";
import { initHimnos } from "./mod-himnos.js";
import { initGrados } from "./mod-grados.js";
import { initUsuarios } from "./mod-usuarios.js";
import { initNotas } from "./mod-notas.js";
import { initCargas } from "./mod-cargas.js";
import { initDocentes } from "./mod-docentes.js";

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
// `irA` deja que un módulo abra otro (p. ej. el dashboard manda a registrar
// la asistencia del grado pendiente) sin pasar por el menú lateral.
const ctx = {
  sesion,
  esAdmin: sesion.rol === "admin",
  esDocente: sesion.rol === "docente",
  params: null,
  irA: (nombre, params) => mostrarModulo(nombre, params),
};

const MODULOS = {
  dashboard:   { titulo: "Dashboard",   init: initDashboard },
  asistencia:  { titulo: "Asistencia",  init: initAsistencia },
  estudiantes: { titulo: "Estudiantes", init: initEstudiantes },
  horarios:    { titulo: "Horarios",    init: initHorarios },
  himnos:      { titulo: "Himnos",      init: initHimnos },
  notas:       { titulo: "Notas",       init: initNotas, roles: ["admin", "docente"] },
  docentes:    { titulo: "Docentes",    init: initDocentes, soloAdmin: true },
  cargas:      { titulo: "Cargas",      init: initCargas, soloAdmin: true },
  grados:      { titulo: "Grados",      init: initGrados, soloAdmin: true },
  usuarios:    { titulo: "Usuarios",    init: initUsuarios, soloAdmin: true },
};

// El docente solo ve Notas y Himnos; el resto de roles no ve Notas
// (`roles` restringe un módulo a ciertos roles).
const MODULOS_DOCENTE = ["notas", "himnos"];
function moduloPermitido(nombre) {
  const m = MODULOS[nombre];
  if (m.soloAdmin && !ctx.esAdmin) return false;
  if (m.roles && !m.roles.includes(sesion.rol)) return false;
  if (ctx.esDocente && !MODULOS_DOCENTE.includes(nombre)) return false;
  return true;
}

// Oculta las entradas de menú que el rol no puede usar.
document.querySelectorAll(".nav-item").forEach(b => {
  if (!moduloPermitido(b.dataset.modulo)) b.hidden = true;
});

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
  // Si ya había un service worker al cargar, un cambio de controlador
  // significa que se desplegó una versión nueva. No se recarga solo (podría
  // haber una nómina sin guardar): se avisa y el usuario decide cuándo.
  const habiaControlador = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!habiaControlador) return;
    notificarAccion(
      "Hay una versión nueva de la aplicación.", "Recargar",
      () => location.reload());
  });
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
// Los docentes no imprimen asistencia: no se descarga la caché offline.
if (ctx.esDocente) {
  document.querySelector(".offline-estado").hidden = true;
} else {
  actualizarCacheOffline(false);
}

/* ---------- Menú deslizable (móvil) ---------- */
const sidebar = document.getElementById("sidebar");
const fondoMenu = document.getElementById("sidebar-fondo");
const btnMenu = document.getElementById("btn-menu");

function abrirMenu() {
  sidebar.classList.add("abierta");
  fondoMenu.hidden = false;
  document.body.classList.add("menu-abierto");
  btnMenu.setAttribute("aria-expanded", "true");
}

function cerrarMenu() {
  sidebar.classList.remove("abierta");
  fondoMenu.hidden = true;
  document.body.classList.remove("menu-abierto");
  btnMenu.setAttribute("aria-expanded", "false");
}

btnMenu.addEventListener("click", () =>
  sidebar.classList.contains("abierta") ? cerrarMenu() : abrirMenu());
fondoMenu.addEventListener("click", cerrarMenu);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarMenu(); });
// Al pasar a escritorio no debe quedar el fondo ni el scroll bloqueados.
window.matchMedia("(min-width: 821px)").addEventListener("change", (e) => {
  if (e.matches) cerrarMenu();
});

// `params` permite abrir un módulo ya situado: el dashboard lo usa para
// llevar al registro de un grado concreto o a la ficha de un estudiante.
// Se entrega al módulo en `ctx.params` (null cuando se entra por el menú).
async function mostrarModulo(nombre, params = null) {
  if (!moduloPermitido(nombre)) return;
  ctx.params = params;
  cerrarMenu();
  document.getElementById("titulo-movil").textContent = MODULOS[nombre].titulo;
  window.scrollTo(0, 0);
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

mostrarModulo(ctx.esDocente ? "notas" : "dashboard");
