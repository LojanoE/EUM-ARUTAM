// Precarga en la caché persistente de Firestore (IndexedDB) todos los datos
// que necesitan las páginas de impresión, para que puedan generarse sin
// internet. La clave: ejecutar EXACTAMENTE las mismas consultas que usan
// imprimir.js y reporte.js, porque Firestore cachea por consulta.
import {
  obtenerGrados, obtenerEstudiantes, obtenerTutor, obtenerHorario,
  obtenerTodasLasAsistencias, firmaDelUsuario, DIAS_SEMANA
} from "./data.js";

const TS_KEY = "uem_arutam_offline_ts";

// ISO de la última precarga exitosa, o null si nunca se ha hecho.
export function fechaUltimaPrecarga() {
  return localStorage.getItem(TS_KEY);
}

// Texto para las páginas de impresión cuando no hay conexión: avisa que los
// datos vienen de la caché y de qué fecha son.
export function notaModoOffline() {
  if (navigator.onLine) return "";
  const ts = fechaUltimaPrecarga();
  const fecha = ts
    ? new Date(ts).toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" })
    : "fecha desconocida";
  return `Sin conexión — datos en caché del ${fecha}. `;
}

// Descarga todo lo necesario para imprimir cualquier grado sin conexión:
// - estudiantes/tutor/horario de cada grado (mismas queries de las impresiones);
// - la colección completa de asistencias (el escaneo que hace imprimir.js; al
//   quedar los documentos en caché, cubre también el getDoc por fecha);
// - la firma del usuario (documento de usuario + config institucional).
// Requiere internet. Devuelve el ISO del momento en que terminó.
export async function prepararCacheOffline(sesion) {
  const grados = await obtenerGrados();
  for (const grado of grados) {
    // obtenerEstudiantes con y sin retirados usa la misma query de Firestore
    // (el filtro es en el cliente), así que una sola llamada cubre a
    // imprimir.js y reporte.js.
    await obtenerEstudiantes(grado);
    await obtenerTutor(grado);
    for (const dia of DIAS_SEMANA) await obtenerHorario(grado, dia);
  }
  await obtenerTodasLasAsistencias();
  await firmaDelUsuario(sesion.usuario);
  const ts = new Date().toISOString();
  localStorage.setItem(TS_KEY, ts);
  return ts;
}
