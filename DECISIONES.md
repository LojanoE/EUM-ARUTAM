# Registro de cambios importantes y decisiones

Bitácora de lo que se decidió y por qué. Complementa a `CHANGELOG.md` (que lista
versiones): aquí se anota el **motivo**, lo que se acordó con la institución y
los pendientes. Las entradas más recientes van arriba.

---

## 2026-10-27 · v1.21.0 — Libreta de calificaciones para el representante
- Pedido: ver las notas por estudiante y poder entregarlas al padre de familia en PDF.
- Acceso: admin y cualquier docente que da clases en el grado; ve todas las materias.
  La restricción es solo de interfaz (reglas de Firestore abiertas, igual que Notas).
- PDF con `html2pdf.js` 0.10.1 desde cdnjs (se carga al pulsar el botón); el service
  worker lo trata «caché primero». «Compartir» usa la hoja de compartir del sistema,
  solo donde el navegador la soporta.
- No hay contacto del representante: se elige el destinatario al compartir.
- La asistencia es el total registrado (no hay fechas de trimestre en la config).
- Posible mejora: precargar los datos de la libreta en `offline.js` para generarla sin internet.

## 2026-10-27 · v1.20.0 — Contraseña inicial = usuario y cambio al ingresar
- Pedido: en vez de contraseñas aleatorias, usuario y contraseña iguales para las
  cuentas nuevas, y que cada persona pueda cambiarla al ingresar y después.
- Las cuentas creadas desde Docentes llevan `debeCambiarPassword: true`; mientras
  esté activo, `exigirSesion` manda a `index.html?cambiar=1` y no deja entrar a la app.
- La nueva contraseña: mínimo 4 caracteres, distinta de la actual y del usuario.
- «Cambiar contraseña» en el menú sirve para todos los roles (cambio voluntario).
- Una contraseña puesta por el admin en Usuarios también activa el cambio
  obligatorio: sirve para restablecer cuentas olvidadas (`usuario`/`usuario`).
- Las cuentas ya existentes (ej. `afernandez`) no se tocaron.
- Sigue en texto plano (ver pendientes).

## 2026-10-27 · Insumos de notas por docente (aclaración, sin cambio de código)
- Cada docente decide cuántos insumos usa con los botones **+ Insumo / − Insumo**
  de Notas, y puede renombrar cada columna. Por defecto empieza con 2.
- Se guarda por grado + materia + trimestre: cada docente (y cada materia) tiene
  sus propios insumos, y un trimestre puede tener distinta cantidad que otro.
- El promedio no cambia: los insumos se promedian como nota formativa.
- Los botones solo aparecen si el trimestre es editable (docente: solo el
  trimestre abierto; admin: cualquiera).
- Posible mejora pendiente: cambiar el valor inicial (ej. 4) o poner un máximo.

## 2026-10-27 · v1.19.1 — La app no cargaba tras la 1.19.0
- Error: `Cannot set properties of null (setting 'hidden')` en `mostrarModulo`.
- Causa: se añadió el módulo Docentes a `MODULOS` y al menú, pero faltaba
  `<section id="seccion-docentes">` en `app.html`.
- Arreglo: se añadió la sección y `app.js` ya no se detiene si falta alguna.
  `CACHE` de `sw.js` pasó a `uem-arutam-v10`.
- **Regla para el futuro:** un módulo nuevo necesita 4 cosas: entrada en
  `MODULOS`, botón en el menú, `<section id="seccion-X">` en `app.html` y, si se
  cachea, entrada en `ESTATICOS` de `sw.js`.

## 2026-10-27 · v1.19.0 — Lista maestra de docentes
- Pedido: una lista de docentes para que al cambiar un nombre se actualice en
  todo, y elegir al docente de una lista en vez de escribirlo.
- Decisiones: lista maestra completa y para ambas secciones (matutina y vespertina).
- Módulo **Docentes** (solo admin): agregar, editar, eliminar, importar los que
  solo están en horarios y crear cuentas de los seleccionados.
- Renombrar un docente actualiza todos los bloques de `horarios` y la cuenta del
  usuario si su nombre era exactamente el mismo.
- En **Horarios** el docente se elige de un `<select>`.
- Cargas ya no tiene el panel de docentes ni de credenciales.
- Primera vez: pulsar «Importar los que faltan» en Docentes.

## 2026-10-27 · v1.18.1 — Vínculo usuario ↔ docente más tolerante
- El vínculo es por nombre normalizado (`claveDocente`: sin tildes, minúsculas,
  sin títulos). Ahora también coincide si el nombre del usuario es más largo
  (ej. «Albita Narcisa Sozoranga Morocho» ↔ «Narcisa Sozoranga»).
- Casos aclarados por la institución: Mariela Maza y Mariela Loja son personas
  distintas; Paúl Loarte usa el usuario `djima`; Diego Fima es otra persona.
  El nombre del docente se cambió pero no el usuario.

## 2026-10-27 · v1.18.0 — Cargas docentes desde los horarios
- Las cargas (grado + materia de cada docente) salen de los **horarios**, no se
  asignan a mano. Las cargas manuales se mantienen solo para reemplazos.
- Botón para crear de una vez las cuentas de los docentes, con lista de
  credenciales imprimible.
- Se corrigieron en Firestore de producción 11 bloques de horario con nombres mal escritos.

## 2026-10-27 · v1.17.0 — Rol docente y módulo de Notas
- Los profesores entran con rol `docente` y llenan las notas de sus materias.
- Escala MINEDUC de 0 a 10 por **trimestres**; insumos formativos + proyecto +
  examen, con promedio automático.
- El admin define el trimestre abierto; el docente solo edita ese.
- Solo notas de sus propias materias.

## 2026-10 · v1.16.0 — Alojado también en Firebase Hosting
- URL: https://uem-arutam.web.app (además de GitHub Pages).
- Despliegue: `firebase deploy --only hosting --project uem-arutam`.

---

## Pendientes y deuda conocida
- **Seguridad:** las reglas de Firestore están abiertas y las contraseñas están en
  texto plano. Pendiente migrar a Firebase Auth y cerrar las reglas.
- Renombrar el usuario `djima` (de Paúl Loarte) si se quiere ordenar.
- Confirmar que `admin` corresponde a Narcisa Sozoranga.
- Crear las cuentas reales de los docentes desde el módulo Docentes.
- Publicar: `git push origin main` y `git push --tags`, luego el deploy de Hosting.
