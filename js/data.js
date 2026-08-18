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
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dia}`;
}

export async function obtenerGrados() {
  const snap = await getDocs(collection(db, "tutores"));
  return snap.docs.map(d => d.id).sort();
}

export async function obtenerTutor(grado) {
  const snap = await getDoc(doc(db, "tutores", grado));
  return snap.exists() ? snap.data() : null;
}

export async function obtenerEstudiantes(grado) {
  // Sin orderBy en la query: where + orderBy exigiría un índice compuesto.
  // Se ordena en el cliente (localeCompare ordena bien tildes y Ñ).
  const q = query(
    collection(db, "estudiantes"),
    where("grado", "==", grado)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
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
  await setDoc(doc(db, "asistencias", idAsistencia(grado, fecha)), {
    grado,
    fecha,
    registros,
    observaciones,
    registradoPor,
    actualizadoEn: serverTimestamp()
  });
}

/* ---------- Gestión de estudiantes (admin) ---------- */

export async function obtenerTodosLosEstudiantes() {
  const snap = await getDocs(collection(db, "estudiantes"));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export async function agregarEstudiante(nombre, grado) {
  await addDoc(collection(db, "estudiantes"), { numId: null, nombre, grado });
}

// Sirve para editar el nombre y para mover de grado (el id no cambia,
// por lo que el historial de asistencia se conserva).
export async function actualizarEstudiante(id, datos) {
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
  await setDoc(ref, { grado, seccion, tutor });
}

export async function actualizarGrado(grado, datos) {
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
  return conteos;
}

/* ---------- Historial de asistencia (dashboard y ficha de estudiante) ---------- */

export async function obtenerTodasLasAsistencias() {
  const snap = await getDocs(collection(db, "asistencias"));
  return snap.docs.map(d => d.data());
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
export function resumenEstudiante(entrada) {
  if (!entrada) {
    return { diasRegistrados: 0, diasAsistidos: 0, porcentaje: null,
             I: 0, J: 0, A: 0, P: 0 };
  }
  const diasRegistrados = Object.keys(entrada.dias).length;
  const diasAsistidos = Object.values(entrada.dias)
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

// Resumen por estudiante dentro de [desde, hasta] (fechas "YYYY-MM-DD").
// Devuelve { estudianteId: {P,I,J,A,N, diasRegistrados, diasAsistidos, porcentaje} }
export function resumenEnRango(asistencias, desde, hasta) {
  const enRango = asistencias.filter(a => a.fecha >= desde && a.fecha <= hasta);
  return indicePorEstudiante(enRango);
}

// indicePorEstudiante + resumenEstudiante ya cubren los conteos del rango.

/* ---------- Alertas de inasistencia ---------- */

// Días injustificados "puros" seguidos (racha final): días con al menos una
// marca I y ninguna P/A. Devuelve la longitud de la racha más reciente.
export function rachaInjustificadas(entrada) {
  if (!entrada) return 0;
  const fechas = Object.keys(entrada.dias).sort();
  let racha = 0;
  for (let i = fechas.length - 1; i >= 0; i--) {
    const cods = entrada.dias[fechas[i]];
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

export async function agregarUsuario(usuario, password, nombre, rol) {
  const ref = doc(db, "usuarios", usuario);
  if ((await getDoc(ref)).exists()) {
    throw new Error(`El usuario "${usuario}" ya existe.`);
  }
  await setDoc(ref, { usuario, password, nombre, rol });
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
  cargoSubinspector: "SUB-INSPECTOR V (e)"
};

export async function obtenerConfig() {
  const snap = await getDoc(doc(db, "config", CONFIG_DOC));
  return snap.exists() ? { ...CONFIG_DEFECTO, ...snap.data() } : { ...CONFIG_DEFECTO };
}

export async function guardarConfig(datos) {
  await setDoc(doc(db, "config", CONFIG_DOC), datos, { merge: true });
}
