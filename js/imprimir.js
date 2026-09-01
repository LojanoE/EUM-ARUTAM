// Arma el reporte diario con el formato de la hoja IMPRIMIR de los Excel.
import { exigirSesion } from "./auth.js";
import { firmaDelUsuario } from "./data.js";
import { notaModoOffline } from "./offline.js";
import { plantillaHojaHTML, cargarDatosHoja, pintarHoja, ajustarAUnaPagina } from "./hoja-asistencia.js";

const sesion = exigirSesion();
if (!sesion) throw new Error("Sin sesión");

const params = new URLSearchParams(location.search);
const grado = params.get("grado");
const fecha = params.get("fecha");
const vacio = params.get("vacio") === "1";
const estado = document.getElementById("estado");
const reporte = document.getElementById("reporte");

async function iniciar() {
  if (!grado || !fecha) {
    estado.textContent = "Faltan parámetros: grado y fecha.";
    return;
  }

  reporte.innerHTML = plantillaHojaHTML();

  const [datos, firma] = await Promise.all([
    cargarDatosHoja({ grado, fecha, vacio }),
    firmaDelUsuario(sesion.usuario),
  ]);

  if (!datos.ok) {
    estado.textContent = datos.motivo;
    return;
  }

  pintarHoja(reporte, datos, firma);
  reporte.hidden = false;

  estado.textContent = notaModoOffline() + (
    vacio
      ? `Reporte del ${fecha} (${grado}) — en blanco a pedido (aunque haya asistencia guardada).`
      : datos.asistencia
        ? `Reporte del ${fecha} (${grado}) — con asistencia registrada.`
        : `Reporte del ${fecha} (${grado}) — en blanco, para llenar a mano.`
  );

  ajustarAUnaPagina(reporte);
}

document.getElementById("btn-imprimir").addEventListener("click", () => window.print());

iniciar().catch(err => {
  console.error(err);
  estado.textContent = "Error al cargar el reporte: " + err.message;
});
