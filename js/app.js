// Shell de la plataforma: sesión, navegación entre módulos y permisos por rol.
import { exigirSesion, cerrarSesion } from "./auth.js";
import { APP_VERSION } from "./version.js";
import { initDashboard } from "./mod-dashboard.js";
import { initAsistencia } from "./mod-asistencia.js";
import { initEstudiantes } from "./mod-estudiantes.js";
import { initHorarios } from "./mod-horarios.js";

const sesion = exigirSesion();
if (!sesion) throw new Error("Sin sesión");

// Contexto compartido con todos los módulos.
const ctx = { sesion, esAdmin: sesion.rol === "admin" };

const MODULOS = {
  dashboard:   { titulo: "Dashboard",   init: initDashboard },
  asistencia:  { titulo: "Asistencia",  init: initAsistencia },
  estudiantes: { titulo: "Estudiantes", init: initEstudiantes },
  horarios:    { titulo: "Horarios",    init: initHorarios },
};

document.getElementById("nombre-usuario").textContent =
  `${sesion.nombre} (${sesion.rol})`;
document.getElementById("lbl-version").textContent = "v" + APP_VERSION;

document.getElementById("btn-salir").addEventListener("click", () => {
  cerrarSesion();
  location.href = "index.html";
});

async function mostrarModulo(nombre) {
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
