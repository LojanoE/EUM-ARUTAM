// Render de una hoja de asistencia (grado + fecha) para imprimir. Compartido
// por imprimir.js (una hoja) e imprimir-lote.js (varias hojas, una por
// contenedor, en la misma página) para que ambas usen exactamente el mismo
// markup y la misma lógica de datos.
import {
  obtenerEstudiantes, obtenerHorario, obtenerTutor, obtenerAsistencia,
  diaDeFecha, esc
} from "./data.js";

const MESES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

export function fechaLarga(f) {
  const [y, m, d] = f.split("-").map(Number);
  return `${d} DE ${MESES[m - 1]} DE ${y}`;
}

function contar(marcas, codigo) {
  return Object.values(marcas || {}).filter(v => v === codigo).length;
}

// Markup de una hoja, con data-f="..." en vez de id="..." para poder
// instanciarlo varias veces en la misma página (impresión por lote).
export function plantillaHojaHTML() {
  return `
    <div class="encabezado">
      <div class="enc-izquierda">
        <p class="linea-principal">UNIDAD EDUCATIVA DEL MILENIO "ARUTAM"</p>
        <p>EL PANGUI - ZAMORA CHINCHIPE - ECUADOR</p>
        <p>INSPECCIÓN PERIODO ACADÉMICO 2026 - 2027</p>
      </div>
      <table class="enc-datos">
        <tr><td class="etq">GRADO</td><td data-f="grado"></td></tr>
        <tr><td class="etq">FECHA</td><td data-f="fecha"></td></tr>
        <tr><td class="etq">DOCUMENTO</td><td data-f="documento"></td></tr>
        <tr><td class="etq">DÍA</td><td data-f="dia"></td></tr>
      </table>
    </div>

    <p class="linea-info">
      <span><strong>GRADO:</strong> <span data-f="i-grado"></span></span>
      <span><strong>SECCIÓN:</strong> <span data-f="i-seccion"></span></span>
      <span><strong>TUTOR:</strong> <span data-f="i-tutor"></span></span>
    </p>

    <table class="tabla tabla-horario-dia">
      <colgroup>
        <col style="width:4%"><col style="width:18%"><col style="width:11%">
        <col style="width:27%"><col style="width:20%">
        <col style="width:15%"><col style="width:5%">
      </colgroup>
      <thead>
        <tr>
          <th>N</th><th>ASIGNATURA</th><th>TIEMPO</th>
          <th>TEMA</th><th>NOMBRE DEL DOCENTE</th>
          <th>FIRMA DEL DOCENTE</th><th>Nº</th>
        </tr>
      </thead>
      <tbody data-f="tbody-horario"></tbody>
    </table>

    <table class="tabla tabla-nomina">
      <thead data-f="thead-nomina"></thead>
      <tbody data-f="tbody-nomina"></tbody>
    </table>

    <p class="observaciones">
      OBSERVACIONES: <span data-f="obs-linea" class="linea-puntos"></span>
    </p>

    <div class="firmas">
      <div class="firma">
        <p class="firma-linea"></p>
        <p data-f="f-nombre"></p>
        <p data-f="f-cargo"></p>
      </div>
    </div>`;
}

// Trae los datos necesarios para pintar una hoja. Si vacio=true, omite la
// lectura de asistencia (no hace falta: se va a ignorar igual al pintar).
// Devuelve { ok:false, motivo } si no hay clases ese día para ese grado, o
// { ok:true, ... } con todo lo necesario para pintarHoja().
export async function cargarDatosHoja({ grado, fecha, vacio = false }) {
  const dia = diaDeFecha(fecha);
  if (!dia) return { ok: false, motivo: "La fecha es fin de semana; no hay clases." };

  const [estudiantes, horario, tutor, asistencia] = await Promise.all([
    obtenerEstudiantes(grado),
    obtenerHorario(grado, dia),
    obtenerTutor(grado),
    vacio ? Promise.resolve(null) : obtenerAsistencia(grado, fecha),
  ]);

  if (horario.length === 0) {
    return { ok: false, motivo: `No hay horario registrado para ${grado} el día ${dia}.` };
  }

  return { ok: true, grado, fecha, dia, estudiantes, horario, tutor, asistencia, vacio };
}

// Pinta una hoja ya cargada (cargarDatosHoja) dentro de container, que debe
// contener el markup de plantillaHojaHTML(). firma = { nombre, cargo }.
export function pintarHoja(container, datos, firma) {
  const { grado, fecha, dia, estudiantes, horario, tutor, vacio } = datos;
  const q = (sel) => container.querySelector(`[data-f="${sel}"]`);
  // Al forzar "en blanco" se ignoran los registros/observaciones aunque
  // existan guardados, para entregar la hoja vacía a pesar de tener datos.
  const registros = vacio ? {} : (datos.asistencia?.registros || {});
  const observaciones = vacio ? {} : (datos.asistencia?.observaciones || {});

  q("f-nombre").textContent = firma.nombre;
  q("f-cargo").textContent = firma.cargo;

  q("grado").textContent = grado;
  q("fecha").textContent = fechaLarga(fecha);
  q("documento").textContent = `${fecha.replaceAll("-", "")}_${grado}`;
  q("dia").textContent = dia;
  q("i-grado").textContent = grado;
  q("i-seccion").textContent = tutor?.seccion || "VESPERTINA";
  q("i-tutor").textContent = tutor?.tutor || "";

  q("tbody-horario").innerHTML = horario.map((h, i) => `
    <tr>
      <td class="centro">${i + 1}</td>
      <td>${esc(h.asignatura)}</td>
      <td class="centro">${esc(h.tiempo)}</td>
      <td></td>
      <td>${esc(h.docente)}</td>
      <td></td>
      <td></td>
    </tr>`).join("");

  const numHoras = horario.length;
  let filaFecha = `<tr><th rowspan="3">Nº</th><th rowspan="3">NÓMINA DE ESTUDIANTES</th>
    <th colspan="${numHoras}">${fechaLarga(fecha)}</th><th colspan="3">TOTAL</th></tr>`;
  let filaHoras = `<tr><th colspan="${numHoras}">Horas</th>
    <th rowspan="2">JUSTIFICADO</th><th rowspan="2">INJUSTIFICADO</th>
    <th rowspan="2">ATRASO</th></tr>`;
  let filaNums = "<tr>";
  for (let h = 1; h <= numHoras; h++) filaNums += `<th>${h}ª</th>`;
  filaNums += "</tr>";
  q("thead-nomina").innerHTML = filaFecha + filaHoras + filaNums;

  q("tbody-nomina").innerHTML = estudiantes.map((est, idx) => {
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
    </tr>`;
  }).join("");

  // Línea de observaciones: se autorrellena con los comentarios del día
  // (Nº y nombre + motivo); si no hay, queda la línea de puntos.
  const partes = [];
  estudiantes.forEach((est, idx) => {
    const texto = observaciones[est.id];
    if (texto) partes.push(`${idx + 1} ${est.nombre}: ${texto}`);
  });
  const obsSpan = q("obs-linea");
  if (partes.length > 0) {
    obsSpan.classList.remove("linea-puntos");
    obsSpan.textContent = partes.join(";  ") + ".";
  }
}

// Red de seguridad: si la hoja no cabe en una A4 (cursos con muchos
// estudiantes u horas), la reduce hasta que quepa, en vez de saltar a una
// segunda página. En cursos normales la escala se queda en 1.
export function ajustarAUnaPagina(hoja) {
  // A4 (29.7cm) menos el padding de impresión (0.9cm arriba y abajo), a 96dpi.
  const altoUtil = ((29.7 - 1.8) / 2.54) * 96;
  let escala = 1;
  hoja.style.setProperty("--escala", escala);
  while (hoja.scrollHeight > altoUtil && escala > 0.7) {
    escala = Math.round((escala - 0.02) * 100) / 100;
    hoja.style.setProperty("--escala", escala);
  }
}
