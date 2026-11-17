// Notificaciones tipo "toast" y diálogos de confirmación. No requiere HTML
// previo: los contenedores se crean bajo demanda. Funciona en cualquier página
// que lo importe (app, imprimir, reporte).

const DURACION_OK_MS = 4000;
const DURACION_ERROR_MS = 10000;
const SALIDA_MS = 300;

/* ---------- Anuncio para lectores de pantalla ---------- */

// Regiones vivas que existen desde el primer aviso (un aria-live insertado
// junto con su texto no siempre se anuncia). `ariaNotify()` se usa si el
// navegador lo trae; si no, se escribe en la región viva.
function regionViva(prioridad) {
  const id = `toasts-vivo-${prioridad}`;
  let r = document.getElementById(id);
  if (!r) {
    r = document.createElement("div");
    r.id = id;
    r.className = "solo-lector";
    r.setAttribute("aria-live", prioridad === "alta" ? "assertive" : "polite");
    r.setAttribute("aria-atomic", "true");
    document.body.appendChild(r);
  }
  return r;
}

function anunciar(texto, prioridad) {
  if (typeof document.ariaNotify === "function") {
    document.ariaNotify(texto, { priority: prioridad === "alta" ? "high" : "normal" });
    return;
  }
  const r = regionViva(prioridad);
  r.textContent = "";
  // Se escribe en el siguiente cuadro para que repetir el mismo texto se anuncie.
  requestAnimationFrame(() => { r.textContent = texto; });
}

/* ---------- Toasts ---------- */

function contenedorToasts() {
  let c = document.getElementById("toasts");
  if (!c) {
    c = document.createElement("div");
    c.id = "toasts";
    c.setAttribute("role", "region");
    c.setAttribute("aria-label", "Notificaciones");
    c.setAttribute("popover", "manual");
    document.body.appendChild(c);
  }
  // En la capa superior, el último en mostrarse queda encima: se vuelve a
  // abrir para que el aviso no quede detrás de un <dialog> modal ya abierto.
  if (typeof c.showPopover === "function") {
    try {
      if (c.matches(":popover-open")) c.hidePopover();
      c.showPopover();
    } catch { /* sin soporte: queda como capa fija normal */ }
  }
  return c;
}

// Crea el toast con su botón de cerrar. `duracionMs` null = no se cierra solo.
// Mientras el foco esté dentro del toast no se cierra por tiempo.
function crearToast(clase, texto, { duracionMs = null, boton = null } = {}) {
  const toast = document.createElement("div");
  toast.className = `toast ${clase}`;

  const mensaje = document.createElement("span");
  mensaje.className = "toast-texto";
  mensaje.textContent = texto;
  toast.appendChild(mensaje);

  if (boton) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "toast-boton";
    b.textContent = boton.texto;
    b.addEventListener("click", boton.accion);
    toast.appendChild(b);
  }

  let temporizador = null;
  const cerrar = () => {
    clearTimeout(temporizador);
    if (!toast.isConnected) return;
    // Si el foco estaba en este toast, pasa al siguiente (o al anterior).
    if (toast.contains(document.activeElement)) {
      const otro = toast.nextElementSibling ?? toast.previousElementSibling;
      otro?.querySelector("button")?.focus();
    }
    toast.classList.add("saliendo");
    setTimeout(() => toast.remove(), SALIDA_MS);
  };
  const programar = () => {
    if (duracionMs) temporizador = setTimeout(cerrar, duracionMs);
  };

  const x = document.createElement("button");
  x.type = "button";
  x.className = "toast-cerrar";
  x.setAttribute("aria-label", "Cerrar notificación");
  x.textContent = "×";
  x.addEventListener("click", cerrar);
  toast.appendChild(x);

  toast.addEventListener("focusin", () => clearTimeout(temporizador));
  toast.addEventListener("focusout", () => { clearTimeout(temporizador); programar(); });

  contenedorToasts().appendChild(toast);
  programar();
  return toast;
}

// Confirmación de operación exitosa (verde, ~4 s).
export function notificarOk(texto) {
  crearToast("toast-ok", texto, { duracionMs: DURACION_OK_MS });
  anunciar(texto, "normal");
}

// Aviso de error (rojo, ~10 s o hasta cerrarlo). Registra el detalle en
// consola y muestra el mensaje de la excepción si se proporciona.
export function notificarError(texto, err) {
  if (err) console.error(err);
  const detalle = err?.message ? ` — ${err.message}` : "";
  crearToast("toast-error", texto + detalle, { duracionMs: DURACION_ERROR_MS });
  anunciar(texto + detalle, "alta");
}

// Aviso con acción (azul), p. ej. "hay una versión nueva → Recargar". No se
// cierra solo: espera a que el usuario pulse el botón o lo descarte, para no
// interrumpir lo que esté haciendo (una nómina a medio llenar).
export function notificarAccion(texto, textoBoton, accion) {
  crearToast("toast-aviso", texto, { boton: { texto: textoBoton, accion } });
  anunciar(`${texto} Hay acciones disponibles.`, "normal");
}

/* ---------- Diálogos modales ---------- */

const fueraDelDialogo = (e, dialogo) => {
  const r = dialogo.getBoundingClientRect();
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
};

// Abre un <dialog> como modal y devuelve su `returnValue` al cerrarse ("" si
// se descartó con Esc o haciendo clic fuera). El navegador se encarga del
// foco, de dejar inerte la página, de Esc y de devolver el foco al botón que
// lo abrió. Con `closedby="any"` el clic fuera cierra; en Safari (sin
// `closedby`) se emula igual.
export function mostrarDialogo(dialogo) {
  return new Promise((resolve) => {
    document.body.appendChild(dialogo);
    dialogo.addEventListener("close", () => {
      const valor = dialogo.returnValue;
      dialogo.returnValue = "";
      dialogo.remove();
      resolve(valor);
    }, { once: true });

    if (dialogo.getAttribute("closedby") === "any" && !("closedBy" in HTMLDialogElement.prototype)) {
      // Se exige pulsar y soltar fuera: arrastrar para seleccionar texto
      // y terminar sobre el fondo no debe cerrarlo.
      let pulsoFuera = false;
      dialogo.addEventListener("pointerdown", (e) => { pulsoFuera = fueraDelDialogo(e, dialogo); });
      dialogo.addEventListener("pointerup", (e) => {
        if (pulsoFuera && fueraDelDialogo(e, dialogo)) dialogo.close();
      });
    }
    dialogo.showModal();
  });
}

let contadorDialogos = 0;

// Modal de confirmación: reemplaza el confirm() nativo del navegador por un
// diálogo con el mismo estilo visual que el resto de la plataforma. Acepta
// mensajes con saltos de línea (\n). Devuelve una Promise<boolean> — true si
// el usuario confirma, false si cancela, cierra con Escape o hace clic fuera.
export function confirmarAccion(mensaje, opciones = {}) {
  const { textoConfirmar = "Confirmar", textoCancelar = "Cancelar", peligro = false } = opciones;

  const dialogo = document.createElement("dialog");
  dialogo.className = "modal-confirmar";
  dialogo.setAttribute("closedby", "any");
  const idMensaje = `modal-mensaje-${++contadorDialogos}`;
  dialogo.setAttribute("aria-labelledby", idMensaje);
  dialogo.innerHTML = `
    <form method="dialog">
      <p class="modal-mensaje" id="${idMensaje}"></p>
      <div class="modal-acciones">
        <button type="submit" value="cancelar" class="secundario"></button>
        <button type="submit" value="ok" class="${peligro ? "peligro" : "primario"}"></button>
      </div>
    </form>`;
  dialogo.querySelector(".modal-mensaje").textContent = mensaje;
  const [btnCancelar, btnConfirmar] = dialogo.querySelectorAll("button");
  btnCancelar.textContent = textoCancelar;
  btnConfirmar.textContent = textoConfirmar;
  // En una acción destructiva el foco empieza en la opción segura.
  (peligro ? btnCancelar : btnConfirmar).setAttribute("autofocus", "");

  return mostrarDialogo(dialogo).then((valor) => valor === "ok");
}
