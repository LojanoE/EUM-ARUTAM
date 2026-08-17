# Changelog

Historial de versiones de la app de Registro de Asistencia — UEM "Arutam".
Versionado semántico: MAYOR.MENOR.PARCHE. La versión vigente está en
`js/version.js` y cada versión tiene su tag de git (`vX.Y.Z`).

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
