// Arma el reporte diario con el formato de la hoja IMPRIMIR de los Excel.
import { exigirSesion } from "./auth.js";
import {
  obtenerEstudiantes, obtenerHorario, obtenerTutor, obtenerAsistencia,
  obtenerConfig, diaDeFecha, esc
} from "./data.js";
import { collection, getDocs }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase-config.js";

const sesion = exigirSesion();
if (!sesion) throw new Error("Sin sesión");

const params = new URLSearchParams(location.search);
const grado = params.get("grado");
const fecha = params.get("fecha");
const estado = document.getElementById("estado");

const MESES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

function fechaLarga(f) {
  const [y, m, d] = f.split("-").map(Number);
  return `${d} DE ${MESES[m - 1]} DE ${y}`;
}

function contar(marcas, codigo) {
  return Object.values(marcas || {}).filter(v => v === codigo).length;
}

async function diasAsistidosAcumulados(estudianteIds) {
  // Días con al menos una marca P o A por estudiante, hasta la fecha del
  // reporte. Se busca en TODA la colección para que el historial siga al
  // estudiante aunque haya sido movido de grado.
  const acum = Object.fromEntries(estudianteIds.map(id => [id, 0]));
  const snap = await getDocs(collection(db, "asistencias"));
  for (const docu of snap.docs) {
    const data = docu.data();
    if (data.fecha > fecha) continue;
    for (const id of estudianteIds) {
      const marcas = Object.values(data.registros?.[id] || {});
      if (marcas.some(v => v === "P" || v === "A")) acum[id]++;
    }
  }
  return acum;
}

async function iniciar() {
  if (!grado || !fecha) {
    estado.textContent = "Faltan parámetros: grado y fecha.";
    return;
  }
  const dia = diaDeFecha(fecha);
  if (!dia) {
    estado.textContent = "La fecha es fin de semana; no hay clases.";
    return;
  }

  const [estudiantes, horario, tutor, asistencia, config] = await Promise.all([
    obtenerEstudiantes(grado),
    obtenerHorario(grado, dia),
    obtenerTutor(grado),
    obtenerAsistencia(grado, fecha),
    obtenerConfig(),
  ]);
  const registros = asistencia?.registros || {};

  // Firma configurable (módulo Usuarios)
  document.getElementById("f-nombre").textContent = config.subinspector;
  document.getElementById("f-cargo").textContent = config.cargoSubinspector;

  // Encabezado
  document.getElementById("d-grado").textContent = grado;
  document.getElementById("d-fecha").textContent = fechaLarga(fecha);
  document.getElementById("d-documento").textContent =
    `${fecha.replaceAll("-", "")}_${grado}`;
  document.getElementById("d-dia").textContent = dia;
  document.getElementById("i-grado").textContent = grado;
  document.getElementById("i-seccion").textContent = tutor?.seccion || "VESPERTINA";
  document.getElementById("i-tutor").textContent = tutor?.tutor || "";

  // Horario del día
  document.getElementById("tbody-horario").innerHTML = horario.map((h, i) => `
    <tr>
      <td class="centro">${i + 1}</td>
      <td>${esc(h.asignatura)}</td>
      <td class="centro">${esc(h.tiempo)}</td>
      <td></td>
      <td>${esc(h.docente)}</td>
      <td></td>
      <td></td>
    </tr>`).join("");

  // Cabecera de nómina
  const numHoras = horario.length;
  let filaFecha = `<tr><th rowspan="3">Nº</th><th rowspan="3">NÓMINA DE ESTUDIANTES</th>
    <th colspan="${numHoras}">${fechaLarga(fecha)}</th><th colspan="4">TOTAL</th></tr>`;
  let filaHoras = `<tr><th colspan="${numHoras}">Horas</th>
    <th rowspan="2">JUSTIFICADO</th><th rowspan="2">INJUSTIFICADO</th>
    <th rowspan="2">ATRASO</th><th rowspan="2">DÍAS ASISTIDOS</th></tr>`;
  let filaNums = "<tr>";
  for (let h = 1; h <= numHoras; h++) filaNums += `<th>${h}ª</th>`;
  filaNums += "</tr>";
  document.getElementById("thead-nomina").innerHTML = filaFecha + filaHoras + filaNums;

  // Nómina
  const ids = estudiantes.map(e => e.id);
  const acum = await diasAsistidosAcumulados(ids);
  document.getElementById("tbody-nomina").innerHTML = estudiantes.map((est, idx) => {
    const marcas = registros[est.id] || {};
    let celdas = "";
    for (let h = 1; h <= numHoras; h++) {
      celdas += `<td class="centro">${marcas[h] || ""}</td>`;
    }
    const hayMarcas = Object.keys(marcas).length > 0;
    return `<tr>
      <td class="centro">${idx + 1}</td>
      <td class="nombre">${esc(est.nombre)}</td>
      ${celdas}
      <td class="centro">${hayMarcas ? contar(marcas, "J") : ""}</td>
      <td class="centro">${hayMarcas ? contar(marcas, "I") : ""}</td>
      <td class="centro">${hayMarcas ? contar(marcas, "A") : ""}</td>
      <td class="centro">${acum[est.id] || ""}</td>
    </tr>`;
  }).join("");

  document.getElementById("reporte").hidden = false;
  estado.textContent = asistencia
    ? `Reporte del ${fecha} (${grado}) — con asistencia registrada.`
    : `Reporte del ${fecha} (${grado}) — en blanco, para llenar a mano.`;
}

document.getElementById("btn-imprimir").addEventListener("click", () => window.print());

iniciar().catch(err => {
  console.error(err);
  estado.textContent = "Error al cargar el reporte: " + err.message;
});
