// Login sencillo contra la colección `usuarios` de Firestore (sin Firebase Auth).
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase-config.js";

const SESION_KEY = "uem_arutam_sesion";

export async function login(usuario, password) {
  const q = query(collection(db, "usuarios"), where("usuario", "==", usuario.trim()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const datos = doc.data();
  if (datos.password !== password) return null;
  const sesion = { usuario: datos.usuario, nombre: datos.nombre, rol: datos.rol };
  sessionStorage.setItem(SESION_KEY, JSON.stringify(sesion));
  return sesion;
}

export function sesionActual() {
  const crudo = sessionStorage.getItem(SESION_KEY);
  return crudo ? JSON.parse(crudo) : null;
}

export function cerrarSesion() {
  sessionStorage.removeItem(SESION_KEY);
}

// Guardia: si no hay sesión, redirige al login. Devuelve la sesión.
export function exigirSesion() {
  const sesion = sesionActual();
  if (!sesion) {
    const base = location.pathname.replace(/[^/]*$/, "");
    location.href = base + "index.html";
    return null;
  }
  return sesion;
}
