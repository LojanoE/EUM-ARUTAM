# Changelog

Historial de versiones de la app de Registro de Asistencia — UEM "Arutam".
Versionado semántico: MAYOR.MENOR.PARCHE. La versión vigente está en
`js/version.js` y cada versión tiene su tag de git (`vX.Y.Z`).

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
