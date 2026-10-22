# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

Web estática (HTML + módulos ES, sin build, sin package.json, sin tests ni linter) para registrar e imprimir la asistencia de la sección vespertina de la UE "Arutam". Se aloja en GitHub Pages (rama `main`, raíz) y usa Firebase Firestore (proyecto `uem-arutam`; el id es del nombre anterior de la institución, no cambiarlo). Todo el texto de UI y los comentarios van en español. El README tiene el detalle funcional de cada módulo.

## Comandos

- Servir en local (los módulos ES no andan con `file://`): `python -m http.server 8080` y abrir `http://localhost:8080/`.
- Desplegar: `git push origin main` (GitHub Pages publica solo). Las reglas de Firestore, solo si cambian: `firebase deploy --only firestore:rules --project uem-arutam`.
- Regenerar `seed/*.json` desde los Excel de `DOC/`: `python scripts/extraer_excel.py` (requiere `openpyxl`). `seed/seed.html` carga esos JSON a Firestore.

## Arquitectura

- **Shell + módulos**: `app.html` carga `js/app.js`, que exige sesión y define `MODULOS`. Cada módulo `js/mod-*.js` exporta `initX(contenedor, ctx)` y pinta su propia sección. `ctx` trae `sesion`, `esAdmin`, `irA(modulo, params)` y `params`. Para añadir un módulo: archivo nuevo, entrada en `MODULOS` y botón `data-modulo` en el menú de `app.html`; si hay que cachearlo, también va en `ESTATICOS` de `sw.js`.
- **Acceso a datos**: todo pasa por `js/data.js` (único lugar que habla con Firestore; las consultas evitan `where`+`orderBy` para no exigir índices compuestos). Tiene una caché en memoria con TTL de 2 min que se invalida en cada escritura. Usa `esc()` al interpolar texto en HTML: los grados llevan comillas (`8vo EGB "A"`).
- **Auth propia**: `js/auth.js` compara usuario/contraseña (texto plano) contra la colección `usuarios`; la sesión va en `sessionStorage`. Las reglas de Firestore están abiertas a propósito (limitación conocida, ver README). El rol `admin` edita; los demás solo consultan y registran asistencia.
- **Impresión y offline**: `imprimir.html`, `imprimir-lote.html` y `reporte.html` son páginas aparte con `css/print.css`. `js/offline.js` precarga en la caché persistente de Firestore los datos que esas páginas necesitan para imprimir sin internet; **debe ejecutar exactamente las mismas consultas** que `imprimir.js` y `reporte.js`, porque Firestore cachea por consulta. Si cambias una consulta en un lado, cámbiala en el otro.
- **Service worker (`sw.js`)**: los archivos propios van "red primero" (con 4 s de espera y caída a caché); los scripts de `gstatic.com` van "caché primero". El tráfico de Firestore no pasa por él.
- **PWA**: `manifest.webmanifest` + `icons/`; en ≤820px la barra lateral se vuelve menú deslizable (`.barra-movil`, `abrirMenu/cerrarMenu` en `app.js`).

## Convenciones del repo

- Cada cambio sube `js/version.js` (única fuente de la versión), agrega su entrada en `CHANGELOG.md`, y se etiqueta con `git tag vX.Y.Z` (semver).
- Si agregas o renombras archivos estáticos, actualiza `ESTATICOS` y sube `CACHE` (`uem-arutam-vN`) en `sw.js`; si no, los clientes conservan la copia vieja.
- Códigos de asistencia: `P` presente, `I` injustificado, `J` justificado, `A` atraso, `N` no hay clases.
- `graphify-out/` está ignorado por git (salida de una herramienta de análisis, no es parte de la app).
