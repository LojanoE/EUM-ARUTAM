// Módulo: gestión de usuarios (solo admin). Cada usuario tiene nombre y
// cargo: son los datos con los que se firman los documentos que imprime.
// Incluye la configuración de feriados y suspensiones (días sin clases).
import {
  obtenerUsuarios, agregarUsuario, actualizarUsuario, eliminarUsuario,
  obtenerFeriados, guardarFeriados, esc
} from "./data.js";
import { notificarError, confirmarAccion } from "./notificaciones.js";

export async function initUsuarios(contenedor, ctx) {
  if (!ctx.esAdmin) {
    contenedor.innerHTML = `<p class="aviso">Este módulo es solo para administradores.</p>`;
    return;
  }

  contenedor.innerHTML = `
    <h2 class="titulo-modulo">Usuarios</h2>

    <div class="panel">
      <h2 style="font-size:1rem; margin-top:0;">Agregar usuario</h2>
      <div class="selectores">
        <div>
          <label for="u-usuario">Usuario</label>
          <input type="text" id="u-usuario" placeholder="ej. lmijas"
                 style="width:9rem; padding:0.45rem 0.6rem; border:1px solid var(--borde); border-radius:6px;">
        </div>
        <div>
          <label for="u-password">Contraseña</label>
          <input type="text" id="u-password"
                 style="width:9rem; padding:0.45rem 0.6rem; border:1px solid var(--borde); border-radius:6px;">
        </div>
        <div style="flex:1; min-width:180px;">
          <label for="u-nombre">Nombre y apellido</label>
          <input type="text" id="u-nombre" placeholder="Lic. Nombre Apellido"
                 style="width:100%; padding:0.45rem 0.6rem; border:1px solid var(--borde); border-radius:6px;">
        </div>
        <div style="flex:1; min-width:150px;">
          <label for="u-cargo">Cargo</label>
          <input type="text" id="u-cargo" placeholder="SUB-INSPECTOR V (e)"
                 style="width:100%; padding:0.45rem 0.6rem; border:1px solid var(--borde); border-radius:6px;">
        </div>
        <div>
          <label for="u-rol">Rol</label>
          <select id="u-rol">
            <option value="registro">registro</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <div><button class="primario" id="u-agregar">Agregar</button></div>
      </div>
      <p class="info">
        Rol <strong>registro</strong>: consulta y registra asistencia.
        Rol <strong>admin</strong>: además gestiona estudiantes, horarios, grados y usuarios.<br>
        Los reportes impresos se firman con el <strong>nombre y cargo del usuario
        que genera el documento</strong>.
      </p>
    </div>

    <div class="panel">
      <div style="overflow-x:auto;">
        <table class="tabla-gestion">
          <thead>
            <tr><th>Usuario</th><th>Nombre</th><th>Cargo</th><th>Rol</th><th>Acciones</th></tr>
          </thead>
          <tbody id="tbody-usuarios"></tbody>
        </table>
      </div>
      <p class="info" id="u-mensaje"></p>
    </div>

    <div class="panel">
      <h2 style="font-size:1rem; margin-top:0;">Feriados y suspensiones</h2>
      <p class="info">
        Una fecha por línea, en formato AAAA-MM-DD (ej. 2026-10-09). Esos días
        no se registran asistencia ni cuentan en los porcentajes.
      </p>
      <textarea id="cfg-feriados" rows="5"
        style="width:100%; max-width:22rem; padding:0.45rem 0.6rem; border:1px solid var(--borde); border-radius:6px; font-family:monospace;"></textarea>
      <div class="fila-acciones">
        <button class="primario" id="cfg-guardar">Guardar feriados</button>
        <span id="cfg-mensaje" class="mensaje-ok"></span>
      </div>
    </div>`;

  const tbody = contenedor.querySelector("#tbody-usuarios");
  const mensaje = contenedor.querySelector("#u-mensaje");

  async function pintar() {
    const usuarios = await obtenerUsuarios();
    tbody.innerHTML = usuarios.map(u => `
      <tr data-id="${esc(u.id)}">
        <td class="celda-usuario">${esc(u.usuario)}</td>
        <td class="celda-nombre">${esc(u.nombre || "")}</td>
        <td class="celda-cargo">${esc(u.cargo || "")}</td>
        <td class="centro celda-rol">${esc(u.rol)}</td>
        <td class="centro">
          <button class="btn-mini" data-editar-usuario="${esc(u.id)}">Editar</button>
          <button class="btn-mini peligro" data-eliminar-usuario="${esc(u.id)}">Eliminar</button>
        </td>
      </tr>`).join("");
  }

  tbody.addEventListener("click", async (e) => {
    const btnEditar = e.target.closest("[data-editar-usuario]");
    if (btnEditar) {
      const id = btnEditar.dataset.editarUsuario;
      const fila = btnEditar.closest("tr");
      const nombre = fila.querySelector(".celda-nombre").textContent;
      const cargo = fila.querySelector(".celda-cargo").textContent;
      const rol = fila.querySelector(".celda-rol").textContent;
      fila.innerHTML = `
        <td class="celda-usuario">${esc(id)}</td>
        <td><input type="text" id="ue-nombre" value="${esc(nombre)}"></td>
        <td><input type="text" id="ue-cargo" value="${esc(cargo)}"></td>
        <td class="centro">
          <select id="ue-rol" style="width:7rem;">
            <option value="registro" ${rol === "registro" ? "selected" : ""}>registro</option>
            <option value="admin" ${rol === "admin" ? "selected" : ""}>admin</option>
          </select>
        </td>
        <td class="centro">
          <input type="text" id="ue-password" placeholder="Nueva contraseña (opcional)"
                 style="width:11rem; margin-bottom:0.3rem;">
          <button class="btn-mini" data-guardar-usuario="${esc(id)}">Guardar</button>
          <button class="btn-mini peligro" data-cancelar>Cancelar</button>
        </td>`;
      return;
    }

    const btnGuardar = e.target.closest("[data-guardar-usuario]");
    if (btnGuardar) {
      const id = btnGuardar.dataset.guardarUsuario;
      const fila = btnGuardar.closest("tr");
      const nombre = fila.querySelector("#ue-nombre").value.trim();
      const cargo = fila.querySelector("#ue-cargo").value.trim();
      const rol = fila.querySelector("#ue-rol").value;
      const password = fila.querySelector("#ue-password").value.trim();
      if (!nombre) {
        notificarError("El nombre no puede estar vacío.");
        return;
      }
      // No dejar el sistema sin administradores.
      if (rol !== "admin") {
        const usuarios = await obtenerUsuarios();
        const admins = usuarios.filter(u => u.rol === "admin" && u.id !== id);
        if (admins.length === 0) {
          notificarError("Debe quedar al menos un usuario con rol admin.");
          return;
        }
      }
      try {
        const datos = { nombre, cargo, rol };
        if (password) datos.password = password;
        await actualizarUsuario(id, datos);
        mensaje.textContent = `Usuario "${id}" actualizado.`;
      } catch (err) {
        notificarError("Error al actualizar el usuario", err);
      }
      await pintar();
      return;
    }

    if (e.target.closest("[data-cancelar]")) {
      await pintar();
      return;
    }

    const btnEliminar = e.target.closest("[data-eliminar-usuario]");
    if (btnEliminar) {
      const id = btnEliminar.dataset.eliminarUsuario;
      if (id === ctx.sesion.usuario) {
        notificarError("No puede eliminar la cuenta con la que inició sesión.");
        return;
      }
      const usuarios = await obtenerUsuarios();
      const objetivo = usuarios.find(u => u.id === id);
      if (objetivo?.rol === "admin" &&
          usuarios.filter(u => u.rol === "admin").length === 1) {
        notificarError("Debe quedar al menos un usuario con rol admin.");
        return;
      }
      if (!(await confirmarAccion(`¿Eliminar el usuario "${id}"?`,
          { textoConfirmar: "Eliminar usuario", peligro: true }))) return;
      try {
        await eliminarUsuario(id);
        mensaje.textContent = `Usuario "${id}" eliminado.`;
      } catch (err) {
        notificarError("Error al eliminar el usuario", err);
      }
      await pintar();
    }
  });

  contenedor.querySelector("#u-agregar").addEventListener("click", async () => {
    const usuario = contenedor.querySelector("#u-usuario").value.trim();
    const password = contenedor.querySelector("#u-password").value.trim();
    const nombre = contenedor.querySelector("#u-nombre").value.trim();
    const cargo = contenedor.querySelector("#u-cargo").value.trim();
    const rol = contenedor.querySelector("#u-rol").value;
    if (!usuario || !password || !nombre) {
      notificarError("Complete usuario, contraseña y nombre.");
      return;
    }
    try {
      await agregarUsuario(usuario, password, nombre, rol, cargo);
      contenedor.querySelector("#u-usuario").value = "";
      contenedor.querySelector("#u-password").value = "";
      contenedor.querySelector("#u-nombre").value = "";
      contenedor.querySelector("#u-cargo").value = "";
      mensaje.textContent = `Usuario "${usuario}" creado.`;
    } catch (err) {
      notificarError("Error al crear el usuario", err);
    }
    await pintar();
  });

  await pintar();

  // Feriados y suspensiones (config institucional).
  const txtFeriados = contenedor.querySelector("#cfg-feriados");
  const cfgMensaje = contenedor.querySelector("#cfg-mensaje");
  txtFeriados.value = (await obtenerFeriados()).join("\n");

  contenedor.querySelector("#cfg-guardar").addEventListener("click", async () => {
    const lineas = txtFeriados.value.split("\n")
      .map(l => l.trim()).filter(Boolean);
    const invalidas = lineas.filter(l => !/^\d{4}-\d{2}-\d{2}$/.test(l));
    if (invalidas.length > 0) {
      notificarError("Fechas con formato incorrecto (use AAAA-MM-DD): " + invalidas.join(", "));
      return;
    }
    try {
      await guardarFeriados(lineas);
      txtFeriados.value = lineas.join("\n");
      cfgMensaje.textContent = "Feriados guardados.";
    } catch (err) {
      notificarError("Error al guardar feriados", err);
    }
  });
}
