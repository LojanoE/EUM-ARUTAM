// Capa de acceso a datos Firestore.
import {
  collection, doc, getDoc, getDocs, query, setDoc, where, serverTimestamp,
  addDoc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase-config.js";

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

export async function guardarAsistencia(grado, fecha, registros, registradoPor) {
  await setDoc(doc(db, "asistencias", idAsistencia(grado, fecha)), {
    grado,
    fecha,
    registros,
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
      const codigosDia = [];
      for (const [hora, codigo] of Object.entries(marcasHora)) {
        if (e.marcas[codigo] !== undefined) e.marcas[codigo]++;
        codigosDia.push(codigo);
        if (codigo === "I" || codigo === "J" || codigo === "A") {
          e.faltas.push({
            fecha: a.fecha,
            hora: Number(hora),
            codigo,
            grado: a.grado
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
