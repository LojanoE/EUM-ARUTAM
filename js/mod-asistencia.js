// Módulo: registro de asistencia diaria (nómina con marcas por hora).
import {
  obtenerGrados, obtenerEstudiantes, obtenerHorario, obtenerAsistencia,
  guardarAsistencia, obtenerFeriados, diaDeFecha, fechaHoy, CODIGOS, esc
} from "./data.js";
import { notificarOk, notificarError, confirmarAccion } from "./notificaciones.js";

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
      <p id="cargando-nomina" class="info cargando" hidden>Cargando nómina…</p>
    </div>

    <div class="panel selectores">
      <div>
        <label for="r-desde">Reporte: desde</label>
        <input type="date" id="r-desde">
      </div>
      <div>
        <label for="r-hasta">hasta</label>
        <input type="date" id="r-hasta">
      </div>
      <div>
        <button class="secundario" id="btn-reporte">Generar reporte por rango</button>
      </div>
      <p class="info" style="width:100%; margin:0;">
        Consolidado del grado seleccionado entre dos fechas, listo para imprimir o exportar a CSV.
      </p>
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
        Atajos con el foco en una celda: teclee la letra del código para marcarla sin abrir
        el menú (avanza a la siguiente), y use las flechas para moverse entre horas y estudiantes.
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
  const btnCargar = contenedor.querySelector("#btn-cargar");
  const cargando = contenedor.querySelector("#cargando-nomina");

  let estudiantes = [];
  let horarioDia = [];
  // Estado del registro en pantalla: grado/fecha cargados y si hay cambios
  // sin guardar (para avisar antes de descartarlos).
  let gradoActual = null;
  let fechaActual = null;
  let sucio = false;

  inpFecha.value = fechaHoy();
  const [grados, feriados] = await Promise.all([obtenerGrados(), obtenerFeriados()]);
  selGrado.innerHTML = grados
    .map(g => `<option value="${esc(g)}">${esc(g)}</option>`)
    .join("");

  function marcarSucio() {
    sucio = true;
    mensaje.textContent = "Cambios sin guardar.";
  }

  // Avisa si el usuario cambia de grado/fecha o sale de la página con la
  // nómina editada sin guardar.
  window.addEventListener("beforeunload", (e) => {
    if (sucio) e.preventDefault();
  });

  async function cargar() {
    mensaje.textContent = "";
    const grado = selGrado.value;
    const fecha = inpFecha.value;

    if (sucio && (grado !== gradoActual || fecha !== fechaActual)) {
      const descartar = await confirmarAccion(
        "Hay cambios sin guardar. ¿Descartarlos y cargar el nuevo día?",
        { textoConfirmar: "Descartar cambios", peligro: true });
      if (!descartar) {
        selGrado.value = gradoActual || grado;
        inpFecha.value = fechaActual || fecha;
        mensaje.textContent = "Cambios sin guardar.";
        return;
      }
      sucio = false;
    }

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
    if (feriados.includes(fecha)) {
      avisoDia.textContent = "La fecha seleccionada es feriado o suspensión; no hay clases.";
      avisoDia.hidden = false;
      return;
    }

    // Estado de carga: las 3 lecturas a Firestore pueden demorar en
    // conexiones lentas; sin esto la pantalla parece congelada y el usuario
    // hace clic varias veces sobre "Cargar".
    cargando.hidden = false;
    selGrado.disabled = true;
    inpFecha.disabled = true;
    btnCargar.disabled = true;
    try {
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
      pintarNomina(asistenciaPrevia);
      panelHorario.hidden = false;
      panelAsistencia.hidden = false;
      gradoActual = grado;
      fechaActual = fecha;
      sucio = false;
      mensaje.textContent = "";
    } catch (err) {
      notificarError("Error al cargar la nómina", err);
    } finally {
      cargando.hidden = true;
      selGrado.disabled = false;
      inpFecha.disabled = false;
      btnCargar.disabled = false;
    }
  }

  function pintarHorario() {
    tbodyHorario.innerHTML = horarioDia.map((h, i) => `
      <tr>
        <td class="centro">${i + 1}</td>
        <td>${esc(h.asignatura)}</td>
        <td>${esc(h.tiempo)}</td>
        <td>${esc(h.docente)}</td>
      </tr>`).join("");
  }

  function opcionesMarca(valor) {
    const opts = ['<option value=""></option>'];
    for (const c of CODIGOS) {
      opts.push(`<option value="${c}" ${valor === c ? "selected" : ""}>${c}</option>`);
    }
    return opts.join("");
  }

  function pintarNomina(asistenciaPrevia) {
    const numHoras = horarioDia.length;
    const registros = asistenciaPrevia?.registros || {};
    const observaciones = asistenciaPrevia?.observaciones || {};
    // Registro rápido: si el día no tiene registro previo, todos parten
    // como presentes y solo se cambian las excepciones.
    const prellenarP = !asistenciaPrevia;

    let cabecera = `<tr><th class="col-fija col-num">Nº</th>
      <th class="col-fija col-nombre">Estudiante</th><th>Toda la fila</th>`;
    for (let h = 1; h <= numHoras; h++) cabecera += `<th>${h}ª</th>`;
    cabecera += "<th>Observación</th></tr>";
    theadAsistencia.innerHTML = cabecera;

    tbodyAsistencia.innerHTML = estudiantes.map((est, idx) => {
      const marcas = registros[est.id] || {};
      let celdas = "";
      for (let h = 1; h <= numHoras; h++) {
        const valor = marcas[h] || (prellenarP ? "P" : "");
        celdas += `<td class="centro">
          <select class="marca ${valor || "vacia"}" data-est="${esc(est.id)}" data-hora="${h}">
            ${opcionesMarca(valor)}
          </select>
        </td>`;
      }
      return `<tr>
        <td class="centro col-fija col-num">${idx + 1}</td>
        <td class="nombre col-fija col-nombre">${esc(est.nombre)}</td>
        <td class="centro">
          <select class="fila-todo" data-fila-est="${esc(est.id)}" title="Marcar toda la fila con el mismo código">
            <option value=""></option>
            ${CODIGOS.map(c => `<option value="${c}">${c}</option>`).join("")}
          </select>
        </td>
        ${celdas}
        <td><input type="text" class="obs" data-obs-est="${esc(est.id)}"
                   placeholder="Motivo (si es I o J)"
                   value="${esc(observaciones[est.id] || "")}"></td>
      </tr>`;
    }).join("");

    lblResumen.textContent = ` (${estudiantes.length} estudiantes, ${numHoras} horas)`;

    tbodyAsistencia.querySelectorAll("select.marca").forEach(sel => {
      sel.addEventListener("change", () => {
        sel.className = "marca " + (sel.value || "vacia");
        marcarSucio();
      });
    });

    // Atajo: marcar todas las horas de la fila con el mismo código.
    tbodyAsistencia.querySelectorAll("select.fila-todo").forEach(sel => {
      sel.addEventListener("change", () => {
        if (!sel.value) return;
        const estId = sel.dataset.filaEst;
        tbodyAsistencia.querySelectorAll(`select.marca[data-est="${CSS.escape(estId)}"]`)
          .forEach(m => {
            m.value = sel.value;
            m.className = "marca " + sel.value;
          });
        sel.value = "";
        marcarSucio();
      });
    });

    tbodyAsistencia.querySelectorAll("input.obs").forEach(inp => {
      inp.addEventListener("input", marcarSucio);
    });
  }

  function marcarTodos(codigo) {
    tbodyAsistencia.querySelectorAll("select.marca").forEach(sel => {
      sel.value = codigo;
      sel.className = "marca " + codigo;
    });
  }

  // Enfoca la celda de marca del estudiante (por índice en `estudiantes`) y
  // la hora dados; no hace nada si cae fuera de la grilla.
  function enfocarCelda(idxEst, hora) {
    if (idxEst < 0 || idxEst >= estudiantes.length) return;
    if (hora < 1 || hora > horarioDia.length) return;
    const est = estudiantes[idxEst];
    tbodyAsistencia
      .querySelector(`select.marca[data-est="${CSS.escape(est.id)}"][data-hora="${hora}"]`)
      ?.focus();
  }

  // Tras marcar con la letra del código, avanza a la siguiente hora del
  // mismo estudiante o, si era la última, a la primera hora del siguiente
  // (como el tabulado de una hoja de cálculo).
  function avanzarFoco(sel) {
    const hora = Number(sel.dataset.hora);
    const idxEst = estudiantes.findIndex(x => x.id === sel.dataset.est);
    if (hora < horarioDia.length) enfocarCelda(idxEst, hora + 1);
    else enfocarCelda(idxEst + 1, 1);
  }

  // Atajos de teclado en la nómina: con el foco en una celda de marca,
  // teclear P/I/J/A/N la asigna sin abrir el desplegable, y las flechas
  // mueven el foco entre horas (izq/der) y estudiantes (arriba/abajo) en
  // vez de recorrer las opciones del <select> — para cargar la asistencia
  // completa del grado sin soltar el teclado.
  tbodyAsistencia.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const sel = e.target;
    if (!sel.matches("select.marca")) return;

    const letra = e.key.toUpperCase();
    if (CODIGOS.includes(letra)) {
      e.preventDefault();
      sel.value = letra;
      sel.className = "marca " + letra;
      marcarSucio();
      avanzarFoco(sel);
      return;
    }

    const hora = Number(sel.dataset.hora);
    const idxEst = estudiantes.findIndex(x => x.id === sel.dataset.est);
    switch (e.key) {
      case "ArrowRight": e.preventDefault(); enfocarCelda(idxEst, hora + 1); break;
      case "ArrowLeft":  e.preventDefault(); enfocarCelda(idxEst, hora - 1); break;
      case "ArrowDown":  e.preventDefault(); enfocarCelda(idxEst + 1, hora); break;
      case "ArrowUp":    e.preventDefault(); enfocarCelda(idxEst - 1, hora); break;
    }
  });

  function recogerRegistros() {
    const registros = {};
    const observaciones = {};
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
    tbodyAsistencia.querySelectorAll("input.obs").forEach(inp => {
      const texto = inp.value.trim();
      if (texto) observaciones[inp.dataset.obsEst] = texto;
    });
    return { registros, observaciones, incompletos };
  }

  btnCargar.addEventListener("click", cargar);
  selGrado.addEventListener("change", cargar);
  inpFecha.addEventListener("change", cargar);

  contenedor.querySelector("#btn-todos-p")
    .addEventListener("click", () => { marcarTodos("P"); marcarSucio(); });

  const btnGuardar = contenedor.querySelector("#btn-guardar");
  btnGuardar.addEventListener("click", async () => {
    const grado = selGrado.value;
    const fecha = inpFecha.value;
    const { registros, observaciones, incompletos } = recogerRegistros();
    if (incompletos > 0 && !(await confirmarAccion(
        `Hay ${incompletos} marca(s) sin llenar. ¿Guardar de todos modos?`,
        { textoConfirmar: "Guardar de todos modos" }))) {
      return;
    }
    btnGuardar.disabled = true;
    btnGuardar.textContent = "Guardando…";
    try {
      await guardarAsistencia(grado, fecha, registros, ctx.sesion.usuario, observaciones);
      sucio = false;
      mensaje.textContent = "Asistencia guardada correctamente.";
      notificarOk(`Asistencia de ${grado} del ${fecha} guardada y verificada en la base de datos.`);
    } catch (err) {
      notificarError("Error al guardar la asistencia", err);
    } finally {
      btnGuardar.disabled = false;
      btnGuardar.textContent = "Guardar asistencia";
    }
  });

  contenedor.querySelector("#btn-imprimir").addEventListener("click", () => {
    const grado = selGrado.value;
    const fecha = inpFecha.value;
    const url = `imprimir.html?grado=${encodeURIComponent(grado)}&fecha=${encodeURIComponent(fecha)}`;
    window.open(url, "_blank");
  });

  // Rango por defecto: mes en curso.
  const hoy = fechaHoy();
  contenedor.querySelector("#r-desde").value = hoy.slice(0, 8) + "01";
  contenedor.querySelector("#r-hasta").value = hoy;

  contenedor.querySelector("#btn-reporte").addEventListener("click", () => {
    const grado = selGrado.value;
    const desde = contenedor.querySelector("#r-desde").value;
    const hasta = contenedor.querySelector("#r-hasta").value;
    if (!grado || !desde || !hasta) {
      notificarError("Seleccione el grado y ambas fechas del rango.");
      return;
    }
    if (desde > hasta) {
      notificarError("La fecha 'desde' no puede ser posterior a 'hasta'.");
      return;
    }
    const url = `reporte.html?grado=${encodeURIComponent(grado)}` +
      `&desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`;
    window.open(url, "_blank");
  });

  await cargar();
}
