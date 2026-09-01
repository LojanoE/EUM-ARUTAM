// Imprime en una sola pestaña las hojas de asistencia de varios grados para
// un mismo día (un salto de página entre cada una, ver css/print.css), para
// que un solo trabajo de impresión / "Guardar como PDF" cubra todo el lote.
import { exigirSesion } from "./auth.js";
import { diaDeFecha, obtenerFeriados, firmaDelUsuario } from "./data.js";
import { notaModoOffline } from "./offline.js";
import { plantillaHojaHTML, cargarDatosHoja, pintarHoja, ajustarAUnaPagina } from "./hoja-asistencia.js";

const sesion = exigirSesion();
if (!sesion) throw new Error("Sin sesión");

const params = new URLSearchParams(location.search);
const fecha = params.get("fecha");
const grados = (params.get("grados") || "")
  .split(",")
  .map(g => decodeURIComponent(g))
  .filter(Boolean);
const vacio = params.get("vacio") === "1";

const estado = document.getElementById("estado");
const contenedorLote = document.getElementById("lote");

async function iniciar() {
  if (!fecha || grados.length === 0) {
    estado.textContent = "Faltan parámetros: fecha y al menos un grado.";
    return;
  }

  const dia = diaDeFecha(fecha);
  if (!dia) {
    estado.textContent = "La fecha es fin de semana; no hay clases.";
    return;
  }
  const feriados = await obtenerFeriados();
  if (feriados.includes(fecha)) {
    estado.textContent = "La fecha seleccionada es feriado o suspensión; no hay clases.";
    return;
  }

  estado.textContent = `Cargando ${grados.length} grado(s)...`;

  const [firma, resultados] = await Promise.all([
    firmaDelUsuario(sesion.usuario),
    Promise.all(grados.map(grado => cargarDatosHoja({ grado, fecha, vacio }))),
  ]);

  const omitidos = [];
  let impresas = 0;
  resultados.forEach((datos, i) => {
    if (!datos.ok) {
      omitidos.push(`${grados[i]}: ${datos.motivo}`);
      return;
    }
    const hoja = document.createElement("div");
    hoja.className = "hoja-asistencia";
    hoja.innerHTML = plantillaHojaHTML();
    contenedorLote.appendChild(hoja);
    pintarHoja(hoja, datos, firma);
    ajustarAUnaPagina(hoja);
    impresas++;
  });

  const partes = [notaModoOffline()];
  partes.push(impresas > 0
    ? `${impresas} hoja(s) lista(s) para imprimir${vacio ? " (en blanco)" : ""}.`
    : "No se pudo generar ninguna hoja.");
  if (omitidos.length > 0) {
    partes.push(`Omitido(s): ${omitidos.join("; ")}.`);
  }
  estado.textContent = partes.filter(Boolean).join(" ");
}

document.getElementById("btn-imprimir").addEventListener("click", () => window.print());

iniciar().catch(err => {
  console.error(err);
  estado.textContent = "Error al cargar el lote: " + err.message;
});
