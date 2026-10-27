// Módulo: calificaciones por trimestre. Cada docente ve solo sus cargas
// (grado + asignatura); el admin ve todas. Escala 0-10: insumos formativos
// (columnas libres) + proyecto + examen, con promedio automático.
import {
  obtenerCargas, obtenerCargasDeDocente, obtenerEstudiantes, obtenerConfig,
  obtenerNotas, obtenerNotasAnuales, guardarNotas, promedioTrimestre,
  promedioFinal, esc
} from "./data.js";
import { notificarOk, notificarError } from "./notificaciones.js";

const fmt = (n) => (n === null || n === undefined ? "—" : n.toFixed(2));

// Convierte el texto de un input en número 0-10 (null si está vacío).
// Devuelve NaN si el valor no es válido.
function leerNota(texto) {
  const t = String(texto).trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 && n <= 10 ? Math.round(n * 100) / 100 : NaN;
}

export async function initNotas(contenedor, ctx) {
  const [cargas, cfg] = await Promise.all([
    ctx.esAdmin ? obtenerCargas() : obtenerCargasDeDocente(ctx.sesion.usuario),
    obtenerConfig()
  ]);

  if (!cargas.length) {
    contenedor.innerHTML = `
      <h2 class="titulo-modulo">Notas</h2>
      <p class="aviso">${ctx.esAdmin
        ? "Aún no hay cargas docentes. Créelas en el módulo Cargas."
        : "No tiene grados ni asignaturas asignados. Consulte con administración."}</p>`;
    return;
  }

  const periodo = cfg.periodoLectivo;
  const pesos = cfg.pesosNotas;
  let estudiantes = [];
  let nombresInsumos = [];
  let notas = {};           // { [estudianteId]: { formativas, proyecto, examen } }
  let vista = "trimestre";  // "trimestre" | "anual"

  contenedor.innerHTML = `
    <h2 class="titulo-modulo">Notas</h2>
    <div class="panel">
      <div class="selectores">
        <div style="flex:1; min-width:200px;">
          <label for="n-carga">Grado y asignatura</label>
          <select id="n-carga" style="width:100%;">
            ${cargas.map((c, i) => `
              <option value="${i}">${esc(c.grado)} — ${esc(c.asignatura)}${
                ctx.esAdmin ? ` (${esc(c.docente)})` : ""}</option>`).join("")}
          </select>
        </div>
        <div>
          <label for="n-trimestre">Trimestre</label>
          <select id="n-trimestre">
            ${[1, 2, 3].map(t => `<option value="${t}" ${t === cfg.trimestreAbierto ? "selected" : ""}>
              Trimestre ${t}${t === cfg.trimestreAbierto ? " (abierto)" : ""}</option>`).join("")}
          </select>
        </div>
        <div>
          <button class="secundario" id="n-vista">Ver resumen anual</button>
        </div>
      </div>
      <p class="info">Período lectivo ${esc(periodo)} · escala de 0 a 10 · nota mínima para aprobar: ${cfg.notaMinima}.</p>
    </div>
    <div class="panel" id="n-panel"></div>`;

  const selCarga = contenedor.querySelector("#n-carga");
  const selTrim = contenedor.querySelector("#n-trimestre");
  const btnVista = contenedor.querySelector("#n-vista");
  const panel = contenedor.querySelector("#n-panel");

  const cargaActual = () => cargas[Number(selCarga.value)];
  const trimestre = () => Number(selTrim.value);
  // El docente solo edita el trimestre abierto; el admin cualquiera.
  const editable = () => ctx.esAdmin || trimestre() === cfg.trimestreAbierto;

  async function cargarTrimestre() {
    const c = cargaActual();
    panel.innerHTML = `<p class="info">Cargando...</p>`;
    const [ests, guardado] = await Promise.all([
      obtenerEstudiantes(c.grado),
      obtenerNotas(c.grado, c.asignatura, periodo, trimestre())
    ]);
    estudiantes = ests;
    nombresInsumos = guardado?.nombresInsumos?.length
      ? [...guardado.nombresInsumos] : ["Insumo 1", "Insumo 2"];
    notas = guardado?.notas || {};
    pintarTrimestre();
  }

  function pintarTrimestre() {
    const ed = editable();
    const dis = ed ? "" : "disabled";
    const entrada = (id) => notas[id] || {};
    const celda = (v, attrs) =>
      `<input type="text" inputmode="decimal" class="nota-in" ${attrs} ${dis}
              value="${v === null || v === undefined ? "" : v}">`;

    panel.innerHTML = `
      ${ed ? "" : `<p class="aviso">Este trimestre está cerrado: solo lectura.</p>`}
      ${estudiantes.length ? "" : `<p class="aviso">Este grado no tiene estudiantes activos.</p>`}
      <div style="overflow-x:auto;">
        <table class="tabla-gestion">
          <thead>
            <tr>
              <th>Nº</th><th>Estudiante</th>
              ${nombresInsumos.map((n, i) => `
                <th>
                  <input type="text" class="nombre-insumo" data-insumo="${i}" ${dis}
                         value="${esc(n)}" style="width:6.5rem;">
                </th>`).join("")}
              <th>Proyecto</th><th>Examen</th><th>Promedio</th>
            </tr>
          </thead>
          <tbody>
            ${estudiantes.map((e, idx) => {
              const n = entrada(e.id);
              return `
                <tr data-est="${esc(e.id)}">
                  <td class="centro">${idx + 1}</td>
                  <td>${esc(e.nombre)}</td>
                  ${nombresInsumos.map((_, i) =>
                    `<td class="centro">${celda(n.formativas?.[i], `data-formativa="${i}"`)}</td>`).join("")}
                  <td class="centro">${celda(n.proyecto, `data-campo="proyecto"`)}</td>
                  <td class="centro">${celda(n.examen, `data-campo="examen"`)}</td>
                  <td class="centro celda-prom"></td>
                </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
      ${ed ? `
        <div class="acciones" style="margin-top:0.8rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
          <button class="secundario" id="n-mas">+ Insumo</button>
          <button class="secundario" id="n-menos" ${nombresInsumos.length <= 1 ? "disabled" : ""}>− Insumo</button>
          <button class="primario" id="n-guardar">Guardar notas</button>
        </div>` : ""}`;
    estudiantes.forEach(e => recalcular(e.id));
  }

  // Lee la fila del DOM al modelo `notas`. Devuelve false si hay un valor inválido.
  function leerFila(fila) {
    const id = fila.dataset.est;
    const ent = { formativas: [], proyecto: null, examen: null };
    let ok = true;
    fila.querySelectorAll(".nota-in").forEach(inp => {
      const v = leerNota(inp.value);
      inp.classList.toggle("invalido", Number.isNaN(v));
      if (Number.isNaN(v)) { ok = false; return; }
      if (inp.dataset.formativa !== undefined) ent.formativas[Number(inp.dataset.formativa)] = v;
      else ent[inp.dataset.campo] = v;
    });
    notas[id] = ent;
    return ok;
  }

  function recalcular(id) {
    const fila = panel.querySelector(`tr[data-est="${CSS.escape(id)}"]`);
    if (!fila) return true;
    const ok = leerFila(fila);
    const p = ok ? promedioTrimestre(notas[id], pesos) : null;
    const td = fila.querySelector(".celda-prom");
    td.textContent = fmt(p);
    td.classList.toggle("bajo", p !== null && p < cfg.notaMinima);
    return ok;
  }

  // Sincroniza los nombres de insumos desde el DOM antes de agregar/quitar.
  function leerNombres() {
    panel.querySelectorAll(".nombre-insumo").forEach(inp => {
      nombresInsumos[Number(inp.dataset.insumo)] = inp.value.trim() || `Insumo ${Number(inp.dataset.insumo) + 1}`;
    });
  }

  panel.addEventListener("input", (e) => {
    const fila = e.target.closest("tr[data-est]");
    if (fila && e.target.classList.contains("nota-in")) recalcular(fila.dataset.est);
  });

  panel.addEventListener("click", async (e) => {
    if (e.target.closest("#n-mas")) {
      estudiantes.forEach(s => recalcular(s.id));
      leerNombres();
      nombresInsumos.push(`Insumo ${nombresInsumos.length + 1}`);
      pintarTrimestre();
      return;
    }
    if (e.target.closest("#n-menos")) {
      estudiantes.forEach(s => recalcular(s.id));
      leerNombres();
      nombresInsumos.pop();
      Object.values(notas).forEach(n => { if (n.formativas) n.formativas.length = nombresInsumos.length; });
      pintarTrimestre();
      return;
    }
    if (e.target.closest("#n-guardar")) {
      const todoOk = estudiantes.map(s => recalcular(s.id)).every(Boolean);
      if (!todoOk) {
        notificarError("Hay notas inválidas (resaltadas): deben estar entre 0 y 10.");
        return;
      }
      leerNombres();
      // Solo se guardan los estudiantes que tienen alguna nota.
      const aGuardar = {};
      for (const s of estudiantes) {
        const n = notas[s.id];
        const tiene = n && (n.proyecto !== null || n.examen !== null ||
          n.formativas.some(v => v !== null && v !== undefined));
        if (tiene) {
          aGuardar[s.id] = {
            formativas: nombresInsumos.map((_, i) => n.formativas[i] ?? null),
            proyecto: n.proyecto, examen: n.examen
          };
        }
      }
      const c = cargaActual();
      try {
        await guardarNotas(c.grado, c.asignatura, periodo, trimestre(),
          { nombresInsumos, notas: aGuardar }, ctx.sesion.usuario);
        notificarOk(`Notas guardadas (${Object.keys(aGuardar).length} estudiante(s)).`);
      } catch (err) {
        notificarError("No se pudieron guardar las notas", err);
      }
    }
  });

  async function pintarAnual() {
    const c = cargaActual();
    panel.innerHTML = `<p class="info">Cargando...</p>`;
    const [ests, docs] = await Promise.all([
      obtenerEstudiantes(c.grado),
      obtenerNotasAnuales(c.grado, c.asignatura, periodo)
    ]);
    const filas = ests.map((e, i) => {
      const t = docs.map(d => promedioTrimestre(d?.notas?.[e.id], pesos));
      const fin = promedioFinal(t);
      const estado = fin === null ? "—" : fin >= cfg.notaMinima ? "Aprueba" : "Supletorio";
      return `
        <tr>
          <td class="centro">${i + 1}</td><td>${esc(e.nombre)}</td>
          ${t.map(v => `<td class="centro">${fmt(v)}</td>`).join("")}
          <td class="centro"><strong>${fmt(fin)}</strong></td>
          <td class="centro ${estado === "Supletorio" ? "bajo" : ""}">${estado}</td>
        </tr>`;
    });
    panel.innerHTML = `
      <div style="overflow-x:auto;">
        <table class="tabla-gestion">
          <thead>
            <tr><th>Nº</th><th>Estudiante</th><th>T1</th><th>T2</th><th>T3</th>
                <th>Final</th><th>Estado</th></tr>
          </thead>
          <tbody>${filas.join("")}</tbody>
        </table>
      </div>`;
  }

  function actualizar() {
    const errorUI = (err) => notificarError("Error al cargar las notas", err);
    (vista === "anual" ? pintarAnual() : cargarTrimestre()).catch(errorUI);
  }

  selCarga.addEventListener("change", actualizar);
  selTrim.addEventListener("change", () => { if (vista === "trimestre") actualizar(); });
  btnVista.addEventListener("click", () => {
    vista = vista === "trimestre" ? "anual" : "trimestre";
    btnVista.textContent = vista === "anual" ? "Volver a captura" : "Ver resumen anual";
    selTrim.disabled = vista === "anual";
    actualizar();
  });

  await cargarTrimestre();
}
