// Módulo: himnos de la institución, para reproducirlos en actos o en clase.
// Los videos están en YouTube, así que necesitan internet (no se cachean).
import { esc } from "./data.js";

// `vertical` marca los Shorts, que se muestran en formato 9:16.
const HIMNOS = [
  { titulo: "Himno de la Institución", id: "tS15bJrMV_8", vertical: false },
  { titulo: "Himno (versión corta)",   id: "Ut2vbZkuJYE", vertical: true },
];

export async function initHimnos(contenedor) {
  contenedor.innerHTML = `
    <h2 class="titulo-modulo">Himnos</h2>
    <p class="info">Se necesita conexión a internet para reproducirlos.</p>
    <div class="himnos-grid">
      ${HIMNOS.map(h => `
        <div class="panel">
          <h3>${esc(h.titulo)}</h3>
          <iframe class="himno-video${h.vertical ? " vertical" : ""}"
            src="https://www.youtube-nocookie.com/embed/${esc(h.id)}?rel=0"
            title="${esc(h.titulo)}" loading="lazy"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowfullscreen></iframe>
          <a class="himno-enlace" target="_blank" rel="noopener"
            href="https://www.youtube.com/watch?v=${esc(h.id)}">Abrir en YouTube</a>
        </div>`).join("")}
    </div>`;
}
