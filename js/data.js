// Capa de acceso a datos Firestore.
import {
  collection, doc, getDoc, getDocs, query, setDoc, where, serverTimestamp,
  addDoc, updateDoc, deleteDoc, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase-config.js";

// Escapa texto para interpolarlo en HTML (atributos o contenido).
// Necesario porque los grados llevan comillas: 8vo EGB "A".
export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Caché en memoria para no re-descargar lo mismo al cambiar de módulo.
// Se invalida en cada escritura y vence a los 2 minutos (por si otro
// usuario escribe desde otra sesión).
const _cache = new Map();
const CACHE_TTL_MS = 2 * 60 * 1000;

async function conCache(clave, cargar) {
  const hit = _cache.get(clave);
  if (hit && Date.now() - hit.t < CACHE_TTL_MS) return hit.datos;
  const datos = await cargar();
  _cache.set(clave, { t: Date.now(), datos });
  return datos;
}

function invalidarCache() {
  _cache.clear();
}

// Fuerza que la próxima lectura vuelva a Firestore aunque la caché siga
// vigente (botón "Actualizar datos" del dashboard).
export function refrescarCache() {
  invalidarCache();
}

export const DIAS_SEMANA = ["LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES"];
export const CODIGOS = ["P", "I", "J", "A", "N"];
export const CODIGOS_DESC = {
  P: "PRESENTE", I: "INJUSTIFICADO", J: "JUSTIFICADO", A: "ATRASO", N: "NO HAY CLASES"
};

export function diaDeFecha(fecha /* "YYYY-MM-DD" */) {
  const d = new Date(fecha + "T12:00:00");
  const idx = d.getDay(); // 0=domingo ... 6=sábado
  return idx >= 1 && idx <= 5 ? DIAS_SEMANA[idx - 1] : null;
}

export function fechaHoy() {
  return fechaMenosDias(0);
}

// Fecha "YYYY-MM-DD" de hoy menos n días (para acotar consultas).
export function fechaMenosDias(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dia}`;
}

export function obtenerGrados() {
  return conCache("grados", async () => {
    const snap = await getDocs(collection(db, "tutores"));
    return snap.docs.map(d => d.id).sort();
  });
}

export async function obtenerTutor(grado) {
  const snap = await getDoc(doc(db, "tutores", grado));
  return snap.exists() ? snap.data() : null;
}

// Por defecto solo estudiantes activos; con incluirRetirados=true también
// devuelve los retirados (activo === false), p. ej. para reportes históricos.
export function obtenerEstudiantes(grado, incluirRetirados = false) {
  return conCache(`est:${grado}:${incluirRetirados}`, async () => {
    // Sin orderBy en la query: where + orderBy exigiría un índice compuesto.
    // Se ordena en el cliente (localeCompare ordena bien tildes y Ñ).
    const q = query(
      collection(db, "estudiantes"),
      where("grado", "==", grado)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(e => incluirRetirados || e.activo !== false)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  });
}

export async function obtenerHorario(grado, dia) {
  const q = query(
    collection(db, "horarios"),
    where("grado", "==", grado),
    where("dia", "==", dia)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => d.data())
    .sort((a, b) => a.orden - b.orden);
}

export function idAsistencia(grado, fecha) {
  return `${grado}_${fecha}`;
}

export async function obtenerAsistencia(grado, fecha) {
  const snap = await getDoc(doc(db, "asistencias", idAsistencia(grado, fecha)));
  return snap.exists() ? snap.data() : null;
}

export async function guardarAsistencia(grado, fecha, registros, registradoPor, observaciones = {}) {
  invalidarCache();
  const ref = doc(db, "asistencias", idAsistencia(grado, fecha));
  await setDoc(ref, {
    grado,
    fecha,
    registros,
    observaciones,
    registradoPor,
    actualizadoEn: serverTimestamp()
  });
  // Read-back: confirmar que el documento quedó realmente en la base.
  // El mensaje de éxito de la interfaz significa "está guardado", no solo
  // "se envió".
  const verif = await getDoc(ref);
  const guardados = verif.exists() ? Object.keys(verif.data().registros || {}).length : -1;
  if (guardados !== Object.keys(registros).length) {
    throw new Error(
      "No se pudo confirmar el guardado en la base de datos. " +
      "Revise su conexión e inténtelo de nuevo.");
  }
}

/* ---------- Gestión de estudiantes (admin) ---------- */

export function obtenerTodosLosEstudiantes() {
  return conCache("est:todos", async () => {
    const snap = await getDocs(collection(db, "estudiantes"));
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  });
}

export async function agregarEstudiante(nombre, grado) {
  invalidarCache();
  await addDoc(collection(db, "estudiantes"), { nombre, grado, activo: true });
}

// Sirve para editar el nombre, mover de grado (el id no cambia, por lo que
// el historial de asistencia se conserva) y retirar/reincorporar (activo).
export async function actualizarEstudiante(id, datos) {
  invalidarCache();
  await updateDoc(doc(db, "estudiantes", id), datos);
}

/* ---------- Gestión de horarios (admin) ---------- */

export async function obtenerHorariosDeGrado(grado) {
  const q = query(collection(db, "horarios"), where("grado", "==", grado));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) =>
      DIAS_SEMANA.indexOf(a.dia) - DIAS_SEMANA.indexOf(b.dia) ||
      a.orden - b.orden
    );
}

export async function agregarBloqueHorario(bloque) {
  await addDoc(collection(db, "horarios"), bloque);
}

export async function actualizarBloqueHorario(id, datos) {
  await updateDoc(doc(db, "horarios", id), datos);
}

export async function eliminarBloqueHorario(id) {
  await deleteDoc(doc(db, "horarios", id));
}

/* ---------- Gestión de grados (admin) ---------- */

export async function obtenerTutores() {
  const snap = await getDocs(collection(db, "tutores"));
  return snap.docs
    .map(d => ({ grado: d.id, ...d.data() }))
    .sort((a, b) => a.grado.localeCompare(b.grado, "es"));
}

// Cuenta estudiantes, bloques de horario y días de asistencia de un grado.
export async function contarPorGrado(grado) {
  const [est, hor, asi] = await Promise.all([
    getDocs(query(collection(db, "estudiantes"), where("grado", "==", grado))),
    getDocs(query(collection(db, "horarios"), where("grado", "==", grado))),
    getDocs(query(collection(db, "asistencias"), where("grado", "==", grado))),
  ]);
  return { estudiantes: est.size, bloques: hor.size, diasAsistencia: asi.size };
}

export async function agregarGrado(grado, seccion, tutor) {
  const ref = doc(db, "tutores", grado);
  const snap = await getDoc(ref);
  if (snap.exists()) throw new Error(`El grado "${grado}" ya existe.`);
  invalidarCache();
  await setDoc(ref, { grado, seccion, tutor });
}

export async function actualizarGrado(grado, datos) {
  invalidarCache();
  await updateDoc(doc(db, "tutores", grado), datos);
}

// Ejecuta operaciones de escritura en lotes (Firestore admite máx. 500).
async function ejecutarEnLotes(operaciones) {
  let batch = writeBatch(db);
  let enBatch = 0;
  for (const op of operaciones) {
    op(batch);
    enBatch++;
    if (enBatch === 490) {
      await batch.commit();
      batch = writeBatch(db);
      enBatch = 0;
    }
  }
  if (enBatch > 0) await batch.commit();
}

// Renombra un grado actualizando en cascada estudiantes, horarios y el
// historial de asistencia (incluidas las claves de `registros`).
export async function renombrarGrado(viejo, nuevo, datosTutor) {
  const refNuevo = doc(db, "tutores", nuevo);
  if ((await getDoc(refNuevo)).exists()) {
    throw new Error(`Ya existe el grado "${nuevo}".`);
  }
  const [estSnap, horSnap, asiSnap] = await Promise.all([
    getDocs(query(collection(db, "estudiantes"), where("grado", "==", viejo))),
    getDocs(query(collection(db, "horarios"), where("grado", "==", viejo))),
    getDocs(query(collection(db, "asistencias"), where("grado", "==", viejo))),
  ]);

  const ops = [];
  ops.push(b => b.set(refNuevo, { grado: nuevo, ...datosTutor }));
  ops.push(b => b.delete(doc(db, "tutores", viejo)));

  // Los ids semilla llevan el grado como prefijo (`<grado>__...`); esos
  // documentos se recrean con el nuevo id. Los agregados luego por la app
  // tienen id automático: basta actualizar el campo.
  const prefijo = viejo + "__";
  const trasladar = (snap, coleccion) => {
    for (const d of snap.docs) {
      const datos = { ...d.data(), grado: nuevo };
      if (d.id.startsWith(prefijo)) {
        const nuevoId = nuevo + "__" + d.id.slice(prefijo.length);
        ops.push(b => b.set(doc(db, coleccion, nuevoId), datos));
        ops.push(b => b.delete(doc(db, coleccion, d.id)));
      } else {
        ops.push(b => b.update(d.ref, { grado: nuevo }));
      }
    }
  };
  trasladar(estSnap, "estudiantes");
  trasladar(horSnap, "horarios");

  for (const d of asiSnap.docs) {
    const data = d.data();
    const registros = {};
    for (const [k, v] of Object.entries(data.registros || {})) {
      registros[k.startsWith(prefijo) ? nuevo + "__" + k.slice(prefijo.length) : k] = v;
    }
    ops.push(b => b.set(doc(db, "asistencias", `${nuevo}_${data.fecha}`),
      { ...data, grado: nuevo, registros }));
    ops.push(b => b.delete(doc(db, "asistencias", d.id)));
  }

  await ejecutarEnLotes(ops);
  invalidarCache();
  return {
    estudiantes: estSnap.size,
    bloques: horSnap.size,
    diasAsistencia: asiSnap.size
  };
}

// Elimina un grado sin estudiantes, junto con su horario y sus registros
// de asistencia. Si tiene estudiantes, hay que moverlos primero.
export async function eliminarGrado(grado) {
  const conteos = await contarPorGrado(grado);
  if (conteos.estudiantes > 0) {
    throw new Error(
      `El grado tiene ${conteos.estudiantes} estudiante(s). ` +
      `Muévalos a otro grado antes de eliminarlo.`);
  }
  const [horSnap, asiSnap] = await Promise.all([
    getDocs(query(collection(db, "horarios"), where("grado", "==", grado))),
    getDocs(query(collection(db, "asistencias"), where("grado", "==", grado))),
  ]);
  const ops = [];
  ops.push(b => b.delete(doc(db, "tutores", grado)));
  for (const d of horSnap.docs) ops.push(b => b.delete(d.ref));
  for (const d of asiSnap.docs) ops.push(b => b.delete(d.ref));
  await ejecutarEnLotes(ops);
  invalidarCache();
  return conteos;
}

/* ---------- Historial de asistencia (dashboard y ficha de estudiante) ---------- */

// Toda la colección `asistencias`, o solo desde una fecha ("YYYY-MM-DD")
// para acotar lecturas. El rango es sobre un solo campo: no exige índice
// compuesto. La ficha del estudiante usa la colección completa; el dashboard
// se limita a los últimos 90 días.
export function obtenerTodasLasAsistencias(desde = null) {
  return conCache(`asistencias:${desde || "todas"}`, async () => {
    const col = collection(db, "asistencias");
    const snap = await getDocs(desde ? query(col, where("fecha", ">=", desde)) : col);
    return snap.docs.map(d => d.data());
  });
}

// Construye un índice por estudiante sobre toda la colección `asistencias`.
// No depende del grado: sobrevive a los traslados de grado.
// Devuelve { estudianteId: { marcas: {P,I,J,A,N}, dias: {fecha: [codigos]}, faltas: [...] } }
export function indicePorEstudiante(asistencias) {
  const indice = {};
  for (const a of asistencias) {
    for (const [estId, marcasHora] of Object.entries(a.registros || {})) {
      const e = indice[estId] = indice[estId] || {
        marcas: { P: 0, I: 0, J: 0, A: 0, N: 0 },
        dias: {},
        faltas: []
      };
      const obs = a.observaciones?.[estId] || null;
      const codigosDia = [];
      for (const [hora, codigo] of Object.entries(marcasHora)) {
        if (e.marcas[codigo] !== undefined) e.marcas[codigo]++;
        codigosDia.push(codigo);
        if (codigo === "I" || codigo === "J" || codigo === "A") {
          e.faltas.push({
            fecha: a.fecha,
            hora: Number(hora),
            codigo,
            grado: a.grado,
            obs
          });
        }
      }
      e.dias[a.fecha] = codigosDia;
    }
  }
  for (const e of Object.values(indice)) {
    e.faltas.sort((x, y) => y.fecha.localeCompare(x.fecha) || y.hora - x.hora);
  }
  return indice;
}

// Resumen por estudiante a partir del índice: días registrados, días
// asistidos (al menos una P o A) y porcentaje de asistencia.
// Los días con solo marcas "N" (no hay clases / feriado) no computan.
export function resumenEstudiante(entrada) {
  if (!entrada) {
    return { diasRegistrados: 0, diasAsistidos: 0, porcentaje: null,
             I: 0, J: 0, A: 0, P: 0 };
  }
  const diasComputables = Object.values(entrada.dias)
    .filter(cods => cods.some(c => c !== "N"));
  const diasRegistrados = diasComputables.length;
  const diasAsistidos = diasComputables
    .filter(cods => cods.some(c => c === "P" || c === "A")).length;
  const porcentaje = diasRegistrados > 0
    ? Math.round((diasAsistidos / diasRegistrados) * 100)
    : null;
  return {
    diasRegistrados,
    diasAsistidos,
    porcentaje,
    I: entrada.marcas.I,
    J: entrada.marcas.J,
    A: entrada.marcas.A,
    P: entrada.marcas.P
  };
}

/* ---------- Reporte por rango de fechas ---------- */

// Asistencias de un grado. La query usa solo igualdad (sin rango en fecha)
// para no exigir índice compuesto; el rango se filtra en el cliente.
export async function obtenerAsistenciasDeGrado(grado) {
  const q = query(collection(db, "asistencias"), where("grado", "==", grado));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

// Para el reporte por rango: filtrar las asistencias por fecha en el cliente
// y armar el índice con indicePorEstudiante + resumenEstudiante.

/* ---------- Alertas de inasistencia ---------- */

// Días injustificados "puros" seguidos (racha final): días con al menos una
// marca I y ninguna P/A. Devuelve la longitud de la racha más reciente.
// Los días con solo "N" (no hay clases / feriado) se saltan: no cortan la
// racha ni la alargan.
export function rachaInjustificadas(entrada) {
  if (!entrada) return 0;
  const fechas = Object.keys(entrada.dias).sort();
  let racha = 0;
  for (let i = fechas.length - 1; i >= 0; i--) {
    const cods = entrada.dias[fechas[i]];
    if (!cods.some(c => c !== "N")) continue;
    const injustificado = cods.some(c => c === "I") &&
      !cods.some(c => c === "P" || c === "A");
    if (!injustificado) break;
    racha++;
  }
  return racha;
}

/* ---------- Gestión de usuarios (admin) ---------- */

export async function obtenerUsuarios() {
  const snap = await getDocs(collection(db, "usuarios"));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.usuario.localeCompare(b.usuario, "es"));
}

// `extra` se mezcla en el documento (p. ej. { debeCambiarPassword: true }).
export async function agregarUsuario(usuario, password, nombre, rol, cargo = "", extra = {}) {
  const ref = doc(db, "usuarios", usuario);
  if ((await getDoc(ref)).exists()) {
    throw new Error(`El usuario "${usuario}" ya existe.`);
  }
  await setDoc(ref, { usuario, password, nombre, rol, cargo, ...extra });
}

export async function actualizarUsuario(usuario, datos) {
  await updateDoc(doc(db, "usuarios", usuario), datos);
}

export async function eliminarUsuario(usuario) {
  await deleteDoc(doc(db, "usuarios", usuario));
}

/* ---------- Configuración de documentos impresos ---------- */

const CONFIG_DOC = "institucion";
export const CONFIG_DEFECTO = {
  subinspector: "SHARUP GAONA BRINNY KIMBERLY",
  cargoSubinspector: "SUB-INSPECTOR V (e)",
  feriados: [],
  // Calificaciones: periodo y trimestre que los docentes pueden editar.
  // Los pesos son configurables; confirmar contra el instructivo vigente.
  periodoLectivo: "2026-2027",
  trimestreAbierto: 1,
  notaMinima: 7,
  pesosNotas: { formativa: 0.7, sumativa: 0.3, proyecto: 0.5, examen: 0.5 }
};

export async function obtenerConfig() {
  const snap = await getDoc(doc(db, "config", CONFIG_DOC));
  return snap.exists() ? { ...CONFIG_DEFECTO, ...snap.data() } : { ...CONFIG_DEFECTO };
}

export async function guardarConfig(datos) {
  await setDoc(doc(db, "config", CONFIG_DOC), datos, { merge: true });
}

// Feriados y suspensiones: lista de fechas "YYYY-MM-DD" en la config
// institucional. Esos días no se registran ni computan en los porcentajes.
export async function obtenerFeriados() {
  return (await obtenerConfig()).feriados || [];
}

export async function guardarFeriados(fechas) {
  const unicas = [...new Set(fechas)].sort();
  await guardarConfig({ feriados: unicas });
}

// Firma de los documentos impresos: nombre y cargo del usuario que genera
// el reporte. Si no tiene cargo, se usa la config global como respaldo.
export async function firmaDelUsuario(usuario) {
  const snap = await getDoc(doc(db, "usuarios", usuario));
  const u = snap.exists() ? snap.data() : null;
  const cfg = await obtenerConfig();
  return {
    nombre: u?.nombre || usuario,
    cargo: u?.cargo || cfg.cargoSubinspector
  };
}

/* ---------- Cargas docentes y calificaciones ---------- */

// Una carga es un docente dando una asignatura en un grado. Salen de dos
// fuentes: los horarios (automáticas, se vinculan por nombre) y la colección
// `cargas` (manuales: reemplazos y casos fuera del horario).

const TITULOS_DOCENTE = new Set([
  "lic", "licda", "mgtr", "mgs", "msc", "mag", "ing", "dr", "dra", "prof",
  "tlgo", "tnlgo", "abg", "arq", "psic"
]);

// Clave para comparar nombres de docentes que en los horarios vienen escritos
// de varias formas: sin tildes, sin mayúsculas y sin título (Lic., Mgtr.…).
export function claveDocente(nombre) {
  return String(nombre ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z\s]/g, " ")
    .split(/\s+/).filter(p => p && !TITULOS_DOCENTE.has(p)).join(" ");
}

// ¿El nombre del usuario corresponde al docente del horario? Coinciden si las
// claves son iguales o si el usuario tiene todas las palabras del docente (al
// menos dos): "Albita Narcisa Sozoranga Morocho" ↔ "Narcisa Sozoranga".
function coincideDocente(claveUsuario, claveDoc) {
  if (!claveUsuario || !claveDoc) return false;
  if (claveUsuario === claveDoc) return true;
  const palabras = claveDoc.split(" ");
  if (palabras.length < 2) return false;
  const delUsuario = new Set(claveUsuario.split(" "));
  return palabras.every(p => delUsuario.has(p));
}

const porGradoYAsignatura = (a, b) =>
  a.grado.localeCompare(b.grado, "es") || a.asignatura.localeCompare(b.asignatura, "es");

// Lista maestra de docentes: los que están guardados en la colección
// `docentes` más los que solo aparecen escritos en los horarios, con sus cargas
// (grado + asignatura) y las secciones en que dan clase. Los nombres que solo
// difieren en tildes/mayúsculas cuentan como uno solo; si el docente está en la
// lista se muestra su nombre guardado, si no, la grafía más frecuente del horario.
export function obtenerDocentesHorario() {
  return conCache("docentesHorario", async () => {
    const [snapH, snapD, snapT] = await Promise.all([
      getDocs(collection(db, "horarios")),
      getDocs(collection(db, "docentes")),
      getDocs(collection(db, "tutores"))
    ]);
    const seccionDe = new Map(snapT.docs.map(t => [t.id, t.data().seccion]));
    const porClave = new Map();
    const grupo = (clave) => {
      if (!porClave.has(clave)) {
        porClave.set(clave, { clave, id: null, guardado: "", grafias: new Map(), cargas: new Map(), secciones: new Set() });
      }
      return porClave.get(clave);
    };
    for (const d of snapD.docs) {
      const nombre = String(d.data().nombre || "").trim();
      const clave = claveDocente(nombre);
      if (!clave) continue;
      Object.assign(grupo(clave), { id: d.id, guardado: nombre });
    }
    for (const d of snapH.docs) {
      const b = d.data();
      const nombre = String(b.docente || "").trim();
      const clave = claveDocente(nombre);
      const asignatura = String(b.asignatura || "").trim();
      if (!clave || !asignatura || !b.grado) continue;
      const g = grupo(clave);
      g.grafias.set(nombre, (g.grafias.get(nombre) || 0) + 1);
      g.cargas.set(`${b.grado}|${asignatura}`, { grado: b.grado, asignatura });
      if (seccionDe.get(b.grado)) g.secciones.add(seccionDe.get(b.grado));
    }
    return [...porClave.values()].map(g => ({
      clave: g.clave,
      id: g.id,
      enLista: !!g.id,
      nombre: g.guardado || [...g.grafias.entries()].sort((a, b) => b[1] - a[1])[0][0],
      secciones: [...g.secciones].sort(),
      cargas: [...g.cargas.values()].sort(porGradoYAsignatura)
    })).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  });
}

// Agrega un docente a la lista maestra.
export async function agregarDocente(nombre) {
  nombre = String(nombre || "").trim();
  const clave = claveDocente(nombre);
  if (!clave) throw new Error("Escriba el nombre del docente.");
  const existente = (await obtenerDocentesHorario()).find(d => d.clave === clave);
  if (existente?.enLista) throw new Error(`"${existente.nombre}" ya está en la lista.`);
  invalidarCache();
  await addDoc(collection(db, "docentes"), { nombre });
}

// Guarda en la lista a los docentes que solo aparecen en los horarios.
// Devuelve cuántos agregó.
export async function importarDocentesFaltantes() {
  const faltan = (await obtenerDocentesHorario()).filter(d => !d.enLista);
  invalidarCache();
  await ejecutarEnLotes(faltan.map(d => (batch) =>
    batch.set(doc(collection(db, "docentes")), { nombre: d.nombre })));
  return faltan.length;
}

// Cambia el nombre de un docente en la lista y en todos sus bloques de
// horario. Si la cuenta de usuario tenía exactamente ese nombre, también se
// actualiza (el vínculo usuario ↔ docente es por nombre).
export async function renombrarDocente(clave, nuevoNombre) {
  nuevoNombre = String(nuevoNombre || "").trim();
  const nuevaClave = claveDocente(nuevoNombre);
  if (!nuevaClave) throw new Error("El nombre no puede estar vacío.");
  const docentes = await obtenerDocentesHorario();
  const actual = docentes.find(d => d.clave === clave);
  if (!actual) throw new Error("No se encontró el docente.");
  if (nuevaClave !== clave && docentes.some(d => d.clave === nuevaClave)) {
    throw new Error("Ya existe otro docente con ese nombre.");
  }
  const [snapH, usuarios] = await Promise.all([
    getDocs(collection(db, "horarios")), obtenerUsuarios()
  ]);
  const ops = [];
  for (const d of snapH.docs) {
    if (claveDocente(d.data().docente) === clave) {
      ops.push((batch) => batch.update(d.ref, { docente: nuevoNombre }));
    }
  }
  for (const u of usuarios) {
    if (claveDocente(u.nombre) === clave) {
      ops.push((batch) => batch.update(doc(db, "usuarios", u.id), { nombre: nuevoNombre }));
    }
  }
  const ref = actual.id ? doc(db, "docentes", actual.id) : doc(collection(db, "docentes"));
  ops.push((batch) => batch.set(ref, { nombre: nuevoNombre }));
  invalidarCache();
  await ejecutarEnLotes(ops);
  return ops.length - 1;
}

// Quita un docente de la lista maestra; solo si ya no tiene materias en los
// horarios (si no, volvería a aparecer).
export async function eliminarDocente(id) {
  const d = (await obtenerDocentesHorario()).find(x => x.id === id);
  if (d?.cargas.length) {
    throw new Error(`"${d.nombre}" aún tiene ${d.cargas.length} materia(s) en los horarios.`);
  }
  invalidarCache();
  await deleteDoc(doc(db, "docentes", id));
}

// Docentes del horario con el usuario vinculado por nombre (o null si aún
// no tienen cuenta).
export async function obtenerDocentesConCuenta() {
  const [docentes, usuarios] = await Promise.all([obtenerDocentesHorario(), obtenerUsuarios()]);
  const claves = usuarios.map(u => ({ usuario: u.usuario, clave: claveDocente(u.nombre) }));
  return docentes.map(d => ({
    ...d,
    usuario: claves.find(u => coincideDocente(u.clave, d.clave))?.usuario || null
  }));
}

// Cargas asignadas a mano (colección `cargas`).
export async function obtenerCargasManuales() {
  const snap = await getDocs(collection(db, "cargas"));
  return snap.docs
    .map(d => ({ id: d.id, origen: "manual", ...d.data() }))
    .sort((a, b) => a.docente.localeCompare(b.docente, "es") || porGradoYAsignatura(a, b));
}

// Todas las cargas (vista del admin): las del horario más las manuales que no
// repiten una del horario.
export async function obtenerCargas() {
  const [docentes, manuales] = await Promise.all([obtenerDocentesConCuenta(), obtenerCargasManuales()]);
  const clavePorUsuario = new Map(docentes.filter(d => d.usuario).map(d => [d.usuario, d]));
  const delHorario = docentes.flatMap(d => d.cargas.map(c => ({
    origen: "horario", docente: d.nombre, usuario: d.usuario, ...c
  })));
  const extras = manuales.filter(m => {
    const d = clavePorUsuario.get(m.docente);
    return !d?.cargas.some(c => c.grado === m.grado && c.asignatura === m.asignatura);
  });
  return [...delHorario, ...extras].sort((a, b) =>
    a.docente.localeCompare(b.docente, "es") || porGradoYAsignatura(a, b));
}

// Cargas de un docente: las del horario cuyo docente coincide por nombre con
// el de su usuario, más las manuales.
export async function obtenerCargasDeDocente(usuario) {
  const [u, horario, snap] = await Promise.all([
    getDoc(doc(db, "usuarios", usuario)),
    obtenerDocentesHorario(),
    getDocs(query(collection(db, "cargas"), where("docente", "==", usuario)))
  ]);
  const clave = claveDocente(u.exists() ? u.data().nombre : "");
  const propias = horario.filter(d => coincideDocente(clave, d.clave)).flatMap(d => d.cargas);
  const cargas = propias.map(c => ({ origen: "horario", docente: usuario, ...c }));
  for (const d of snap.docs) {
    const m = d.data();
    if (!cargas.some(c => c.grado === m.grado && c.asignatura === m.asignatura)) {
      cargas.push({ id: d.id, origen: "manual", ...m });
    }
  }
  return cargas.sort(porGradoYAsignatura);
}

export async function agregarCarga(docente, grado, asignatura) {
  const snap = await getDocs(
    query(collection(db, "cargas"), where("docente", "==", docente)));
  if (snap.docs.some(d => d.data().grado === grado && d.data().asignatura === asignatura)) {
    throw new Error("Esa carga ya está asignada a este docente.");
  }
  await addDoc(collection(db, "cargas"), { docente, grado, asignatura });
}

export async function eliminarCarga(id) {
  await deleteDoc(doc(db, "cargas", id));
}

// Crea una cuenta con rol docente por cada docente del horario que aún no
// tiene usuario. Usuario = inicial + último apellido (lmijas); la contraseña
// inicial es igual al usuario y se obliga a cambiarla en el primer ingreso
// (`debeCambiarPassword`). Devuelve las credenciales para entregarlas.
export async function crearCuentasDocentes(claves = null) {
  const docentes = (await obtenerDocentesConCuenta())
    .filter(d => !d.usuario && (!claves || claves.includes(d.clave)));
  const existentes = new Set((await obtenerUsuarios()).map(u => u.usuario));
  const creadas = [];
  for (const d of docentes) {
    const partes = d.clave.split(" ");
    const base = partes.length > 1
      ? partes[0][0] + partes[partes.length - 1] : partes[0];
    let usuario = base, n = 2;
    while (existentes.has(usuario)) usuario = base + n++;
    const password = usuario;
    await agregarUsuario(usuario, password, d.nombre, "docente", "DOCENTE",
      { debeCambiarPassword: true });
    existentes.add(usuario);
    creadas.push({ nombre: d.nombre, usuario, password });
  }
  invalidarCache();
  return creadas;
}

// Asignaturas distintas que aparecen en los horarios (sugerencias para el
// formulario de cargas; se normaliza solo el espaciado).
export async function obtenerAsignaturas() {
  const snap = await getDocs(collection(db, "horarios"));
  const set = new Set(snap.docs.map(d => String(d.data().asignatura || "").trim()).filter(Boolean));
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

export function idNotas(grado, asignatura, periodo, trimestre) {
  return `${grado}_${asignatura}_${periodo}_T${trimestre}`.replace(/\//g, "-");
}

export async function obtenerNotas(grado, asignatura, periodo, trimestre) {
  const snap = await getDoc(
    doc(db, "notas", idNotas(grado, asignatura, periodo, trimestre)));
  return snap.exists() ? snap.data() : null;
}

// Todas las notas de un grado + asignatura + periodo (los 3 trimestres).
export async function obtenerNotasAnuales(grado, asignatura, periodo) {
  const docs = await Promise.all([1, 2, 3].map(t =>
    obtenerNotas(grado, asignatura, periodo, t)));
  return docs;
}

export async function guardarNotas(grado, asignatura, periodo, trimestre, datos, docente) {
  const ref = doc(db, "notas", idNotas(grado, asignatura, periodo, trimestre));
  await setDoc(ref, {
    grado, asignatura, periodo, trimestre,
    nombresInsumos: datos.nombresInsumos,
    notas: datos.notas,
    docente,
    actualizadoEn: serverTimestamp()
  });
  // Read-back: "guardado" significa que quedó en la base, no solo enviado.
  const verif = await getDoc(ref);
  const n = verif.exists() ? Object.keys(verif.data().notas || {}).length : -1;
  if (n !== Object.keys(datos.notas).length) {
    throw new Error(
      "No se pudo confirmar el guardado en la base de datos. " +
      "Revise su conexión e inténtelo de nuevo.");
  }
}

// Promedio ponderado ignorando los componentes sin nota (se renormaliza).
function ponderar(partes) {
  const validas = partes.filter(([v]) => v !== null && Number.isFinite(v));
  const peso = validas.reduce((a, [, p]) => a + p, 0);
  if (!peso) return null;
  return validas.reduce((a, [v, p]) => a + v * p, 0) / peso;
}

function media(valores) {
  const v = (valores || []).filter(x => x !== null && Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

// Promedio del trimestre de un estudiante: { formativas: [...], proyecto, examen }.
export function promedioTrimestre(entrada, pesos) {
  if (!entrada) return null;
  const formativa = media(entrada.formativas);
  const sumativa = ponderar([
    [entrada.proyecto ?? null, pesos.proyecto],
    [entrada.examen ?? null, pesos.examen]
  ]);
  return ponderar([[formativa, pesos.formativa], [sumativa, pesos.sumativa]]);
}

// Promedio final: media de los trimestres que ya tienen promedio.
export function promedioFinal(trimestres) {
  return media(trimestres);
}
