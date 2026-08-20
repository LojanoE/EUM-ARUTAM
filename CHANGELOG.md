# Changelog

Historial de versiones de la app de Registro de Asistencia — UEM "Arutam".
Versionado semántico: MAYOR.MENOR.PARCHE. La versión vigente está en
`js/version.js` y cada versión tiene su tag de git (`vX.Y.Z`).

## [1.8.0] — 2026-08-20

### Agregado
- **Modal de confirmación propio** (`js/notificaciones.js`, `confirmarAccion()`):
  reemplaza los `confirm()` nativos del navegador en los 8 puntos donde se usaban
  (eliminar/renombrar grado, eliminar usuario, quitar bloque de horario, mover
  y retirar/reincorporar estudiante, descartar cambios sin guardar, guardar con
  marcas incompletas). Mismo estilo visual que los toasts; se cierra con Escape
  o clic fuera, y marca en rojo las acciones destructivas.
- **Indicador de carga en el registro de asistencia**: al cargar grado/fecha se
  deshabilitan los controles y se muestra "Cargando nómina…" mientras se leen
  estudiantes, horario y asistencia previa de Firestore; antes la pantalla
  parecía congelada en conexiones lentas. Los errores de carga ahora se avisan
  con un mensaje específico en vez de depender solo de la red de seguridad global.
- **Atajos de teclado en la nómina de asistencia**: con el foco en una celda,
  teclear P/I/J/A/N marca el código sin abrir el desplegable y avanza a la
  siguiente celda; las flechas mueven el foco entre horas (izq/der) y
  estudiantes (arriba/abajo). Pensado para cargar la asistencia completa del
  grado sin soltar el teclado.
- **Columnas Nº y Nombre fijas** en la tabla de asistencia al hacer scroll
  horizontal por las horas, y marcas más compactas en pantallas angostas
  (`css/styles.css`) — para no perder de vista a qué estudiante se le está
  marcando en tablets/celulares.

## [1.7.0] — 2026-08-18

### Agregado
- **Notificaciones visuales (toasts)** en toda la plataforma: aviso verde al
  guardar correctamente y aviso rojo con el detalle cuando ocurre un error
  (`js/notificaciones.js`). Reemplazan los `alert()` de error y confirman las
  acciones que antes no avisaban nada.
- **Verificación real del guardado de asistencia**: tras escribir en
  Firestore se relee el documento y se comprueba que quedó completo; el aviso
  verde significa "está en la base", no solo "se envió".
- **Red de seguridad global** (`js/app.js`): cualquier error o promesa fallida
  sin capturar se muestra como notificación roja en vez de pasar en silencio.

### Corregido
- Los módulos **Horarios** (agregar/editar/quitar bloque) y **Estudiantes**
  (agregar, editar/mover, retirar/reincorporar) no tenían `try/catch`: un
  fallo de red o de reglas pasaba inadvertido. Ahora avisan y confirman.

## [1.6.0] — 2026-08-18

### Agregado
- **Feriados y suspensiones**: lista de fechas sin clases editable desde el
  módulo Usuarios (solo admin, colección `config`). Esos días no se pueden
  registrar (el módulo Asistencia lo avisa) y no computan en los porcentajes.
- **Estudiantes retirados**: el admin puede retirar y reincorporar estudiantes
  desde el módulo Estudiantes. Un retirado desaparece de la nómina diaria, del
  dashboard y de las alertas, pero conserva todo su historial; el reporte por
  rango lo incluye si tuvo registros dentro del período (marcado como
  "(retirado)").
- **Atajo "Toda la fila"** en el registro diario: un selector por estudiante
  marca todas sus horas con el mismo código (útil para faltas de día completo).
- **Aviso de cambios sin guardar** en el registro diario: al cambiar de grado
  o fecha, o al cerrar la página, se pide confirmación para no perder marcas.

### Cambiado
- El Dashboard ahora analiza solo los **últimos 90 días** de asistencia
  (alertas y ranking), en vez de descargar toda la colección en cada visita.
- Caché en memoria (2 min) de grados, estudiantes y asistencias: cambiar de
  módulo ya no re-descarga todo de Firestore. Se invalida en cada escritura.
- Los días con solo marcas "N" (no hay clases) ya no inflan los "días
  registrados" ni cortan las rachas de injustificadas.
- Botón "Guardar asistencia" muestra "Guardando…" y se deshabilita mientras
  guarda (evita dobles envíos).

### Corregido
- Eliminada la función sin uso `resumenEnRango` y el campo muerto `numId: null`
  al agregar estudiantes desde la app.
- `graphify-out/` (carpeta de análisis, ajena a la app) queda en `.gitignore`.

## [1.5.0] — 2026-08-17

### Cambiado
- **La firma de los documentos impresos la pone el usuario que los genera**:
  cada usuario ahora tiene campo `cargo`, y el reporte diario y el reporte
  por rango firman con su nombre y cargo. Si un usuario no tiene cargo, se
  usa como respaldo la firma global ya configurada.
- El módulo Usuarios queda consolidado: se eliminó el panel aparte de
  "firma en documentos" y el cargo se edita junto con cada usuario.

## [1.4.0] — 2026-08-17

### Agregado
- **Registro rápido de asistencia**: al abrir un día sin registro previo,
  toda la nómina se prellena con `P` (presente); solo se cambian las
  excepciones. Si el día ya tiene registro, se cargan las marcas guardadas.
- **Observación por estudiante**: columna opcional en la nómina para anotar
  el motivo de una falta (I/J) o atraso. Se guarda en el documento de
  asistencia (`observaciones`) y se muestra en la ficha del estudiante
  (historial) y en la línea OBSERVACIONES del reporte diario impreso.

## [1.3.0] — 2026-08-17

### Agregado
- **Reporte por rango de fechas** (`reporte.html`): consolidado de asistencia
  por estudiante (P/I/J/A, días asistidos, % asistencia) entre dos fechas,
  imprimible y exportable a CSV. Se abre desde el módulo Asistencia.
- **Alertas de inasistencia** en el Dashboard: estudiantes con 3+ días
  injustificados seguidos o menos del 80% de asistencia.
- **Módulo Usuarios** (solo admin): crear, editar (nombre, rol, contraseña)
  y eliminar cuentas. No permite eliminar la cuenta en uso ni dejar el
  sistema sin administradores.
- **Firma configurable en documentos**: el nombre y cargo del subinspector
  se editan desde el módulo Usuarios (colección `config`) y salen en el
  reporte diario y en el reporte por rango.

### Cambiado
- Los reportes impresos ahora salen en **una página A4 vertical** (antes
  horizontal), con tipografía y márgenes compactos.

## [1.2.0] — 2026-08-17

### Agregado
- Nuevo módulo **Grados** (solo administradores): agregar grados, editar
  sección y tutor, renombrar y eliminar.
- Renombrar un grado actualiza en cascada sus estudiantes, sus bloques de
  horario y todo su historial de asistencia (incluidas las claves de las
  marcas), por lotes para no exceder el límite de Firestore.
- Eliminar un grado solo es posible cuando no tiene estudiantes; borra su
  horario y sus registros de asistencia previa confirmación.

## [1.1.1] — 2026-08-17

### Corregido
- Los nombres de grado llevan comillas (`8vo EGB "A"`) y se insertaban sin
  escapar en el HTML: truncaban los `value` de los selectores (los módulos
  Horarios y Asistencia salían vacíos) y los atributos `data-id` (el botón
  "Editar / Mover" de Estudiantes lanzaba `Cannot read properties of
  undefined`). Se agregó el helper `esc()` en `js/data.js` y se escapan todas
  las interpolaciones de datos en los módulos.

## [1.1.0] — 2026-08-17

### Agregado
- Plataforma con menú lateral: módulos Dashboard, Asistencia, Estudiantes y
  Horarios en una sola página (cada módulo es un archivo `js/mod-*.js`).
- Dashboard: tarjetas por grado (nº de estudiantes y asistencia de hoy) y
  ranking de los estudiantes con más inasistencias.
- Estudiantes: búsqueda y filtro por grado, tabla con resumen de asistencia,
  ficha individual con totales y lista cronológica de faltas/atrasos.
- Gestión (rol admin): agregar estudiantes, editar nombre, mover de grado
  (el historial de asistencia se conserva) y editar/agregar/quitar bloques de
  horario.
- Permisos por rol: solo `admin` edita estudiantes y horarios; el resto
  consulta y registra asistencia.

### Corregido
- El contador de "días asistidos" del reporte impreso ahora busca en toda la
  colección de asistencias: no se pierde al mover un estudiante de grado.

## [1.0.1] — 2026-08-17

### Corregido
- Error `The query requires an index` al cargar la nómina: la consulta de
  estudiantes combinaba `where(grado)` con `orderBy(nombre)`, lo que exigía un
  índice compuesto en Firestore. Ahora la consulta solo filtra por grado y el
  orden alfabético se hace en el cliente (`localeCompare` en español).

### Agregado
- Versión visible en la pantalla de login y en la barra superior de la app.
- `CHANGELOG.md` y convención de versionado documentada en el README.

## [1.0.0] — 2026-08-17

### Agregado
- Versión inicial: login contra Firestore (sin Firebase Auth), registro de
  asistencia por grado y fecha con marcas por hora (P/I/J/A/N), reporte diario
  imprimible con el formato de la hoja IMPRIMIR de los Excel, y página de carga
  inicial de datos (`seed/seed.html`).
