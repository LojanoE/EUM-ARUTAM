// Módulo: dashboard — resumen por grado, asistencia de hoy y ranking de faltas.
import {
  obtenerGrados, obtenerTodosLosEstudiantes, obtenerAsistencia,
  obtenerTodasLasAsistencias, indicePorEstudiante, resumenEstudiante,
  fechaHoy, diaDeFecha, esc
} from "./data.js";

export async function initDashboard(contenedor) {
  const hoy = fechaHoy();
  const diaHoy = diaDeFecha(hoy);

  const [grados, estudiantes, asistencias] = await Promise.all([
    obtenerGrados(),
    obtenerTodosLosEstudiantes(),
    obtenerTodasLasAsistencias(),
  ]);

  const porGrado = {};
  for (const g of grados) porGrado[g] = [];
  for (const e of estudiantes) {
    (porGrado[e.grado] = porGrado[e.grado] || []).push(e);
  }

  // Estado de la asistencia de hoy por grado.
  const estadoHoy = {};
  if (diaHoy) {
    await Promise.all(grados.map(async (g) => {
      const a = await obtenerAsistencia(g, hoy);
      if (!a) {
        estadoHoy[g] = null;
        return;
      }
      let presentes = 0;
      for (const marcas of Object.values(a.registros || {})) {
        if (Object.values(marcas).some(c => c === "P" || c === "A")) presentes++;
      }
      estadoHoy[g] = { presentes, registrados: Object.keys(a.registros || {}).length };
    }));
  }

  const indice = indicePorEstudiante(asistencias);
  let html = `<h2 class="titulo-modulo">Dashboard</h2>
    <p class="info">Hoy: ${hoy}${diaHoy ? " (" + diaHoy + ")" : " (fin de semana)"}</p>
    <div class="tarjetas">`;

  let totalEst = 0;
  for (const g of grados) {
    const lista = porGrado[g] || [];
    totalEst += lista.length;
    let estado;
    if (!diaHoy) {
      estado = `<span class="detalle">Hoy no hay clases</span>`;
    } else if (!estadoHoy[g]) {
      estado = `<span class="estado-pendiente">Sin registrar hoy</span>`;
    } else {
      const s = estadoHoy[g];
      estado = `<span class="estado-ok">${s.presentes}/${lista.length} presentes hoy</span>`;
    }
    html += `
      <div class="tarjeta">
        <h3>${esc(g)}</h3>
        <div class="numero">${lista.length}</div>
        <div class="detalle">estudiantes</div>
        <div class="detalle">${estado}</div>
      </div>`;
  }
  html += `
      <div class="tarjeta">
        <h3>Total institución</h3>
        <div class="numero">${totalEst}</div>
        <div class="detalle">estudiantes en ${grados.length} grados</div>
        <div class="detalle">${asistencias.length} días con registro</div>
      </div>
    </div>`;

  // Ranking de inasistencias (I + A por marcas de hora), top 15.
  const ranking = estudiantes
    .map(e => ({ est: e, r: resumenEstudiante(indice[e.id]) }))
    .map(x => ({ ...x, faltas: x.r.I + x.r.A }))
    .filter(x => x.faltas > 0)
    .sort((a, b) => b.faltas - a.faltas || b.r.I - a.r.I)
    .slice(0, 15);

  html += `
    <div class="panel">
      <h2 style="font-size:1rem; margin-top:0;">Estudiantes con más inasistencias</h2>`;
  if (ranking.length === 0) {
    html += `<p class="info">Aún no hay inasistencias registradas.</p>`;
  } else {
    html += `
      <table class="tabla-gestion">
        <thead>
          <tr>
            <th>#</th><th>Estudiante</th><th>Grado</th>
            <th>Injustificadas</th><th>Atrasos</th><th>Justificadas</th>
            <th>Días asistidos</th><th>% asistencia</th>
          </tr>
        </thead>
        <tbody>
          ${ranking.map((x, i) => `
            <tr>
              <td class="centro">${i + 1}</td>
              <td>${esc(x.est.nombre)}</td>
              <td>${esc(x.est.grado)}</td>
              <td class="centro">${x.r.I}</td>
              <td class="centro">${x.r.A}</td>
              <td class="centro">${x.r.J}</td>
              <td class="centro">${x.r.diasAsistidos}</td>
              <td class="centro">${x.r.porcentaje === null ? "—" : x.r.porcentaje + "%"}</td>
            </tr>`).join("")}
        </tbody>
      </table>`;
  }
  html += `</div>`;

  contenedor.innerHTML = html;
}
