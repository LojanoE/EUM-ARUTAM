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

// Modal de confirmación: reemplaza el confirm() nativo del navegador por un
// diálogo con el mismo estilo visual que el resto de la plataforma. Acepta
// mensajes con saltos de línea (\n). Devuelve una Promise<boolean> — true si
// el usuario confirma, false si cancela, cierra con Escape o hace clic fuera.
export function confirmarAccion(mensaje, opciones = {}) {
  const { textoConfirmar = "Confirmar", textoCancelar = "Cancelar", peligro = false } = opciones;
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-confirmar" role="alertdialog" aria-modal="true">
        <p class="modal-mensaje"></p>
        <div class="modal-acciones">
          <button type="button" class="secundario" data-modal-cancelar>${textoCancelar}</button>
          <button type="button" class="${peligro ? "peligro" : "primario"}" data-modal-confirmar>${textoConfirmar}</button>
        </div>
      </div>`;
    overlay.querySelector(".modal-mensaje").textContent = mensaje;
    document.body.appendChild(overlay);

    function cerrar(resultado) {
      document.removeEventListener("keydown", alTeclado);
      overlay.remove();
      resolve(resultado);
    }
    function alTeclado(e) {
      if (e.key === "Escape") cerrar(false);
    }

    overlay.querySelector("[data-modal-confirmar]").addEventListener("click", () => cerrar(true));
    overlay.querySelector("[data-modal-cancelar]").addEventListener("click", () => cerrar(false));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) cerrar(false); });
    document.addEventListener("keydown", alTeclado);
    overlay.querySelector("[data-modal-confirmar]").focus();
  });
}
