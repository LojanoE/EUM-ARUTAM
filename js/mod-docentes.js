// Módulo: lista maestra de docentes (solo admin). Un cambio de nombre se
// replica en todos los horarios; en Horarios el docente se elige de esta lista.
// Desde aquí también se crean las cuentas de acceso a Notas.
import {
  obtenerDocentesConCuenta, agregarDocente, importarDocentesFaltantes,
  renombrarDocente, eliminarDocente, crearCuentasDocentes, esc
} from "./data.js";
import { notificarOk, notificarError, confirmarAccion } from "./notificaciones.js";

const NOMBRE_SECCION = { matutina: "Matutina", vespertina: "Vespertina" };
const etiquetaSeccion = (s) => NOMBRE_SECCION[String(s).toLowerCase()] || s;

export async function initDocentes(contenedor, ctx) {
  if (!ctx.esAdmin) {
    contenedor.innerHTML = `<p class="aviso">Este módulo es solo para administradores.</p>`;
    return;
  }

  contenedor.innerHTML = `
    <h2 class="titulo-modulo">Docentes</h2>
    <div class="panel">
      <div class="selectores">
        <div style="flex:1; min-width:200px;">
          <label for="d-nuevo">Agregar docente</label>
          <input type="text" id="d-nuevo" placeholder="Lic. Nombre Apellido"
                 style="width:100%; padding:0.45rem 0.6rem; border:1px solid var(--borde); border-radius:6px;">
        </div>
        <div><button class="primario" id="d-agregar">Agregar</button></div>
        <div><button class="secundario" id="d-importar">Importar los que faltan</button></div>
        <div><button class="secundario" id="d-cuentas">Crear cuentas de los seleccionados</button></div>
      </div>
      <p class="info">
        Esta es la lista de docentes de ambas secciones. Al <strong>editar un nombre</strong> se actualiza en todos
        los horarios; en Horarios el docente se elige de esta lista. Los docentes que aparecen en los
        horarios pero no están guardados salen marcados: use «Importar los que faltan».
      </p>
    </div>
    <div class="panel">
      <div style="overflow-x:auto;">
        <table class="tabla-gestion">
          <thead>
            <tr><th style="width:2rem;"><input type="checkbox" id="d-todos" title="Seleccionar los que no tienen cuenta"></th>
                <th>Docente</th><th>Sección</th><th>Materias</th><th>Usuario</th><th>Acciones</th></tr>
          </thead>
          <tbody id="tbody-docentes"></tbody>
        </table>
      </div>
    </div>
    <div class="panel" id="d-credenciales" hidden></div>`;

  const tbody = contenedor.querySelector("#tbody-docentes");
  const btnImportar = contenedor.querySelector("#d-importar");
  const btnCuentas = contenedor.querySelector("#d-cuentas");
  const chkTodos = contenedor.querySelector("#d-todos");
  let docentes = [];

  function actualizarBotonCuentas() {
    const n = tbody.querySelectorAll("[data-sel]:checked").length;
    btnCuentas.textContent = `Crear cuentas de los seleccionados (${n})`;
    btnCuentas.disabled = n === 0;
  }

  async function pintar() {
    docentes = await obtenerDocentesConCuenta();
    const faltan = docentes.filter(d => !d.enLista).length;
    btnImportar.textContent = `Importar los que faltan (${faltan})`;
    btnImportar.disabled = faltan === 0;
    tbody.innerHTML = docentes.length ? docentes.map(d => `
      <tr data-clave="${esc(d.clave)}">
        <td class="centro">${d.usuario ? "" : `<input type="checkbox" data-sel="${esc(d.clave)}">`}</td>
        <td class="celda-nombre">${esc(d.nombre)}${d.enLista ? "" : ` <small><em>(solo en horarios)</em></small>`}</td>
        <td class="centro">${d.secciones.length ? d.secciones.map(etiquetaSeccion).map(esc).join(" / ") : "—"}</td>
        <td><small>${d.cargas.length
          ? d.cargas.map(c => `${esc(c.grado)} — ${esc(c.asignatura)}`).join("<br>")
          : "Sin materias"}</small></td>
        <td class="centro">${d.usuario ? esc(d.usuario) : "<em>sin cuenta</em>"}</td>
        <td class="centro">
          <button class="btn-mini" data-editar="${esc(d.clave)}">Editar</button>
          ${d.enLista && !d.cargas.length
            ? `<button class="btn-mini peligro" data-eliminar="${esc(d.id)}">Eliminar</button>` : ""}
        </td>
      </tr>`).join("")
      : `<tr><td colspan="6" class="centro">No hay docentes.</td></tr>`;
    chkTodos.checked = false;
    actualizarBotonCuentas();
  }

  chkTodos.addEventListener("change", () => {
    tbody.querySelectorAll("[data-sel]").forEach(c => { c.checked = chkTodos.checked; });
    actualizarBotonCuentas();
  });
  tbody.addEventListener("change", (e) => {
    if (e.target.matches("[data-sel]")) actualizarBotonCuentas();
  });

  tbody.addEventListener("click", async (e) => {
    const btnEditar = e.target.closest("[data-editar]");
    if (btnEditar) {
      const d = docentes.find(x => x.clave === btnEditar.dataset.editar);
      const fila = btnEditar.closest("tr");
      fila.querySelector(".celda-nombre").innerHTML =
        `<input type="text" id="de-nombre" value="${esc(d.nombre)}" style="width:100%;">`;
      btnEditar.closest("td").innerHTML = `
        <button class="btn-mini" data-guardar="${esc(d.clave)}">Guardar</button>
        <button class="btn-mini peligro" data-cancelar>Cancelar</button>`;
      fila.querySelector("#de-nombre").focus();
      return;
    }

    const btnGuardar = e.target.closest("[data-guardar]");
    if (btnGuardar) {
      const nombre = btnGuardar.closest("tr").querySelector("#de-nombre").value;
      try {
        const n = await renombrarDocente(btnGuardar.dataset.guardar, nombre);
        notificarOk(`Nombre actualizado (${n} registro(s) cambiados en horarios y cuentas).`);
      } catch (err) {
        notificarError("No se pudo cambiar el nombre", err);
        return;
      }
      await pintar();
      return;
    }

    if (e.target.closest("[data-cancelar]")) {
      await pintar();
      return;
    }

    const btnEliminar = e.target.closest("[data-eliminar]");
    if (btnEliminar) {
      if (!(await confirmarAccion("¿Quitar este docente de la lista?",
          { textoConfirmar: "Eliminar", peligro: true }))) return;
      try {
        await eliminarDocente(btnEliminar.dataset.eliminar);
        notificarOk("Docente eliminado de la lista.");
      } catch (err) {
        notificarError("No se pudo eliminar", err);
      }
      await pintar();
    }
  });

  contenedor.querySelector("#d-agregar").addEventListener("click", async () => {
    const input = contenedor.querySelector("#d-nuevo");
    try {
      await agregarDocente(input.value);
      notificarOk("Docente agregado a la lista.");
      input.value = "";
    } catch (err) {
      notificarError("No se pudo agregar el docente", err);
    }
    await pintar();
  });

  btnImportar.addEventListener("click", async () => {
    try {
      const n = await importarDocentesFaltantes();
      notificarOk(`${n} docente(s) agregado(s) a la lista.`);
    } catch (err) {
      notificarError("No se pudo importar", err);
    }
    await pintar();
  });

  btnCuentas.addEventListener("click", async () => {
    const claves = [...tbody.querySelectorAll("[data-sel]:checked")].map(c => c.dataset.sel);
    const ok = await confirmarAccion(
      `Se creará una cuenta con rol docente para ${claves.length} docente(s), ` +
      "con contraseña igual al usuario (deberán cambiarla al ingresar). ¿Continuar?", { textoConfirmar: "Crear cuentas" });
    if (!ok) return;
    const panel = contenedor.querySelector("#d-credenciales");
    try {
      const creadas = await crearCuentasDocentes(claves);
      notificarOk(`${creadas.length} cuenta(s) creada(s).`);
      panel.hidden = !creadas.length;
      panel.innerHTML = `
        <h2 style="font-size:1rem; margin-top:0;">Credenciales generadas</h2>
        <p class="aviso">La contraseña inicial es igual al usuario; el sistema pedirá cambiarla en el primer ingreso. Si la olvidan, se restablece desde Usuarios.</p>
        <table class="tabla-gestion">
          <thead><tr><th>Docente</th><th>Usuario</th><th>Contraseña</th></tr></thead>
          <tbody>${creadas.map(c => `
            <tr><td>${esc(c.nombre)}</td><td>${esc(c.usuario)}</td>
                <td style="font-family:monospace;">${esc(c.password)}</td></tr>`).join("")}</tbody>
        </table>
        <div class="fila-acciones"><button class="secundario" id="d-imprimir">Imprimir</button></div>`;
      panel.querySelector("#d-imprimir").addEventListener("click", () => {
        document.body.classList.add("imprimiendo-credenciales");
        window.print();
        document.body.classList.remove("imprimiendo-credenciales");
      });
    } catch (err) {
      notificarError("No se pudieron crear todas las cuentas", err);
    }
    await pintar();
  });

  await pintar();
}
