// Notificaciones tipo "toast": avisos flotantes en la esquina inferior
// derecha para confirmar operaciones y avisar errores. No requiere HTML
// previo: el contenedor se crea bajo demanda. Funciona en cualquier página
// que lo importe (app, imprimir, reporte).

const DURACION_OK_MS = 4000;
const DURACION_ERROR_MS = 10000;

function contenedorToasts() {
  let c = document.getElementById("toasts");
  if (!c) {
    c = document.createElement("div");
    c.id = "toasts";
    document.body.appendChild(c);
  }
  return c;
}

function mostrar(texto, clase, duracionMs) {
  const toast = document.createElement("div");
  toast.className = `toast ${clase}`;
  toast.textContent = texto;
  const cerrar = () => {
    toast.classList.add("saliendo");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  };
  toast.addEventListener("click", cerrar);
  contenedorToasts().appendChild(toast);
  setTimeout(cerrar, duracionMs);
}

// Confirmación de operación exitosa (verde, ~4 s).
export function notificarOk(texto) {
  mostrar(texto, "toast-ok", DURACION_OK_MS);
}

// Aviso de error (rojo, ~10 s o hasta hacer clic). Registra el detalle en
// consola y muestra el mensaje de la excepción si se proporciona.
export function notificarError(texto, err) {
  if (err) console.error(err);
  const detalle = err?.message ? ` — ${err.message}` : "";
  mostrar(texto + detalle, "toast-error", DURACION_ERROR_MS);
}
