// Módulo: gestión de grados (solo admin): agregar, editar tutor/sección,
// renombrar con cascada y eliminar grados vacíos.
import {
  obtenerTutores, contarPorGrado, agregarGrado, actualizarGrado,
  renombrarGrado, eliminarGrado, esc
} from "./data.js";

export async function initGrados(contenedor, ctx) {
  if (!ctx.esAdmin) {
    contenedor.innerHTML = `<p class="aviso">Este módulo es solo para administradores.</p>`;
    return;
  }

  contenedor.innerHTML = `
    <h2 class="titulo-modulo">Grados</h2>
    <div class="panel">
      <h2 style="font-size:1rem; margin-top:0;">Agregar grado</h2>
      <div class="selectores">
        <div style="flex:1; min-width:160px;">
          <label for="g-nombre">Nombre del grado</label>
          <input type="text" id="g-nombre" placeholder='8vo EGB "A"'
                 style="width:100%; padding:0.45rem 0.6rem; border:1px solid var(--borde); border-radius:6px;">
        </div>
        <div>
          <label for="g-seccion">Sección</label>
          <input type="text" id="g-seccion" value="VESPERTINA"
                 style="width:11rem; padding:0.45rem 0.6rem; border:1px solid var(--borde); border-radius:6px;">
        </div>
        <div style="flex:1; min-width:180px;">
          <label for="g-tutor">Tutor/a</label>
          <input type="text" id="g-tutor" placeholder="Lic. Nombre Apellido"
                 style="width:100%; padding:0.45rem 0.6rem; border:1px solid var(--borde); border-radius:6px;">
        </div>
        <div><button class="primario" id="g-agregar">Agregar</button></div>
      </div>
    </div>
    <div class="panel">
      <div style="overflow-x:auto;">
        <table class="tabla-gestion">
          <thead>
            <tr>
              <th>Grado</th><th>Sección</th><th>Tutor/a</th>
              <th>Estudiantes</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody id="tbody-grados"></tbody>
        </table>
      </div>
      <p class="info" id="g-mensaje">
        Renombrar un grado actualiza también sus estudiantes, su horario y su
        historial de asistencia.
      </p>
    </div>`;

  const tbody = contenedor.querySelector("#tbody-grados");
  const mensaje = contenedor.querySelector("#g-mensaje");

  async function pintar() {
    const tutores = await obtenerTutores();
    const conteos = {};
    await Promise.all(tutores.map(async t => {
      conteos[t.grado] = await contarPorGrado(t.grado);
    }));
    tbody.innerHTML = tutores.map(t => `
      <tr data-id="${esc(t.grado)}">
        <td class="celda-grado">${esc(t.grado)}</td>
        <td class="celda-seccion">${esc(t.seccion || "")}</td>
        <td class="celda-tutor">${esc(t.tutor || "")}</td>
        <td class="centro">${conteos[t.grado].estudiantes}</td>
        <td class="centro">
          <button class="btn-mini" data-editar-grado="${esc(t.grado)}">Editar</button>
          <button class="btn-mini peligro" data-eliminar-grado="${esc(t.grado)}">Eliminar</button>
        </td>
      </tr>`).join("");
  }

  tbody.addEventListener("click", async (e) => {
    const btnEditar = e.target.closest("[data-editar-grado]");
    if (btnEditar) {
      const grado = btnEditar.dataset.editarGrado;
      const fila = btnEditar.closest("tr");
      const seccion = fila.querySelector(".celda-seccion").textContent;
      const tutor = fila.querySelector(".celda-tutor").textContent;
      fila.innerHTML = `
        <td><input type="text" id="ge-nombre" value="${esc(grado)}"></td>
        <td><input type="text" id="ge-seccion" value="${esc(seccion)}" style="width:9rem;"></td>
        <td><input type="text" id="ge-tutor" value="${esc(tutor)}"></td>
        <td colspan="2" class="centro">
          <button class="btn-mini" data-guardar-grado="${esc(grado)}">Guardar</button>
          <button class="btn-mini peligro" data-cancelar>Cancelar</button>
        </td>`;
      return;
    }

    const btnGuardar = e.target.closest("[data-guardar-grado]");
    if (btnGuardar) {
      const viejo = btnGuardar.dataset.guardarGrado;
      const fila = btnGuardar.closest("tr");
      const nuevo = fila.querySelector("#ge-nombre").value.trim();
      const seccion = fila.querySelector("#ge-seccion").value.trim().toUpperCase();
      const tutor = fila.querySelector("#ge-tutor").value.trim();
      if (!nuevo) {
        alert("El nombre del grado no puede estar vacío.");
        return;
      }
      try {
        if (nuevo === viejo) {
          await actualizarGrado(viejo, { seccion, tutor });
        } else {
          const c = await contarPorGrado(viejo);
          if (!confirm(
            `¿Renombrar "${viejo}" a "${nuevo}"?\n\n` +
            `Se actualizarán en cascada:\n` +
            `- ${c.estudiantes} estudiante(s)\n` +
            `- ${c.bloques} bloque(s) de horario\n` +
            `- ${c.diasAsistencia} día(s) de asistencia registrada`)) {
            return;
          }
          mensaje.textContent = "Renombrando y actualizando referencias...";
          const r = await renombrarGrado(viejo, nuevo, { seccion, tutor });
          mensaje.textContent =
            `Grado renombrado: ${r.estudiantes} estudiante(s), ` +
            `${r.bloques} bloque(s) y ${r.diasAsistencia} día(s) de asistencia actualizados.`;
        }
      } catch (err) {
        console.error(err);
        alert("Error: " + err.message);
      }
      await pintar();
      return;
    }

    if (e.target.closest("[data-cancelar]")) {
      await pintar();
      return;
    }

    const btnEliminar = e.target.closest("[data-eliminar-grado]");
    if (btnEliminar) {
      const grado = btnEliminar.dataset.eliminarGrado;
      try {
        const c = await contarPorGrado(grado);
        if (c.estudiantes > 0) {
          alert(`"${grado}" tiene ${c.estudiantes} estudiante(s).\n` +
                `Muévalos a otro grado desde el módulo Estudiantes antes de eliminarlo.`);
          return;
        }
        if (!confirm(
          `¿Eliminar el grado "${grado}"?\n\n` +
          `Se eliminarán también:\n` +
          `- ${c.bloques} bloque(s) de horario\n` +
          `- ${c.diasAsistencia} día(s) de asistencia registrada\n\n` +
          `Esta acción no se puede deshacer.`)) {
          return;
        }
        await eliminarGrado(grado);
        mensaje.textContent = `Grado "${grado}" eliminado.`;
      } catch (err) {
        console.error(err);
        alert("Error: " + err.message);
      }
      await pintar();
    }
  });

  contenedor.querySelector("#g-agregar").addEventListener("click", async () => {
    const nombre = contenedor.querySelector("#g-nombre").value.trim();
    const seccion = contenedor.querySelector("#g-seccion").value.trim().toUpperCase();
    const tutor = contenedor.querySelector("#g-tutor").value.trim();
    if (!nombre) {
      alert("Ingrese el nombre del grado.");
      return;
    }
    try {
      await agregarGrado(nombre, seccion, tutor);
      contenedor.querySelector("#g-nombre").value = "";
      contenedor.querySelector("#g-tutor").value = "";
      mensaje.textContent = `Grado "${nombre}" creado. Agréguele su horario desde el módulo Horarios.`;
    } catch (err) {
      console.error(err);
      alert("Error: " + err.message);
    }
    await pintar();
  });

  await pintar();
}
