// Módulo: cargas docentes y configuración de calificaciones (solo admin).
// Las cargas (grado + asignatura de cada docente) salen de los horarios y se
// vinculan con el usuario por nombre; aquí se añaden cargas extra (reemplazos)
// y se configuran los pesos de las calificaciones.
import {
  obtenerCargasManuales, agregarCarga, eliminarCarga, obtenerUsuarios, obtenerGrados,
  obtenerAsignaturas, obtenerConfig, guardarConfig, esc
} from "./data.js";
import { notificarOk, notificarError, confirmarAccion } from "./notificaciones.js";

const ESTILO_INPUT =
  "width:100%; padding:0.45rem 0.6rem; border:1px solid var(--borde); border-radius:6px;";

export async function initCargas(contenedor, ctx) {
  if (!ctx.esAdmin) {
    contenedor.innerHTML = `<p class="aviso">Este módulo es solo para administradores.</p>`;
    return;
  }

  const [usuarios, grados, asignaturas, cfg] = await Promise.all([
    obtenerUsuarios(), obtenerGrados(), obtenerAsignaturas(), obtenerConfig()
  ]);
  const docentes = usuarios.filter(u => u.rol === "docente");
  const p = cfg.pesosNotas;
  const pct = (v) => Math.round(v * 100);

  contenedor.innerHTML = `
    <h2 class="titulo-modulo">Cargas docentes</h2>

    <div class="panel">
      <h2 style="font-size:1rem; margin-top:0;">Configuración de calificaciones</h2>
      <div class="selectores">
        <div>
          <label for="c-periodo">Período lectivo</label>
          <input type="text" id="c-periodo" value="${esc(cfg.periodoLectivo)}" style="width:8rem; padding:0.45rem 0.6rem; border:1px solid var(--borde); border-radius:6px;">
        </div>
        <div>
          <label for="c-trim">Trimestre abierto</label>
          <select id="c-trim">
            ${[1, 2, 3].map(t => `<option value="${t}" ${t === cfg.trimestreAbierto ? "selected" : ""}>Trimestre ${t}</option>`).join("")}
          </select>
        </div>
        <div>
          <label for="c-min">Nota mínima</label>
          <input type="text" id="c-min" value="${cfg.notaMinima}" style="width:4rem; padding:0.45rem 0.6rem; border:1px solid var(--borde); border-radius:6px;">
        </div>
      </div>
      <div class="selectores" style="margin-top:0.6rem;">
        <div><label for="c-pf">% Formativa</label>
          <input type="text" id="c-pf" value="${pct(p.formativa)}" style="width:4.5rem; padding:0.45rem 0.6rem; border:1px solid var(--borde); border-radius:6px;"></div>
        <div><label for="c-ps">% Sumativa</label>
          <input type="text" id="c-ps" value="${pct(p.sumativa)}" style="width:4.5rem; padding:0.45rem 0.6rem; border:1px solid var(--borde); border-radius:6px;"></div>
        <div><label for="c-pp">% Proyecto (dentro de la sumativa)</label>
          <input type="text" id="c-pp" value="${pct(p.proyecto)}" style="width:4.5rem; padding:0.45rem 0.6rem; border:1px solid var(--borde); border-radius:6px;"></div>
        <div><label for="c-pe">% Examen (dentro de la sumativa)</label>
          <input type="text" id="c-pe" value="${pct(p.examen)}" style="width:4.5rem; padding:0.45rem 0.6rem; border:1px solid var(--borde); border-radius:6px;"></div>
        <div><button class="primario" id="c-guardar-cfg">Guardar configuración</button></div>
      </div>
      <p class="info">Formativa + Sumativa deben sumar 100, y Proyecto + Examen también.
        Solo el trimestre abierto es editable para los docentes.</p>
    </div>

    <div class="panel">
      <p class="info">Las materias de cada docente salen de los <strong>horarios</strong> y se vinculan con su
        usuario por el nombre. La lista de docentes y la creación de cuentas están en el módulo
        <strong>Docentes</strong>.</p>
    </div>

    <div class="panel">
      <h2 style="font-size:1rem; margin-top:0;">Cargas adicionales (reemplazos)</h2>
      ${docentes.length ? "" : `<p class="aviso">No hay usuarios con rol <strong>docente</strong>. Créelos en el módulo Usuarios.</p>`}
      <div class="selectores">
        <div style="min-width:160px;">
          <label for="c-docente">Docente</label>
          <select id="c-docente" style="${ESTILO_INPUT}">
            ${docentes.map(d => `<option value="${esc(d.usuario)}">${esc(d.nombre || d.usuario)} (${esc(d.usuario)})</option>`).join("")}
          </select>
        </div>
        <div style="min-width:160px;">
          <label for="c-grado">Grado</label>
          <select id="c-grado" style="${ESTILO_INPUT}">
            ${grados.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join("")}
          </select>
        </div>
        <div style="flex:1; min-width:180px;">
          <label for="c-asig">Asignatura</label>
          <input type="text" id="c-asig" list="c-asig-lista" placeholder="MATEMÁTICA" style="${ESTILO_INPUT}">
          <datalist id="c-asig-lista">
            ${asignaturas.map(a => `<option value="${esc(a)}"></option>`).join("")}
          </datalist>
        </div>
        <div><button class="primario" id="c-agregar" ${docentes.length ? "" : "disabled"}>Asignar</button></div>
      </div>
    </div>

    <div class="panel">
      <div style="overflow-x:auto;">
        <table class="tabla-gestion">
          <thead><tr><th>Usuario</th><th>Grado</th><th>Asignatura</th><th>Acciones</th></tr></thead>
          <tbody id="tbody-cargas"></tbody>
        </table>
      </div>
    </div>`;

  const tbody = contenedor.querySelector("#tbody-cargas");
  const nombreDe = Object.fromEntries(usuarios.map(u => [u.usuario, u.nombre || u.usuario]));

  async function pintar() {
    const cargas = await obtenerCargasManuales();
    tbody.innerHTML = cargas.length ? cargas.map(c => `
      <tr>
        <td>${esc(nombreDe[c.docente] || c.docente)} <small>(${esc(c.docente)})</small></td>
        <td>${esc(c.grado)}</td>
        <td>${esc(c.asignatura)}</td>
        <td class="centro">
          <button class="btn-mini peligro" data-eliminar-carga="${esc(c.id)}">Quitar</button>
        </td>
      </tr>`).join("")
      : `<tr><td colspan="4" class="centro">Sin cargas adicionales.</td></tr>`;
  }

  tbody.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-eliminar-carga]");
    if (!btn) return;
    const ok = await confirmarAccion(
      "¿Quitar esta carga? Las notas ya registradas no se borran, " +
      "pero el docente dejará de verlas.",
      { textoConfirmar: "Quitar", peligro: true });
    if (!ok) return;
    try {
      await eliminarCarga(btn.dataset.eliminarCarga);
      notificarOk("Carga eliminada.");
    } catch (err) {
      notificarError("Error al quitar la carga", err);
    }
    await pintar();
  });

  contenedor.querySelector("#c-agregar").addEventListener("click", async () => {
    const docente = contenedor.querySelector("#c-docente").value;
    const grado = contenedor.querySelector("#c-grado").value;
    const asignatura = contenedor.querySelector("#c-asig").value.trim().toUpperCase();
    if (!docente || !grado || !asignatura) {
      notificarError("Complete docente, grado y asignatura.");
      return;
    }
    try {
      await agregarCarga(docente, grado, asignatura);
      contenedor.querySelector("#c-asig").value = "";
      notificarOk("Carga asignada.");
    } catch (err) {
      notificarError("Error al asignar la carga", err);
    }
    await pintar();
  });

  contenedor.querySelector("#c-guardar-cfg").addEventListener("click", async () => {
    const num = (id) => Number(contenedor.querySelector(id).value.trim().replace(",", "."));
    const pf = num("#c-pf"), ps = num("#c-ps"), pp = num("#c-pp"), pe = num("#c-pe");
    const min = num("#c-min");
    const periodo = contenedor.querySelector("#c-periodo").value.trim();
    if (!periodo) { notificarError("Ingrese el período lectivo."); return; }
    if ([pf, ps, pp, pe, min].some(n => !Number.isFinite(n) || n < 0)) {
      notificarError("Los porcentajes y la nota mínima deben ser números."); return;
    }
    if (pf + ps !== 100 || pp + pe !== 100) {
      notificarError("Formativa + Sumativa y Proyecto + Examen deben sumar 100 cada uno."); return;
    }
    if (min > 10) { notificarError("La nota mínima no puede pasar de 10."); return; }
    try {
      await guardarConfig({
        periodoLectivo: periodo,
        trimestreAbierto: Number(contenedor.querySelector("#c-trim").value),
        notaMinima: min,
        pesosNotas: { formativa: pf / 100, sumativa: ps / 100, proyecto: pp / 100, examen: pe / 100 }
      });
      notificarOk("Configuración guardada.");
    } catch (err) {
      notificarError("Error al guardar la configuración", err);
    }
  });

  await pintar();
}
