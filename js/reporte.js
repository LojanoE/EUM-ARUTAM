// Reporte consolidado de asistencia por rango de fechas (mensual u otro).
import { exigirSesion } from "./auth.js";
import {
  obtenerEstudiantes, obtenerTutor, obtenerTodasLasAsistencias,
  firmaDelUsuario, indicePorEstudiante, resumenEstudiante, esc
} from "./data.js";

const sesion = exigirSesion();
if (!sesion) throw new Error("Sin sesión");

const params = new URLSearchParams(location.search);
const grado = params.get("grado");
const desde = params.get("desde");
const hasta = params.get("hasta");
const estado = document.getElementById("estado");

const MESES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

function fechaLarga(f) {
  const [y, m, d] = f.split("-").map(Number);
  return `${d} DE ${MESES[m - 1]} DE ${y}`;
}

let filasCSV = [];

async function iniciar() {
  if (!grado || !desde || !hasta) {
    estado.textContent = "Faltan parámetros: grado, desde y hasta.";
    return;
  }
  if (desde > hasta) {
    estado.textContent = "La fecha 'desde' es posterior a 'hasta'.";
    return;
  }

  const [estudiantesGrado, tutor, asistencias, firma] = await Promise.all([
    obtenerEstudiantes(grado, true), // incluye retirados
    obtenerTutor(grado),
    obtenerTodasLasAsistencias(),
    firmaDelUsuario(sesion.usuario),
  ]);

  // El índice se arma sobre TODA la colección filtrada por fechas: el
  // historial sigue al estudiante aunque haya sido movido de grado.
  const enRango = asistencias.filter(a => a.fecha >= desde && a.fecha <= hasta);
  const indice = indicePorEstudiante(enRango);

  // Nómina del reporte: activos del grado + retirados que tengan registros
  // dentro del rango (estuvieron activos en ese período).
  const estudiantes = estudiantesGrado
    .filter(e => e.activo !== false || indice[e.id]);

  // Encabezado
  document.getElementById("d-grado").textContent = grado;
  document.getElementById("d-desde").textContent = fechaLarga(desde);
  document.getElementById("d-hasta").textContent = fechaLarga(hasta);
  document.getElementById("d-documento").textContent =
    `${desde.replaceAll("-", "")}_${hasta.replaceAll("-", "")}_${grado}`;
  document.getElementById("i-grado").textContent = grado;
  document.getElementById("i-seccion").textContent = tutor?.seccion || "VESPERTINA";
  document.getElementById("i-tutor").textContent = tutor?.tutor || "";

  // Firma del usuario que genera el documento
  document.getElementById("f-nombre").textContent = firma.nombre;
  document.getElementById("f-cargo").textContent = firma.cargo;

  // Consolidado
  document.getElementById("tbody-consolidado").innerHTML = estudiantes.map((est, idx) => {
    const r = resumenEstudiante(indice[est.id]);
    const nombre = est.nombre + (est.activo === false ? " (retirado)" : "");
    filasCSV.push([
      idx + 1, nombre, r.P, r.J, r.I, r.A,
      r.diasRegistrados, r.diasAsistidos,
      r.porcentaje === null ? "" : r.porcentaje + "%"
    ]);
    return `<tr>
      <td class="centro">${idx + 1}</td>
      <td class="nombre">${esc(nombre)}</td>
      <td class="centro">${r.P || ""}</td>
      <td class="centro">${r.J || ""}</td>
      <td class="centro">${r.I || ""}</td>
      <td class="centro">${r.A || ""}</td>
      <td class="centro">${r.diasRegistrados || ""}</td>
      <td class="centro">${r.diasAsistidos || ""}</td>
      <td class="centro">${r.porcentaje === null ? "—" : r.porcentaje + "%"}</td>
    </tr>`;
  }).join("");

  document.getElementById("reporte").hidden = false;
  estado.textContent =
    `Reporte del ${desde} al ${hasta} (${grado}) — ${estudiantes.length} estudiantes.`;
}

document.getElementById("btn-imprimir").addEventListener("click", () => window.print());

document.getElementById("btn-csv").addEventListener("click", () => {
  const encabezado = ["Nº", "ESTUDIANTE", "PRESENTE", "JUSTIFICADO",
    "INJUSTIFICADO", "ATRASO", "DÍAS REGISTRADOS", "DÍAS ASISTIDOS", "% ASISTENCIA"];
  const lineas = [encabezado, ...filasCSV]
    .map(f => f.map(c => `"${String(c).replaceAll('"', '""')}"`).join(";"))
    .join("\r\n");
  // BOM para que Excel respete las tildes.
  const blob = new Blob(["﻿" + lineas], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `reporte_${grado}_${desde}_${hasta}.csv`.replaceAll('"', "");
  a.click();
  URL.revokeObjectURL(a.href);
});

iniciar().catch(err => {
  console.error(err);
  estado.textContent = "Error al cargar el reporte: " + err.message;
});
