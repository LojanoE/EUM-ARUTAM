// Libreta de calificaciones por estudiante (o de todo el grado): notas por
// materia y trimestre, detalle de insumos, asistencia, observaciones y firmas.
// Se imprime o se descarga/comparte como PDF para el representante.
import { exigirSesion } from "./auth.js";
import {
  obtenerCargas, obtenerCargasDeDocente, obtenerEstudiantes, obtenerTutor,
  obtenerConfig, obtenerNotasAnuales, obtenerAsistenciasDeGrado,
  indicePorEstudiante, resumenEstudiante, promedioTrimestre, promedioFinal, esc
} from "./data.js";
import { notaModoOffline } from "./offline.js";

const sesion = exigirSesion();
if (!sesion) throw new Error("Sin sesión");

const HTML2PDF = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const params = new URLSearchParams(location.search);
const grado = params.get("grado");
const estParam = params.get("est") || "todos";
const estado = document.getElementById("estado");
const contenedor = document.getElementById("libretas");
const selEst = document.getElementById("sel-estudiante");
const btnPdf = document.getElementById("btn-pdf");
const btnCompartir = document.getElementById("btn-compartir");

const fmt = (n) => (n === null || n === undefined ? "—" : n.toFixed(2));

function fechaEmision() {
  const h = new Date();
  return `${h.getDate()} de ${MESES[h.getMonth()]} de ${h.getFullYear()}`;
}

let datos = null;       // { cfg, tutor, estudiantes, materias, indice }
let nombreArchivo = "libreta.pdf";

async function iniciar() {
  if (!grado) {
    estado.textContent = "Falta el parámetro: grado.";
    return;
  }

  // El docente solo puede abrir libretas de grados donde da clases.
  if (sesion.rol === "docente") {
    const propias = await obtenerCargasDeDocente(sesion.usuario);
    if (!propias.some(c => c.grado === grado)) {
      estado.textContent = "No tiene materias en este grado: no puede ver su libreta.";
      return;
    }
  }

  const [cfg, tutor, estudiantes, cargas, asistencias] = await Promise.all([
    obtenerConfig(),
    obtenerTutor(grado),
    obtenerEstudiantes(grado),
    obtenerCargas(),
    obtenerAsistenciasDeGrado(grado)
  ]);

  // Una fila por asignatura del grado (si dos docentes la comparten, se unen).
  const porAsignatura = new Map();
  for (const c of cargas.filter(x => x.grado === grado)) {
    const m = porAsignatura.get(c.asignatura) || { asignatura: c.asignatura, docentes: [] };
    if (c.docente && !m.docentes.includes(c.docente)) m.docentes.push(c.docente);
    porAsignatura.set(c.asignatura, m);
  }
  const materias = [...porAsignatura.values()]
    .sort((a, b) => a.asignatura.localeCompare(b.asignatura, "es"));

  // Notas de los 3 trimestres de cada materia, en paralelo.
  await Promise.all(materias.map(async (m) => {
    m.trimestres = await obtenerNotasAnuales(grado, m.asignatura, cfg.periodoLectivo);
  }));

  datos = { cfg, tutor, estudiantes, materias, indice: indicePorEstudiante(asistencias) };

  selEst.innerHTML = `<option value="todos">Todo el grado (${estudiantes.length})</option>` +
    estudiantes.map(e => `<option value="${esc(e.id)}">${esc(e.nombre)}</option>`).join("");
  selEst.value = estudiantes.some(e => e.id === estParam) ? estParam : "todos";
  selEst.hidden = false;

  pintar();
}

// Notas de un estudiante en una materia: promedios por trimestre y final.
function notasDe(est, materia) {
  const entradas = materia.trimestres.map(t => t?.notas?.[est.id] || null);
  const proms = entradas.map(e => promedioTrimestre(e, datos.cfg.pesosNotas));
  return { entradas, proms, final: promedioFinal(proms) };
}

function libretaHtml(est) {
  const { cfg, tutor, materias, indice } = datos;
  const filas = materias.map(m => ({ m, ...notasDe(est, m) }));
  const finales = filas.map(f => f.final).filter(n => n !== null);
  const general = promedioFinal(finales);
  const bajo = (n) => n !== null && n < cfg.notaMinima;
  const celda = (n) => `<td class="centro${bajo(n) ? " nota-baja" : ""}">${fmt(n)}</td>`;
  const asist = resumenEstudiante(indice[est.id]);

  const resumen = filas.map(({ m, proms, final }) => `
    <tr>
      <td>${esc(m.asignatura)}</td>
      <td class="docente">${esc(m.docentes.join(", "))}</td>
      ${proms.map(celda).join("")}
      ${celda(final)}
      <td class="centro">${final === null ? "—" : bajo(final) ? "Supletorio" : "Aprueba"}</td>
    </tr>`).join("");

  // Detalle: un bloque por trimestre que tenga alguna nota de este estudiante.
  const detalle = [0, 1, 2].map(i => {
    const conNotas = filas.filter(f => f.entradas[i]);
    if (!conNotas.length) return "";
    return `
      <p class="subtitulo-libreta">Detalle del trimestre ${i + 1}</p>
      <table class="tabla tabla-notas">
        <thead><tr><th>Asignatura</th><th>Insumos</th><th>Proyecto</th><th>Examen</th><th>Promedio</th></tr></thead>
        <tbody>${conNotas.map(({ m, entradas, proms }) => {
          const e = entradas[i];
          const nombres = m.trimestres[i]?.nombresInsumos || [];
          const insumos = (e.formativas || []).map((v, k) =>
            v === null || v === undefined ? "" : `${esc(nombres[k] || "Insumo " + (k + 1))}: ${fmt(v)}`)
            .filter(Boolean).join(" · ");
          return `<tr>
            <td>${esc(m.asignatura)}</td>
            <td class="insumos">${insumos || "—"}</td>
            <td class="centro">${fmt(e.proyecto ?? null)}</td>
            <td class="centro">${fmt(e.examen ?? null)}</td>
            ${celda(proms[i])}
          </tr>`;
        }).join("")}</tbody>
      </table>`;
  }).join("");

  return `
  <article class="libreta hoja-asistencia">
    <div class="encabezado">
      <div class="enc-izquierda">
        <p class="linea-principal">UNIDAD EDUCATIVA "ARUTAM"</p>
        <p>EL PANGUI - ZAMORA CHINCHIPE - ECUADOR</p>
        <p>LIBRETA DE CALIFICACIONES · PERÍODO LECTIVO ${esc(cfg.periodoLectivo)}</p>
      </div>
      <table class="enc-datos">
        <tr><td class="etq">GRADO</td><td>${esc(grado)}</td></tr>
        <tr><td class="etq">EMISIÓN</td><td>${esc(fechaEmision())}</td></tr>
      </table>
    </div>

    <p class="linea-info">
      <span><strong>ESTUDIANTE:</strong> ${esc(est.nombre)}</span>
      <span><strong>SECCIÓN:</strong> ${esc(tutor?.seccion || "VESPERTINA")}</span>
      <span><strong>TUTOR:</strong> ${esc(tutor?.tutor || "")}</span>
    </p>

    <p class="subtitulo-libreta">Resumen anual</p>
    <table class="tabla tabla-notas">
      <thead><tr>
        <th>Asignatura</th><th>Docente</th>
        <th>T1</th><th>T2</th><th>T3</th><th>Promedio final</th><th>Estado</th>
      </tr></thead>
      <tbody>${resumen || `<tr><td colspan="7" class="centro">Este grado no tiene asignaturas registradas.</td></tr>`}</tbody>
      <tfoot><tr>
        <td colspan="5" class="derecha"><strong>PROMEDIO GENERAL</strong></td>
        ${celda(general)}
        <td class="centro">${general === null ? "—" : bajo(general) ? "Supletorio" : "Aprueba"}</td>
      </tr></tfoot>
    </table>
    <p class="nota-pie">Escala de 0 a 10 · nota mínima para aprobar: ${cfg.notaMinima}.</p>

    ${detalle}

    <p class="subtitulo-libreta">Asistencia</p>
    <table class="tabla tabla-notas">
      <thead><tr>
        <th>Días registrados</th><th>Días asistidos</th><th>% asistencia</th>
        <th>Injustificadas</th><th>Justificadas</th><th>Atrasos</th>
      </tr></thead>
      <tbody><tr>
        <td class="centro">${asist.diasRegistrados}</td>
        <td class="centro">${asist.diasAsistidos}</td>
        <td class="centro">${asist.porcentaje === null ? "—" : asist.porcentaje + "%"}</td>
        <td class="centro">${asist.I}</td>
        <td class="centro">${asist.J}</td>
        <td class="centro">${asist.A}</td>
      </tr></tbody>
    </table>

    <div class="recuadro-obs">
      <p>OBSERVACIONES:</p>
      <span class="linea-obs"></span><span class="linea-obs"></span><span class="linea-obs"></span>
    </div>

    <div class="firmas firmas-libreta">
      <div class="firma">
        <p class="firma-linea"></p>
        <p>${esc(tutor?.tutor || "Tutor(a)")}</p>
        <p>TUTOR(A)</p>
      </div>
      <div class="firma">
        <p class="firma-linea"></p>
        <p>&nbsp;</p>
        <p>REPRESENTANTE</p>
      </div>
    </div>
  </article>`;
}

function seleccion() {
  return selEst.value === "todos"
    ? datos.estudiantes
    : datos.estudiantes.filter(e => e.id === selEst.value);
}

function pintar() {
  const lista = seleccion();
  contenedor.innerHTML = lista.map(libretaHtml).join("");
  contenedor.hidden = false;

  const limpio = (s) => s.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_");
  nombreArchivo = lista.length === 1
    ? `Libreta_${limpio(lista[0].nombre)}_${limpio(grado)}_${datos.cfg.periodoLectivo}.pdf`
    : `Libretas_${limpio(grado)}_${datos.cfg.periodoLectivo}.pdf`;

  estado.textContent = notaModoOffline() +
    `${grado} — ${lista.length} libreta(s).`;
  history.replaceState(null, "",
    `?grado=${encodeURIComponent(grado)}&est=${encodeURIComponent(selEst.value)}`);
  actualizarCompartir();
}

/* ---------- PDF ---------- */

function cargarHtml2pdf() {
  if (window.html2pdf) return Promise.resolve();
  return new Promise((ok, fallo) => {
    const s = document.createElement("script");
    s.src = HTML2PDF;
    s.onload = ok;
    s.onerror = () => fallo(new Error("No se pudo cargar el generador de PDF. Revise su conexión."));
    document.head.appendChild(s);
  });
}

function generarPdf() {
  return window.html2pdf().set({
    margin: [8, 8, 8, 8],
    filename: nombreArchivo,
    image: { type: "jpeg", quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy"] }
  }).from(contenedor).outputPdf("blob");
}

// El PDF se genera con la hoja a ancho de página, no con el ancho de la ventana.
async function conModoPdf(accion) {
  document.body.classList.add("generando-pdf");
  try {
    await cargarHtml2pdf();
    return await accion();
  } finally {
    document.body.classList.remove("generando-pdf");
  }
}

function descargar(blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nombreArchivo;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function actualizarCompartir() {
  const prueba = new File([""], "prueba.pdf", { type: "application/pdf" });
  btnCompartir.hidden = !(navigator.canShare && navigator.canShare({ files: [prueba] }));
}

async function accionPdf(boton, textoOriginal, manejar) {
  boton.disabled = true;
  boton.textContent = "Generando...";
  try {
    await manejar();
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error(err);
      estado.textContent = "No se pudo generar el PDF: " + err.message;
    }
  } finally {
    boton.disabled = false;
    boton.textContent = textoOriginal;
  }
}

btnPdf.addEventListener("click", () =>
  accionPdf(btnPdf, "Descargar PDF", async () => {
    descargar(await conModoPdf(generarPdf));
  }));

btnCompartir.addEventListener("click", () =>
  accionPdf(btnCompartir, "Compartir", async () => {
    const blob = await conModoPdf(generarPdf);
    const archivo = new File([blob], nombreArchivo, { type: "application/pdf" });
    await navigator.share({
      files: [archivo],
      title: nombreArchivo.replace(/\.pdf$/, "").replaceAll("_", " ")
    });
  }));

selEst.addEventListener("change", pintar);
document.getElementById("btn-imprimir").addEventListener("click", () => window.print());

iniciar().catch(err => {
  console.error(err);
  estado.textContent = "Error al cargar la libreta: " + err.message;
});
