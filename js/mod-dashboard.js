// Módulo: dashboard — panel del día (qué falta registrar ahora) más el
// seguimiento de inasistencias (alertas y ranking) de los últimos 90 días.
//
// Criterio de diseño: lo primero que se ve debe responder "¿qué me falta
// hacer hoy?" y permitir hacerlo con un clic; el análisis histórico va
// después, filtrable por grado y sin columnas que nadie lee.
import {
  obtenerGrados, obtenerTodosLosEstudiantes, obtenerAsistencia,
  obtenerTodasLasAsistencias, obtenerFeriados, indicePorEstudiante,
  resumenEstudiante, rachaInjustificadas, refrescarCache,
  fechaHoy, fechaMenosDias, diaDeFecha, esc
} from "./data.js";
import { notificarError } from "./notificaciones.js";

// Umbrales de alerta (régimen estudiantil): días injustificados seguidos
// y porcentaje mínimo de asistencia.
const UMBRAL_RACHA = 3;
const UMBRAL_PCT = 80;
// Ventana de análisis de alertas y ranking (acota las lecturas de Firestore).
const DIAS_VENTANA = 90;
// Cuántas filas se muestran antes del botón "ver todas".
const TOPE_ALERTAS = 6;
const TOPE_RANKING = 10;

// "lunes, 15 de septiembre de 2026" — la fecha ISO sola no se lee de un vistazo.
function fechaLarga(iso) {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString("es-EC", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
  } catch {
    return iso;
  }
}

// Estado de un grado en un día a partir del documento de asistencia.
// Los estudiantes cuyo día está marcado solo con "N" no computan.
function resumirDia(asistencia) {
  const r = { registrados: 0, presentes: 0, injustificadas: 0, justificadas: 0 };
  for (const marcas of Object.values(asistencia.registros || {})) {
    const cods = Object.values(marcas);
    if (!cods.some(c => c !== "N")) continue;
    r.registrados++;
    if (cods.some(c => c === "P" || c === "A")) r.presentes++;
    else if (cods.some(c => c === "I")) r.injustificadas++;
    else if (cods.some(c => c === "J")) r.justificadas++;
  }
  return r;
}

function barra(porcentaje, clase = "") {
  const ancho = Math.max(0, Math.min(100, Math.round(porcentaje || 0)));
  return `<div class="barra ${clase}"><span style="width:${ancho}%"></span></div>`;
}

export async function initDashboard(contenedor, ctx = {}) {
  const hoy = fechaHoy();
  const diaHoy = diaDeFecha(hoy);

  const [grados, todos, asistencias, feriados] = await Promise.all([
    obtenerGrados(),
    obtenerTodosLosEstudiantes(),
    obtenerTodasLasAsistencias(fechaMenosDias(DIAS_VENTANA)),
    obtenerFeriados(),
  ]);

  const esFeriado = feriados.includes(hoy);
  const hayClases = Boolean(diaHoy) && !esFeriado;
  // Los retirados no cuentan en tarjetas, alertas ni ranking.
  const estudiantes = todos.filter(e => e.activo !== false);

  const porGrado = {};
  for (const g of grados) porGrado[g] = [];
  for (const e of estudiantes) (porGrado[e.grado] = porGrado[e.grado] || []).push(e);

  // Estado de la asistencia de hoy por grado (null = sin registrar).
  const estadoHoy = {};
  if (hayClases) {
    await Promise.all(grados.map(async (g) => {
      const a = await obtenerAsistencia(g, hoy);
      estadoHoy[g] = a ? resumirDia(a) : null;
    }));
  }

  /* ---------- Análisis de los últimos DIAS_VENTANA días ---------- */

  const indice = indicePorEstudiante(asistencias);
  const analisis = estudiantes.map(e => {
    const entrada = indice[e.id];
    const r = resumenEstudiante(entrada);
    return { est: e, r, racha: rachaInjustificadas(entrada), faltas: r.I + r.A };
  });

  const alertas = analisis
    .filter(x => x.racha >= UMBRAL_RACHA ||
                 (x.r.porcentaje !== null && x.r.porcentaje < UMBRAL_PCT))
    .sort((a, b) => b.racha - a.racha || (a.r.porcentaje ?? 100) - (b.r.porcentaje ?? 100));

  const ranking = analisis
    .filter(x => x.faltas > 0)
    .sort((a, b) => b.faltas - a.faltas || b.r.I - a.r.I);

  /* ---------- Franja de estado de hoy ---------- */

  // Un grado sin estudiantes activos no puede registrar asistencia: no se
  // cuenta como pendiente para no inflar el "faltan X grados".
  const conNomina = grados.filter(g => (porGrado[g] || []).length > 0);
  const registrados = conNomina.filter(g => estadoHoy[g]);
  const pendientes = conNomina.filter(g => !estadoHoy[g]);
  const totalPresentes = registrados.reduce((s, g) => s + estadoHoy[g].presentes, 0);
  const totalMarcados = registrados.reduce((s, g) => s + estadoHoy[g].registrados, 0);
  const totalAusentes = totalMarcados - totalPresentes;
  const pctHoy = totalMarcados > 0
    ? Math.round((totalPresentes / totalMarcados) * 100) : null;
  const pctGrados = conNomina.length > 0
    ? (registrados.length / conNomina.length) * 100 : 0;

  let claseHero, etiquetaHero, titularHero, pieHero, barraHero;
  if (!hayClases) {
    claseHero = "sin-clases";
    etiquetaHero = "Hoy no hay clases";
    titularHero = esFeriado ? "Feriado o suspensión" : "Fin de semana";
    pieHero = "No se registra asistencia. El próximo día hábil volverá a " +
              "aparecer aquí el estado de cada grado.";
    barraHero = "";
  } else if (conNomina.length === 0) {
    claseHero = "sin-clases";
    etiquetaHero = "Asistencia de hoy";
    titularHero = "No hay grados con estudiantes";
    pieHero = "Agregue estudiantes desde el módulo Estudiantes para empezar a registrar.";
    barraHero = "";
  } else if (pendientes.length === 0) {
    claseHero = "ok";
    etiquetaHero = "Asistencia de hoy";
    titularHero = `Registrada en los ${conNomina.length} grados`;
    pieHero = "Todo al día. Puede revisar o corregir cualquier grado desde las tarjetas.";
    barraHero = barra(100, "ok");
  } else {
    claseHero = "pendiente";
    etiquetaHero = "Asistencia de hoy";
    titularHero = `${registrados.length} de ${conNomina.length} grados registrados`;
    pieHero = `Falta registrar: ${pendientes.join(", ")}.`;
    barraHero = barra(pctGrados, "aviso");
  }

  /* ---------- Tarjeta por grado ---------- */

  function tarjetaGrado(g) {
    const lista = porGrado[g] || [];
    const s = estadoHoy[g];
    let clase, chip, cuerpo, accion;

    if (!hayClases) {
      clase = "sin-clases";
      chip = `<span class="chip chip-neutro">Sin clases</span>`;
      cuerpo = `<p class="tg-meta">${lista.length} estudiantes en la nómina</p>`;
      accion = `<button class="btn-mini" data-ir-grado="${esc(g)}">Abrir grado</button>`;
    } else if (!s) {
      clase = "pendiente";
      chip = `<span class="chip chip-aviso">Pendiente</span>`;
      cuerpo = `
        <p class="tg-cifra">—<small> sin registrar</small></p>
        ${barra(0)}
        <p class="tg-meta">${lista.length} estudiantes en la nómina</p>`;
      accion = `<button class="btn-mini destacado" data-ir-grado="${esc(g)}">Registrar asistencia</button>`;
    } else {
      const pct = s.registrados > 0 ? (s.presentes / s.registrados) * 100 : 0;
      const ausentes = s.registrados - s.presentes;
      clase = "ok";
      chip = `<span class="chip chip-ok">Registrado</span>`;
      const detalle = ausentes === 0
        ? "Asistencia completa"
        : [
            s.injustificadas ? `${s.injustificadas} injustificada${s.injustificadas === 1 ? "" : "s"}` : "",
            s.justificadas ? `${s.justificadas} justificada${s.justificadas === 1 ? "" : "s"}` : ""
          ].filter(Boolean).join(" · ") || `${ausentes} ausente${ausentes === 1 ? "" : "s"}`;
      cuerpo = `
        <p class="tg-cifra">${s.presentes}<small>/${s.registrados} presentes</small></p>
        ${barra(pct, pct >= 90 ? "ok" : pct >= 75 ? "aviso" : "peligro")}
        <p class="tg-meta ${ausentes ? "tg-meta-alerta" : ""}">${esc(detalle)}</p>`;
      accion = `<button class="btn-mini" data-ir-grado="${esc(g)}">Ver / corregir</button>`;
    }

    return `
      <article class="tarjeta-grado ${clase}">
        <div class="tg-cabecera"><h3>${esc(g)}</h3>${chip}</div>
        <div class="tg-cuerpo">${cuerpo}</div>
        <div class="tg-pie">${accion}</div>
      </article>`;
  }

  /* ---------- Estructura de la pantalla ---------- */

  // Todo cuelga de un nodo nuevo (`.dash`): los listeners delegados se
  // enganchan ahí y no en `contenedor`, que se reutiliza cada vez que se
  // vuelve al módulo (si no, se acumularían y navegaría dos veces).
  contenedor.innerHTML = `
    <div class="dash">
    <header class="dash-cabecera">
      <div>
        <h2 class="titulo-modulo">Resumen del día</h2>
        <p class="dash-fecha">${esc(fechaLarga(hoy))}</p>
      </div>
      <button class="btn-mini" id="btn-refrescar">Actualizar datos</button>
    </header>

    <section class="dash-hero ${claseHero}">
      <div class="hero-principal">
        <p class="hero-etiqueta">${esc(etiquetaHero)}</p>
        <p class="hero-titular">${esc(titularHero)}</p>
        ${barraHero}
        <p class="hero-pie">${esc(pieHero)}</p>
      </div>
      <div class="hero-kpis">
        <div class="kpi ${hayClases ? "kpi-ok" : ""}">
          <span class="kpi-num">${hayClases ? totalPresentes : "—"}</span>
          <span class="kpi-lbl">presentes</span>
        </div>
        <div class="kpi ${hayClases && totalAusentes > 0 ? "kpi-alerta" : ""}">
          <span class="kpi-num">${hayClases ? totalAusentes : "—"}</span>
          <span class="kpi-lbl">ausentes</span>
        </div>
        <div class="kpi">
          <span class="kpi-num">${pctHoy === null ? "—" : pctHoy + "%"}</span>
          <span class="kpi-lbl">asistencia</span>
        </div>
        <button class="kpi ${alertas.length ? "kpi-alerta" : ""}" id="kpi-alertas"
                title="Alertas de inasistencia de los últimos 90 días: ir al detalle">
          <span class="kpi-num">${alertas.length}</span>
          <span class="kpi-lbl">alertas</span>
        </button>
      </div>
    </section>

    <div class="panel-cabecera">
      <h3 class="dash-subtitulo">Estado por grado</h3>
      <span class="info">${estudiantes.length} estudiantes activos en ${grados.length} grados</span>
    </div>
    <div class="grid-grados">${grados.map(tarjetaGrado).join("")}</div>

    <div class="panel-cabecera" id="seguimiento">
      <h3 class="dash-subtitulo">Seguimiento de inasistencias</h3>
      <label class="dash-filtro">
        Grado:
        <select id="f-grado-dash">
          <option value="">Todos</option>
          ${grados.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join("")}
        </select>
      </label>
    </div>
    <div id="dash-paneles"></div>
    </div>`;

  /* ---------- Paneles filtrables ---------- */

  const raiz = contenedor.querySelector(".dash");
  const paneles = raiz.querySelector("#dash-paneles");
  let filtroGrado = "";
  let verTodasAlertas = false;
  let verTodoRanking = false;

  function panelAlertas() {
    const lista = alertas.filter(x => !filtroGrado || x.est.grado === filtroGrado);
    const visibles = verTodasAlertas ? lista : lista.slice(0, TOPE_ALERTAS);

    let cuerpo;
    if (lista.length === 0) {
      cuerpo = `<p class="vacio">Sin alertas: ningún estudiante acumula
        ${UMBRAL_RACHA} o más injustificadas seguidas ni baja del ${UMBRAL_PCT}%
        de asistencia.</p>`;
    } else {
      cuerpo = `
        <ul class="lista-alertas">
          ${visibles.map(x => {
            const critica = x.racha >= UMBRAL_RACHA;
            const motivos = [
              critica
                ? `<span class="chip chip-peligro">${x.racha} injustificadas seguidas</span>`
                : "",
              x.r.porcentaje !== null && x.r.porcentaje < UMBRAL_PCT
                ? `<span class="chip chip-aviso">${x.r.porcentaje}% de asistencia</span>`
                : ""
            ].filter(Boolean).join("");
            return `
              <li class="alerta ${critica ? "critica" : ""}" data-ir-est="${esc(x.est.id)}"
                  tabindex="0" role="button">
                <span class="alerta-info">
                  <span class="alerta-nombre">${esc(x.est.nombre)}</span>
                  <span class="alerta-grado">${esc(x.est.grado)}</span>
                </span>
                <span class="alerta-motivos">${motivos}</span>
                <span class="alerta-ver">Ver ficha ›</span>
              </li>`;
          }).join("")}
        </ul>
        ${lista.length > TOPE_ALERTAS
          ? `<button class="btn-enlace" id="btn-mas-alertas">${verTodasAlertas
              ? `Mostrar solo las ${TOPE_ALERTAS} primeras`
              : `Ver las ${lista.length} alertas`}</button>`
          : ""}`;
    }

    return `
      <div class="panel">
        <div class="panel-cabecera">
          <h2 class="panel-titulo">
            Alertas de inasistencia
            ${lista.length ? `<span class="chip chip-peligro">${lista.length}</span>` : ""}
          </h2>
        </div>
        <p class="info">Últimos ${DIAS_VENTANA} días. Se marca a quien acumula
          ${UMBRAL_RACHA}+ injustificadas seguidas o menos del ${UMBRAL_PCT}% de
          asistencia. Haga clic en un estudiante para abrir su ficha.</p>
        ${cuerpo}
      </div>`;
  }

  function panelRanking() {
    const lista = ranking.filter(x => !filtroGrado || x.est.grado === filtroGrado);
    const visibles = verTodoRanking ? lista : lista.slice(0, TOPE_RANKING);
    const maximo = lista.length ? lista[0].faltas : 0;

    let cuerpo;
    if (lista.length === 0) {
      cuerpo = `<p class="vacio">Aún no hay inasistencias registradas en este período.</p>`;
    } else {
      cuerpo = `
        <div style="overflow-x:auto;">
          <table class="tabla-gestion">
            <thead>
              <tr>
                <th class="centro">#</th>
                <th>Estudiante</th>
                <th>Horas perdidas</th>
                <th class="centro">Injust.</th>
                <th class="centro">Atrasos</th>
                <th class="centro">% asistencia</th>
              </tr>
            </thead>
            <tbody>
              ${visibles.map((x, i) => `
                <tr class="clickeable" data-ir-est="${esc(x.est.id)}">
                  <td class="centro">${i + 1}</td>
                  <td>
                    <span class="alerta-nombre">${esc(x.est.nombre)}</span>
                    <span class="alerta-grado">${esc(x.est.grado)}</span>
                  </td>
                  <td>
                    <div class="celda-barra">
                      ${barra(maximo ? (x.faltas / maximo) * 100 : 0, "peligro")}
                      <span class="celda-barra-num">${x.faltas} h</span>
                    </div>
                  </td>
                  <td class="centro">${x.r.I}</td>
                  <td class="centro">${x.r.A}</td>
                  <td class="centro">${x.r.porcentaje === null ? "—" : x.r.porcentaje + "%"}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
        ${lista.length > TOPE_RANKING
          ? `<button class="btn-enlace" id="btn-mas-ranking">${verTodoRanking
              ? `Mostrar solo los ${TOPE_RANKING} primeros`
              : `Ver los ${lista.length} estudiantes`}</button>`
          : ""}`;
    }

    return `
      <div class="panel">
        <div class="panel-cabecera">
          <h2 class="panel-titulo">Estudiantes con más inasistencias</h2>
        </div>
        <p class="info">Últimos ${DIAS_VENTANA} días. "Horas perdidas" suma las
          horas clase marcadas como injustificada o atraso; el porcentaje de
          asistencia se calcula por días.</p>
        ${cuerpo}
      </div>`;
  }

  function pintarPaneles() {
    paneles.innerHTML = panelAlertas() + panelRanking();
  }

  pintarPaneles();

  /* ---------- Interacción ---------- */

  raiz.querySelector("#f-grado-dash").addEventListener("change", (e) => {
    filtroGrado = e.target.value;
    verTodasAlertas = false;
    verTodoRanking = false;
    pintarPaneles();
  });

  raiz.querySelector("#kpi-alertas").addEventListener("click", () => {
    raiz.querySelector("#seguimiento")
      .scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const btnRefrescar = raiz.querySelector("#btn-refrescar");
  btnRefrescar.addEventListener("click", async () => {
    btnRefrescar.disabled = true;
    btnRefrescar.classList.add("cargando");
    try {
      refrescarCache();
      // Se vuelve a pintar todo el módulo con los datos recién leídos.
      await initDashboard(contenedor, ctx);
    } catch (err) {
      notificarError("No se pudo actualizar el resumen", err);
      btnRefrescar.disabled = false;
      btnRefrescar.classList.remove("cargando");
    }
  });

  // Navegación directa: tarjeta de grado → registro de asistencia de hoy;
  // estudiante de alertas o ranking → su ficha.
  raiz.addEventListener("click", (e) => {
    if (!ctx.irA) return;
    const tarjeta = e.target.closest("[data-ir-grado]");
    if (tarjeta) {
      ctx.irA("asistencia", { grado: tarjeta.dataset.irGrado, fecha: hoy });
      return;
    }
    const fila = e.target.closest("[data-ir-est]");
    if (fila) ctx.irA("estudiantes", { estudianteId: fila.dataset.irEst });
  });

  // Las alertas son elementos de lista: también se abren con el teclado.
  paneles.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const fila = e.target.closest("[data-ir-est]");
    if (!fila || !ctx.irA) return;
    e.preventDefault();
    ctx.irA("estudiantes", { estudianteId: fila.dataset.irEst });
  });

  paneles.addEventListener("click", (e) => {
    if (e.target.id === "btn-mas-alertas") {
      verTodasAlertas = !verTodasAlertas;
      pintarPaneles();
    } else if (e.target.id === "btn-mas-ranking") {
      verTodoRanking = !verTodoRanking;
      pintarPaneles();
    }
  });
}
