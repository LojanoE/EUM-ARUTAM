// Lógica de la pantalla principal: registro de asistencia por grado y fecha.
import { exigirSesion, cerrarSesion } from "./auth.js";
import {
  obtenerGrados, obtenerEstudiantes, obtenerHorario, obtenerAsistencia,
  guardarAsistencia, diaDeFecha, CODIGOS
} from "./data.js";

const sesion = exigirSesion();
if (sesion) {
  document.getElementById("nombre-usuario").textContent = sesion.nombre;
}

document.getElementById("btn-salir").addEventListener("click", () => {
  cerrarSesion();
  location.href = "index.html";
});

const selGrado = document.getElementById("sel-grado");
const inpFecha = document.getElementById("inp-fecha");
const avisoDia = document.getElementById("aviso-dia");
const panelHorario = document.getElementById("panel-horario");
const panelAsistencia = document.getElementById("panel-asistencia");
const tbodyHorario = document.getElementById("tbody-horario");
const theadAsistencia = document.getElementById("thead-asistencia");
const tbodyAsistencia = document.getElementById("tbody-asistencia");
const lblDia = document.getElementById("lbl-dia");
const lblResumen = document.getElementById("lbl-resumen");
const mensaje = document.getElementById("mensaje");

let estudiantes = [];
let horarioDia = [];

function fechaHoy() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dia}`;
}

async function iniciar() {
  inpFecha.value = fechaHoy();
  const grados = await obtenerGrados();
  selGrado.innerHTML = grados
    .map(g => `<option value="${g}">${g}</option>`)
    .join("");
  await cargar();
}

async function cargar() {
  mensaje.textContent = "";
  const grado = selGrado.value;
  const fecha = inpFecha.value;
  avisoDia.hidden = true;
  panelHorario.hidden = true;
  panelAsistencia.hidden = true;

  if (!grado || !fecha) return;

  const dia = diaDeFecha(fecha);
  if (!dia) {
    avisoDia.textContent = "La fecha seleccionada es fin de semana; no hay clases.";
    avisoDia.hidden = false;
    return;
  }

  [estudiantes, horarioDia] = await Promise.all([
    obtenerEstudiantes(grado),
    obtenerHorario(grado, dia),
  ]);
  const asistenciaPrevia = await obtenerAsistencia(grado, fecha);

  if (horarioDia.length === 0) {
    avisoDia.textContent = `No hay horario registrado para ${grado} el día ${dia}.`;
    avisoDia.hidden = false;
    return;
  }

  lblDia.textContent = dia;
  pintarHorario();
  pintarNomina(asistenciaPrevia ? asistenciaPrevia.registros : {});
  panelHorario.hidden = false;
  panelAsistencia.hidden = false;
}

function pintarHorario() {
  tbodyHorario.innerHTML = horarioDia.map((h, i) => `
    <tr>
      <td class="centro">${i + 1}</td>
      <td>${h.asignatura}</td>
      <td>${h.tiempo}</td>
      <td>${h.docente}</td>
    </tr>`).join("");
}

function opcionesMarca(valor) {
  const opts = ['<option value=""></option>'];
  for (const c of CODIGOS) {
    opts.push(`<option value="${c}" ${valor === c ? "selected" : ""}>${c}</option>`);
  }
  return opts.join("");
}

function pintarNomina(registros) {
  const numHoras = horarioDia.length;

  let cabecera = "<tr><th>Nº</th><th>Estudiante</th>";
  for (let h = 1; h <= numHoras; h++) cabecera += `<th>${h}ª</th>`;
  cabecera += "</tr>";
  theadAsistencia.innerHTML = cabecera;

  tbodyAsistencia.innerHTML = estudiantes.map((est, idx) => {
    const marcas = registros[est.id] || {};
    let celdas = "";
    for (let h = 1; h <= numHoras; h++) {
      const valor = marcas[h] || "";
      celdas += `<td class="centro">
        <select class="marca ${valor || "vacia"}" data-est="${est.id}" data-hora="${h}">
          ${opcionesMarca(valor)}
        </select>
      </td>`;
    }
    return `<tr>
      <td class="centro">${idx + 1}</td>
      <td class="nombre">${est.nombre}</td>
      ${celdas}
    </tr>`;
  }).join("");

  lblResumen.textContent = ` (${estudiantes.length} estudiantes, ${numHoras} horas)`;

  tbodyAsistencia.querySelectorAll("select.marca").forEach(sel => {
    sel.addEventListener("change", () => {
      sel.className = "marca " + (sel.value || "vacia");
    });
  });
}

function marcarTodos(codigo) {
  tbodyAsistencia.querySelectorAll("select.marca").forEach(sel => {
    sel.value = codigo;
    sel.className = "marca " + codigo;
  });
}

function recogerRegistros() {
  const registros = {};
  let incompletos = 0;
  tbodyAsistencia.querySelectorAll("select.marca").forEach(sel => {
    const estId = sel.dataset.est;
    const hora = sel.dataset.hora;
    if (!sel.value) {
      incompletos++;
      return;
    }
    registros[estId] = registros[estId] || {};
    registros[estId][hora] = sel.value;
  });
  return { registros, incompletos };
}

document.getElementById("btn-cargar").addEventListener("click", cargar);
selGrado.addEventListener("change", cargar);
inpFecha.addEventListener("change", cargar);

document.getElementById("btn-todos-p").addEventListener("click", () => marcarTodos("P"));

document.getElementById("btn-guardar").addEventListener("click", async () => {
  const grado = selGrado.value;
  const fecha = inpFecha.value;
  const { registros, incompletos } = recogerRegistros();
  if (incompletos > 0 &&
      !confirm(`Hay ${incompletos} marca(s) sin llenar. ¿Guardar de todos modos?`)) {
    return;
  }
  try {
    await guardarAsistencia(grado, fecha, registros, sesion.usuario);
    mensaje.textContent = "Asistencia guardada correctamente.";
  } catch (err) {
    console.error(err);
    alert("Error al guardar: " + err.message);
  }
});

document.getElementById("btn-imprimir").addEventListener("click", () => {
  const grado = selGrado.value;
  const fecha = inpFecha.value;
  const url = `imprimir.html?grado=${encodeURIComponent(grado)}&fecha=${encodeURIComponent(fecha)}`;
  window.open(url, "_blank");
});

iniciar().catch(err => {
  console.error(err);
  avisoDia.textContent = "Error al cargar datos: " + err.message;
  avisoDia.hidden = false;
});
