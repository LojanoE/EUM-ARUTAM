// Capa de acceso a datos Firestore.
import {
  collection, doc, getDoc, getDocs, query, setDoc, where, orderBy, serverTimestamp
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

export async function obtenerGrados() {
  const snap = await getDocs(collection(db, "tutores"));
  return snap.docs.map(d => d.id).sort();
}

export async function obtenerTutor(grado) {
  const snap = await getDoc(doc(db, "tutores", grado));
  return snap.exists() ? snap.data() : null;
}

export async function obtenerEstudiantes(grado) {
  const q = query(
    collection(db, "estudiantes"),
    where("grado", "==", grado),
    orderBy("nombre")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
