// Módulo: gestión y consulta de estudiantes (ficha con historial de asistencia).
import {
  obtenerGrados, obtenerTodosLosEstudiantes, obtenerTodasLasAsistencias,
  indicePorEstudiante, resumenEstudiante, agregarEstudiante,
  actualizarEstudiante, diaDeFecha, CODIGOS_DESC
} from "./data.js";

export async function initEstudiantes(contenedor, ctx) {
  const [grados, estudiantes, asistencias] = await Promise.all([
    obtenerGrados(),
    obtenerTodosLosEstudiantes(),
    obtenerTodasLasAsistencias(),
  ]);
  const indice = indicePorEstudiante(asistencias);

  contenedor.innerHTML = `
    <h2 class="titulo-modulo">Estudiantes</h2>
    <div class="panel selectores">
      <div>
        <label for="f-grado">Grado</label>
        <select id="f-grado">
          <option value="">Todos</option>
          ${grados.map(g => `<option value="${g}">${g}</option>`).join("")}
        </select>
      </div>
      <div style="flex:1; min-width:200px;">
        <label for="f-buscar">Buscar por nombre</label>
        <input type="text" id="f-buscar" placeholder="Apellidos o nombres..."
               style="width:100%; padding:0.45rem 0.6rem; border:1px solid var(--borde); border-radius:6px;">
      </div>
    </div>
    ${ctx.esAdmin ? `
    <div class="panel">
      <h2 style="font-size:1rem; margin-top:0;">Agregar estudiante</h2>
      <div class="selectores">
        <div style="flex:1; min-width:220px;">
          <label for="n-nombre">Nombre completo</label>
          <input type="text" id="n-nombre" placeholder="APELLIDOS NOMBRES"
                 style="width:100%; padding:0.45rem 0.6rem; border:1px solid var(--borde); border-radius:6px;">
        </div>
        <div>
          <label for="n-grado">Grado</label>
          <select id="n-grado">
            ${grados.map(g => `<option value="${g}">${g}</option>`).join("")}
          </select>
        </div>
        <div><button class="primario" id="n-agregar">Agregar</button></div>
      </div>
    </div>` : ""}
    <div class="panel">
      <p class="info" id="lbl-conteo"></p>
      <div style="overflow-x:auto;">
        <table class="tabla-gestion">
          <thead>
            <tr>
              <th>Nombre</th><th>Grado</th>
              <th>Días asistidos</th><th>Injustificadas</th>
              <th>Justificadas</th><th>Atrasos</th><th>% asistencia</th>
              ${ctx.esAdmin ? "<th>Acciones</th>" : ""}
            </tr>
          </thead>
          <tbody id="tbody-est"></tbody>
        </table>
      </div>
      <p class="info">Haga clic en un estudiante para ver su ficha e historial.</p>
    </div>
    <div id="ficha-contenedor"></div>`;

  const fGrado = contenedor.querySelector("#f-grado");
  const fBuscar = contenedor.querySelector("#f-buscar");
  const tbody = contenedor.querySelector("#tbody-est");
  const lblConteo = contenedor.querySelector("#lbl-conteo");
  const fichaContenedor = contenedor.querySelector("#ficha-contenedor");

  function filtrados() {
    const texto = fBuscar.value.trim().toUpperCase();
    return estudiantes.filter(e =>
      (!fGrado.value || e.grado === fGrado.value) &&
      (!texto || e.nombre.toUpperCase().includes(texto))
    );
  }

  function pintarTabla() {
    const lista = filtrados();
    lblConteo.textContent = `${lista.length} estudiante(s)`;
    tbody.innerHTML = lista.map(est => {
      const r = resumenEstudiante(indice[est.id]);
      return `
        <tr class="clickeable" data-id="${est.id}">
          <td>${est.nombre}</td>
          <td>${est.grado}</td>
          <td class="centro">${r.diasAsistidos}</td>
          <td class="centro">${r.I}</td>
          <td class="centro">${r.J}</td>
          <td class="centro">${r.A}</td>
          <td class="centro">${r.porcentaje === null ? "—" : r.porcentaje + "%"}</td>
          ${ctx.esAdmin ? `
          <td class="centro">
            <button class="btn-mini" data-editar="${est.id}">Editar / Mover</button>
          </td>` : ""}
        </tr>`;
    }).join("");
  }

  function pintarFicha(est) {
    const entrada = indice[est.id];
    const r = resumenEstudiante(entrada);
    const faltas = entrada ? entrada.faltas : [];
    fichaContenedor.innerHTML = `
      <div class="ficha">
        <h3>${est.nombre}</h3>
        <p class="info">Grado actual: <strong>${est.grado}</strong></p>
        <div class="totales">
          <span>Días registrados<strong>${r.diasRegistrados}</strong></span>
          <span>Días asistidos<strong>${r.diasAsistidos}</strong></span>
          <span>% asistencia<strong>${r.porcentaje === null ? "—" : r.porcentaje + "%"}</strong></span>
          <span>Presentes (horas)<strong>${r.P}</strong></span>
          <span>Injustificadas<strong>${r.I}</strong></span>
          <span>Justificadas<strong>${r.J}</strong></span>
          <span>Atrasos<strong>${r.A}</strong></span>
        </div>
        <h4 style="margin:0.4rem 0;">Historial de faltas y atrasos</h4>
        ${faltas.length === 0 ? `<p class="info">Sin faltas ni atrasos registrados.</p>` : `
        <table class="tabla-gestion">
          <thead>
            <tr><th>Fecha</th><th>Día</th><th>Hora</th><th>Código</th><th>Grado en esa fecha</th></tr>
          </thead>
          <tbody>
            ${faltas.map(f => `
              <tr>
                <td>${f.fecha}</td>
                <td>${diaDeFecha(f.fecha) || ""}</td>
                <td class="centro">${f.hora}ª</td>
                <td class="centro"><span class="insignia ${f.codigo}">${f.codigo} — ${CODIGOS_DESC[f.codigo]}</span></td>
                <td>${f.grado}</td>
              </tr>`).join("")}
          </tbody>
        </table>`}
        <div class="fila-acciones">
          <button class="secundario" id="ficha-cerrar">Cerrar ficha</button>
        </div>
      </div>`;
    fichaContenedor.querySelector("#ficha-cerrar")
      .addEventListener("click", () => { fichaContenedor.innerHTML = ""; });
    fichaContenedor.scrollIntoView({ behavior: "smooth" });
  }

  function pintarEdicion(fila, est) {
    fila.classList.remove("clickeable");
    fila.innerHTML = `
      <td><input type="text" id="e-nombre" value="${est.nombre}"></td>
      <td>
        <select id="e-grado">
          ${grados.map(g => `<option value="${g}" ${g === est.grado ? "selected" : ""}>${g}</option>`).join("")}
        </select>
      </td>
      <td colspan="5" class="centro info">Guardar aplica el cambio de nombre y/o de grado</td>
      <td class="centro">
        <button class="btn-mini" id="e-guardar">Guardar</button>
        <button class="btn-mini peligro" id="e-cancelar">Cancelar</button>
      </td>`;
    fila.querySelector("#e-guardar").addEventListener("click", async () => {
      const nombre = fila.querySelector("#e-nombre").value.trim().toUpperCase();
      const grado = fila.querySelector("#e-grado").value;
      if (!nombre) {
        alert("El nombre no puede estar vacío.");
        return;
      }
      const cambioGrado = grado !== est.grado;
      if (cambioGrado &&
          !confirm(`¿Mover a ${est.nombre} de "${est.grado}" a "${grado}"?\nSu historial de asistencia se conserva.`)) {
        return;
      }
      await actualizarEstudiante(est.id, { nombre, grado });
      est.nombre = nombre;
      est.grado = grado;
      estudiantes.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      pintarTabla();
    });
    fila.querySelector("#e-cancelar").addEventListener("click", pintarTabla);
  }

  tbody.addEventListener("click", (e) => {
    const btnEditar = e.target.closest("[data-editar]");
    if (btnEditar) {
      const est = estudiantes.find(x => x.id === btnEditar.dataset.editar);
      pintarEdicion(btnEditar.closest("tr"), est);
      return;
    }
    const fila = e.target.closest("tr.clickeable");
    if (fila) {
      const est = estudiantes.find(x => x.id === fila.dataset.id);
      pintarFicha(est);
    }
  });

  fGrado.addEventListener("change", pintarTabla);
  fBuscar.addEventListener("input", pintarTabla);

  if (ctx.esAdmin) {
    contenedor.querySelector("#n-agregar").addEventListener("click", async () => {
      const nombre = contenedor.querySelector("#n-nombre").value.trim().toUpperCase();
      const grado = contenedor.querySelector("#n-grado").value;
      if (!nombre) {
        alert("Ingrese el nombre del estudiante.");
        return;
      }
      await agregarEstudiante(nombre, grado);
      // Recargar la lista para obtener el id asignado por Firestore.
      const nuevos = await obtenerTodosLosEstudiantes();
      estudiantes.length = 0;
      estudiantes.push(...nuevos);
      contenedor.querySelector("#n-nombre").value = "";
      pintarTabla();
    });
  }

  pintarTabla();
}
