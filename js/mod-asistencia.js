// Módulo: registro de asistencia diaria (nómina con marcas por hora).
import {
  obtenerGrados, obtenerEstudiantes, obtenerHorario, obtenerAsistencia,
  guardarAsistencia, diaDeFecha, fechaHoy, CODIGOS
} from "./data.js";

export async function initAsistencia(contenedor, ctx) {
  contenedor.innerHTML = `
    <h2 class="titulo-modulo">Registro de asistencia</h2>
    <div class="panel selectores">
      <div>
        <label for="sel-grado">Grado</label>
        <select id="sel-grado"></select>
      </div>
      <div>
        <label for="inp-fecha">Fecha</label>
        <input type="date" id="inp-fecha">
      </div>
      <div>
        <button class="secundario" id="btn-cargar">Cargar</button>
      </div>
      <p id="aviso-dia" class="aviso" hidden></p>
    </div>

    <div class="panel" id="panel-horario" hidden>
      <h2 style="font-size:1rem; margin-top:0;">Horario del día — <span id="lbl-dia"></span></h2>
      <table class="tabla-horario">
        <thead>
          <tr><th>N</th><th>Asignatura</th><th>Tiempo</th><th>Docente</th></tr>
        </thead>
        <tbody id="tbody-horario"></tbody>
      </table>
    </div>

    <div class="panel" id="panel-asistencia" hidden>
      <h2 style="font-size:1rem; margin-top:0;">
        Nómina de estudiantes
        <span class="info" id="lbl-resumen"></span>
      </h2>
      <div style="overflow-x:auto;">
        <table class="tabla-asistencia">
          <thead id="thead-asistencia"></thead>
          <tbody id="tbody-asistencia"></tbody>
        </table>
      </div>
      <div class="fila-acciones">
        <button class="secundario" id="btn-todos-p">Todos presentes</button>
        <button class="primario" id="btn-guardar">Guardar asistencia</button>
        <button class="secundario" id="btn-imprimir">Imprimir reporte</button>
        <span id="mensaje" class="mensaje-ok"></span>
      </div>
      <p class="info">
        Códigos: P = Presente, I = Injustificado, J = Justificado, A = Atraso, N = No hay clases.
      </p>
    </div>`;

  const selGrado = contenedor.querySelector("#sel-grado");
  const inpFecha = contenedor.querySelector("#inp-fecha");
  const avisoDia = contenedor.querySelector("#aviso-dia");
  const panelHorario = contenedor.querySelector("#panel-horario");
  const panelAsistencia = contenedor.querySelector("#panel-asistencia");
  const tbodyHorario = contenedor.querySelector("#tbody-horario");
  const theadAsistencia = contenedor.querySelector("#thead-asistencia");
  const tbodyAsistencia = contenedor.querySelector("#tbody-asistencia");
  const lblDia = contenedor.querySelector("#lbl-dia");
  const lblResumen = contenedor.querySelector("#lbl-resumen");
  const mensaje = contenedor.querySelector("#mensaje");

  let estudiantes = [];
  let horarioDia = [];

  inpFecha.value = fechaHoy();
  const grados = await obtenerGrados();
  selGrado.innerHTML = grados
    .map(g => `<option value="${g}">${g}</option>`)
    .join("");

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

  contenedor.querySelector("#btn-cargar").addEventListener("click", cargar);
  selGrado.addEventListener("change", cargar);
  inpFecha.addEventListener("change", cargar);

  contenedor.querySelector("#btn-todos-p")
    .addEventListener("click", () => marcarTodos("P"));

  contenedor.querySelector("#btn-guardar").addEventListener("click", async () => {
    const grado = selGrado.value;
    const fecha = inpFecha.value;
    const { registros, incompletos } = recogerRegistros();
    if (incompletos > 0 &&
        !confirm(`Hay ${incompletos} marca(s) sin llenar. ¿Guardar de todos modos?`)) {
      return;
    }
    try {
      await guardarAsistencia(grado, fecha, registros, ctx.sesion.usuario);
      mensaje.textContent = "Asistencia guardada correctamente.";
    } catch (err) {
      console.error(err);
      alert("Error al guardar: " + err.message);
    }
  });

  contenedor.querySelector("#btn-imprimir").addEventListener("click", () => {
    const grado = selGrado.value;
    const fecha = inpFecha.value;
    const url = `imprimir.html?grado=${encodeURIComponent(grado)}&fecha=${encodeURIComponent(fecha)}`;
    window.open(url, "_blank");
  });

  await cargar();
}
