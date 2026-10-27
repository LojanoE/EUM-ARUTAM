// Preferencias de pantalla (tamaño de letra y alto contraste).
// Se guardan en el dispositivo, no en Firestore: es una comodidad de cada equipo.
const CLAVE = "arutam-pref";
const LETRAS = ["normal", "grande", "enorme"];

export function leerPreferencias() {
  try {
    const p = JSON.parse(localStorage.getItem(CLAVE) || "{}");
    return {
      letra: LETRAS.includes(p.letra) ? p.letra : "normal",
      contraste: p.contraste === "alto" ? "alto" : "normal",
    };
  } catch {
    return { letra: "normal", contraste: "normal" };
  }
}

export function guardarPreferencias(pref) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(pref));
  } catch { /* sin almacenamiento: la preferencia vale solo en esta visita */ }
}

// Pone o quita los atributos que usa styles.css.
export function aplicarPreferencias(pref) {
  const raiz = document.documentElement;
  if (pref.letra && pref.letra !== "normal") raiz.dataset.letra = pref.letra;
  else delete raiz.dataset.letra;
  if (pref.contraste === "alto") raiz.dataset.contraste = "alto";
  else delete raiz.dataset.contraste;
}
