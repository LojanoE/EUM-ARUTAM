// Módulo: consulta y gestión de horarios por grado.
import {
  obtenerGrados, obtenerHorariosDeGrado, obtenerAsistencia,
  agregarBloqueHorario, actualizarBloqueHorario, eliminarBloqueHorario,
  DIAS_SEMANA, fechaHoy, diaDeFecha, esc
} from "./data.js";
import { notificarOk, notificarError, confirmarAccion } from "./notificaciones.js";

export async function initHorarios(contenedor, ctx) {
  const grados = await obtenerGrados();

  contenedor.innerHTML = `
    <h2 class="titulo-modulo">Horarios</h2>
    <div class="panel selectores">
      <div>
        <label for="h-grado">Grado</label>
        <select id="h-grado">
          ${grados.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join("")}
        </select>
      </div>
      <p id="h-aviso" class="aviso" hidden></p>
    </div>
    <div id="h-contenido"></div>`;

  const selGrado = contenedor.querySelector("#h-grado");
  const contenido = contenedor.querySelector("#h-contenido");
  const aviso = contenedor.querySelector("#h-aviso");

  async function pintar() {
    aviso.hidden = true;
    const grado = selGrado.value;
    const bloques = await obtenerHorariosDeGrado(grado);

    // Aviso si hoy ya hay asistencia registrada para este grado y se edita su día.
    const hoy = fechaHoy();
    const diaHoy = diaDeFecha(hoy);
    if (ctx.esAdmin && diaHoy && await obtenerAsistencia(grado, hoy)) {
      aviso.textContent =
        `Atención: ${grado} ya tiene asistencia registrada hoy (${diaHoy}). ` +
        `Cambiar el número de bloques de hoy puede descuadrar las marcas guardadas.`;
      aviso.hidden = false;
    }

    let html = "";
    for (const dia of DIAS_SEMANA) {
      const delDia = bloques.filter(b => b.dia === dia);
      html += `
        <div class="panel dia-bloque">
          <h3>${dia}</h3>
          <table class="tabla-gestion">
            <thead>
              <tr>
                <th style="width:3rem;">N</th><th>Asignatura</th>
                <th>Tiempo</th><th>Docente</th>
                ${ctx.esAdmin ? `<th style="width:9rem;">Acciones</th>` : ""}
              </tr>
            </thead>
            <tbody>
              ${delDia.length === 0
                ? `<tr><td colspan="${ctx.esAdmin ? 5 : 4}" class="info">Sin bloques registrados.</td></tr>`
                : delDia.map(b => `
                  <tr data-id="${esc(b.id)}">
                    <td class="centro">${b.orden}</td>
                    <td class="celda-asignatura">${esc(b.asignatura)}</td>
                    <td class="celda-tiempo">${esc(b.tiempo)}</td>
                    <td class="celda-docente">${esc(b.docente)}</td>
                    ${ctx.esAdmin ? `
                    <td class="centro">
                      <button class="btn-mini" data-editar-bloque="${esc(b.id)}">Editar</button>
                      <button class="btn-mini peligro" data-quitar-bloque="${esc(b.id)}">Quitar</button>
                    </td>` : ""}
                  </tr>`).join("")}
            </tbody>
          </table>
          ${ctx.esAdmin ? `
          <div class="selectores" style="margin-top:0.6rem;">
            <div style="flex:1; min-width:150px;">
              <input type="text" placeholder="Asignatura" data-nuevo-asignatura="${esc(dia)}"
                     style="width:100%; padding:0.35rem; border:1px solid var(--borde); border-radius:4px;">
            </div>
            <div>
              <input type="text" placeholder="00H00 - 00H45" data-nuevo-tiempo="${esc(dia)}"
                     style="width:9.5rem; padding:0.35rem; border:1px solid var(--borde); border-radius:4px;">
            </div>
            <div style="flex:1; min-width:150px;">
              <input type="text" placeholder="Docente" data-nuevo-docente="${esc(dia)}"
                     style="width:100%; padding:0.35rem; border:1px solid var(--borde); border-radius:4px;">
            </div>
            <div>
              <button class="btn-mini" data-agregar-dia="${esc(dia)}">+ Agregar bloque</button>
            </div>
          </div>` : ""}
        </div>`;
    }
    contenido.innerHTML = html;
  }

  contenido.addEventListener("click", async (e) => {
    const grado = selGrado.value;

    const btnEditar = e.target.closest("[data-editar-bloque]");
    if (btnEditar) {
      const fila = btnEditar.closest("tr");
      const id = btnEditar.dataset.editarBloque;
      const asignatura = fila.querySelector(".celda-asignatura").textContent;
      const tiempo = fila.querySelector(".celda-tiempo").textContent;
      const docente = fila.querySelector(".celda-docente").textContent;
      fila.innerHTML = `
        <td class="centro">${fila.cells[0].textContent}</td>
        <td><input type="text" id="b-asignatura" value="${esc(asignatura)}"></td>
        <td><input type="text" id="b-tiempo" value="${esc(tiempo)}"></td>
        <td><input type="text" id="b-docente" value="${esc(docente)}"></td>
        <td class="centro">
          <button class="btn-mini" data-guardar-bloque="${esc(id)}">Guardar</button>
          <button class="btn-mini peligro" data-cancelar>Cancelar</button>
        </td>`;
      return;
    }

    const btnGuardar = e.target.closest("[data-guardar-bloque]");
    if (btnGuardar) {
      const fila = btnGuardar.closest("tr");
      try {
        await actualizarBloqueHorario(btnGuardar.dataset.guardarBloque, {
          asignatura: fila.querySelector("#b-asignatura").value.trim().toUpperCase(),
          tiempo: fila.querySelector("#b-tiempo").value.trim(),
          docente: fila.querySelector("#b-docente").value.trim(),
        });
        notificarOk("Bloque de horario actualizado.");
      } catch (err) {
        notificarError("Error al actualizar el bloque", err);
      }
      await pintar();
      return;
    }

    if (e.target.closest("[data-cancelar]")) {
      await pintar();
      return;
    }

    const btnQuitar = e.target.closest("[data-quitar-bloque]");
    if (btnQuitar) {
      if (!(await confirmarAccion("¿Quitar este bloque del horario?",
          { textoConfirmar: "Quitar bloque", peligro: true }))) return;
      try {
        await eliminarBloqueHorario(btnQuitar.dataset.quitarBloque);
        notificarOk("Bloque eliminado del horario.");
      } catch (err) {
        notificarError("Error al quitar el bloque", err);
      }
      await pintar();
      return;
    }

    const btnAgregar = e.target.closest("[data-agregar-dia]");
    if (btnAgregar) {
      const dia = btnAgregar.dataset.agregarDia;
      const asignatura = contenido.querySelector(`[data-nuevo-asignatura="${dia}"]`).value.trim().toUpperCase();
      const tiempo = contenido.querySelector(`[data-nuevo-tiempo="${dia}"]`).value.trim();
      const docente = contenido.querySelector(`[data-nuevo-docente="${dia}"]`).value.trim();
      if (!asignatura || !tiempo || !docente) {
        notificarError("Complete asignatura, tiempo y docente para agregar el bloque.");
        return;
      }
      try {
        const bloques = await obtenerHorariosDeGrado(grado);
        const delDia = bloques.filter(b => b.dia === dia);
        const orden = delDia.length > 0
          ? Math.max(...delDia.map(b => b.orden)) + 1
          : 1;
        await agregarBloqueHorario({ grado, dia, orden, asignatura, tiempo, docente });
        notificarOk(`Bloque de ${asignatura} agregado al ${dia}.`);
      } catch (err) {
        notificarError("Error al agregar el bloque", err);
      }
      await pintar();
    }
  });

  selGrado.addEventListener("change", pintar);
  await pintar();
}
