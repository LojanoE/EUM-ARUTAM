// Login sencillo contra la colección `usuarios` de Firestore (sin Firebase Auth).
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase-config.js";

const SESION_KEY = "uem_arutam_sesion";

export async function login(usuario, password) {
  const q = query(collection(db, "usuarios"), where("usuario", "==", usuario.trim()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const datos = doc.data();
  if (datos.password !== password) return null;
  const sesion = {
    usuario: datos.usuario, nombre: datos.nombre, rol: datos.rol,
    debeCambiarPassword: datos.debeCambiarPassword === true,
  };
  sessionStorage.setItem(SESION_KEY, JSON.stringify(sesion));
  return sesion;
}

// Cambia la contraseña del usuario de la sesión vigente. Lanza Error con un
// mensaje para mostrar si algo no cumple.
export async function cambiarPassword(actual, nueva) {
  const sesion = sesionActual();
  if (!sesion) throw new Error("No hay sesión activa.");
  if (nueva.length < 4) throw new Error("La nueva contraseña debe tener al menos 4 caracteres.");
  if (nueva === sesion.usuario) throw new Error("La nueva contraseña no puede ser igual al usuario.");
  const ref = doc(db, "usuarios", sesion.usuario);
  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data().password !== actual) {
    throw new Error("La contraseña actual no es correcta.");
  }
  if (nueva === actual) throw new Error("La nueva contraseña debe ser distinta de la actual.");
  await updateDoc(ref, { password: nueva, debeCambiarPassword: false });
  sesion.debeCambiarPassword = false;
  sessionStorage.setItem(SESION_KEY, JSON.stringify(sesion));
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
  // Contraseña inicial sin cambiar: no se puede entrar a la app.
  if (sesion.debeCambiarPassword) {
    const base = location.pathname.replace(/[^/]*$/, "");
    location.href = base + "index.html?cambiar=1";
    return null;
  }
  return sesion;
}
