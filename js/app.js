// Shell de la plataforma: sesión, navegación entre módulos y permisos por rol.
import { exigirSesion, cerrarSesion } from "./auth.js";
import { APP_VERSION } from "./version.js";
import { leerPreferencias, guardarPreferencias, aplicarPreferencias } from "./preferencias.js";
import { notificarAccion, notificarError, notificarOk } from "./notificaciones.js";
import { prepararCacheOffline, fechaUltimaPrecarga } from "./offline.js";

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
  dashboard:   { titulo: "Dashboard",   cargar: () => import("./mod-dashboard.js").then(m => m.initDashboard) },
  asistencia:  { titulo: "Asistencia",  cargar: () => import("./mod-asistencia.js").then(m => m.initAsistencia) },
  estudiantes: { titulo: "Estudiantes", cargar: () => import("./mod-estudiantes.js").then(m => m.initEstudiantes) },
  horarios:    { titulo: "Horarios",    cargar: () => import("./mod-horarios.js").then(m => m.initHorarios) },
  himnos:      { titulo: "Himnos",      cargar: () => import("./mod-himnos.js").then(m => m.initHimnos) },
  notas:       { titulo: "Notas",       cargar: () => import("./mod-notas.js").then(m => m.initNotas), roles: ["admin", "docente"] },
  docentes:    { titulo: "Docentes",    cargar: () => import("./mod-docentes.js").then(m => m.initDocentes), soloAdmin: true },
  cargas:      { titulo: "Cargas",      cargar: () => import("./mod-cargas.js").then(m => m.initCargas), soloAdmin: true },
  grados:      { titulo: "Grados",      cargar: () => import("./mod-grados.js").then(m => m.initGrados), soloAdmin: true },
  usuarios:    { titulo: "Usuarios",    cargar: () => import("./mod-usuarios.js").then(m => m.initUsuarios), soloAdmin: true },
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

/* ---------- Tamaño de letra y alto contraste ---------- */
let pref = leerPreferencias();
const btnsLetra = document.querySelectorAll(".pref-letra button");
const btnContraste = document.getElementById("btn-contraste");

function pintarPreferencias() {
  aplicarPreferencias(pref);
  btnsLetra.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.letra === pref.letra)));
  btnContraste.setAttribute("aria-pressed", String(pref.contraste === "alto"));
}
btnsLetra.forEach(b => b.addEventListener("click", () => {
  pref = { ...pref, letra: b.dataset.letra };
  guardarPreferencias(pref);
  pintarPreferencias();
}));
btnContraste.addEventListener("click", () => {
  pref = { ...pref, contraste: pref.contraste === "alto" ? "normal" : "alto" };
  guardarPreferencias(pref);
  pintarPreferencias();
});
pintarPreferencias();

document.getElementById("btn-password").addEventListener("click", () => {
  location.href = "index.html?cambiar=1";
});

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

// En móvil la barra lateral funciona como un diálogo: mientras está abierta
// el resto de la página queda inerte, el foco entra al menú y, al cerrar,
// vuelve al botón ☰. En escritorio es una barra fija normal (sin rol).
const zonasInertes = () => document.querySelectorAll(".contenido-app, .barra-movil");

function abrirMenu() {
  sidebar.classList.add("abierta");
  fondoMenu.hidden = false;
  document.body.classList.add("menu-abierto");
  btnMenu.setAttribute("aria-expanded", "true");
  sidebar.setAttribute("role", "dialog");
  sidebar.setAttribute("aria-modal", "true");
  sidebar.setAttribute("aria-label", "Menú principal");
  zonasInertes().forEach(z => { z.inert = true; });
  sidebar.querySelector(".nav-item:not([hidden])")?.focus();
}

function cerrarMenu() {
  const estabaAbierto = sidebar.classList.contains("abierta");
  sidebar.classList.remove("abierta");
  fondoMenu.hidden = true;
  document.body.classList.remove("menu-abierto");
  btnMenu.setAttribute("aria-expanded", "false");
  sidebar.removeAttribute("role");
  sidebar.removeAttribute("aria-modal");
  sidebar.removeAttribute("aria-label");
  zonasInertes().forEach(z => { z.inert = false; });
  // Solo se devuelve el foco si el menú estaba abierto y se ve el botón ☰.
  if (estabaAbierto && btnMenu.offsetParent) btnMenu.focus();
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
    const s = document.getElementById("seccion-" + key);
    if (s) s.hidden = key !== nombre;
  }
  const seccion = document.getElementById("seccion-" + nombre);
  seccion.innerHTML = `<p class="info">Cargando...</p>`;
  try {
    // Cada módulo se descarga al abrirlo por primera vez (un docente solo
    // usa Notas y Himnos). Quedan en la caché del service worker.
    const init = await MODULOS[nombre].cargar();
    await init(seccion, ctx);
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
