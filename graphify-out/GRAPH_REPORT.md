# Graph Report - EUM-ARUTAM  (2026-08-17)

## Corpus Check
- Corpus is ~15,642 words - fits in a single context window. You may not need a graph.

## Summary
- 130 nodes · 316 edges · 12 communities (8 shown, 4 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Asistencia y Estudiantes
- Impresion y Reportes
- Autenticacion y Shell
- Datos y Grados
- Extraccion Excel
- Horarios
- Usuarios
- Codigos de Asistencia
- Ordenamiento en Cliente
- Escape HTML Helper
- Versionado Semantico
- Permisos por Rol

## God Nodes (most connected - your core abstractions)
1. `esc()` - 25 edges
2. `initAsistencia()` - 12 edges
3. `initDashboard()` - 12 edges
4. `initEstudiantes()` - 12 edges
5. `diaDeFecha()` - 11 edges
6. `iniciar()` - 11 edges
7. `obtenerAsistencia()` - 10 edges
8. `obtenerGrados()` - 9 edges
9. `initGrados()` - 9 edges
10. `initHorarios()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Página de login con script inline` --calls--> `login()`  [EXTRACTED]
  index.html → js/auth.js
- `Shell de plataforma con menú lateral y 6 secciones de módulo` --references--> `MODULOS`  [EXTRACTED]
  app.html → js/app.js
- `Página de login con script inline` --calls--> `sesionActual()`  [EXTRACTED]
  index.html → js/auth.js
- `Handler del botón Cargar datos (carga inicial)` --shares_data_with--> `db`  [EXTRACTED]
  seed/seed.html → js/firebase-config.js
- `Página de login con script inline` --references--> `APP_VERSION`  [EXTRACTED]
  index.html → js/version.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Flujo de reportes imprimibles con firma** — imprimir_reporte_diario, reporte_reporte_rango, changelog_firma_por_usuario, readme_codigos_asistencia [INFERRED 0.85]
- **Carga inicial de datos a Firestore** — seed_seed_handler_carga, seed_seed_leerjson, seed_seed_subirenlotes [EXTRACTED 1.00]

## Communities (12 total, 4 thin omitted)

### Community 0 - "Asistencia y Estudiantes"
Cohesion: 0.16
Nodes (26): actualizarEstudiante(), agregarEstudiante(), CODIGOS, CODIGOS_DESC, diaDeFecha(), esc(), fechaHoy(), indicePorEstudiante() (+18 more)

### Community 1 - "Impresion y Reportes"
Cohesion: 0.11
Nodes (26): firmaDelUsuario(), obtenerConfig(), obtenerEstudiantes(), obtenerHorario(), obtenerTutor(), resumenEstudiante(), contar(), diasAsistidosAcumulados() (+18 more)

### Community 2 - "Autenticacion y Shell"
Cohesion: 0.11
Nodes (19): Shell de plataforma con menú lateral y 6 secciones de módulo, Página de login con script inline, ctx, MODULOS, sesion, cerrarSesion(), exigirSesion(), login() (+11 more)

### Community 3 - "Datos y Grados"
Cohesion: 0.27
Nodes (12): actualizarGrado(), agregarGrado(), CONFIG_DEFECTO, contarPorGrado(), ejecutarEnLotes(), eliminarGrado(), guardarAsistencia(), idAsistencia() (+4 more)

### Community 4 - "Extraccion Excel"
Cohesion: 0.50
Nodes (7): cargar(), extraer_estudiantes(), extraer_horarios(), extraer_tutores(), limpiar(), main(), Quita espacios y corrige caracteres rotos de codificación.

### Community 5 - "Horarios"
Cohesion: 0.48
Nodes (6): actualizarBloqueHorario(), agregarBloqueHorario(), DIAS_SEMANA, eliminarBloqueHorario(), obtenerHorariosDeGrado(), initHorarios()

### Community 6 - "Usuarios"
Cohesion: 0.52
Nodes (6): actualizarUsuario(), agregarUsuario(), eliminarUsuario(), obtenerUsuarios(), initUsuarios(), pintar()

### Community 7 - "Codigos de Asistencia"
Cohesion: 0.60
Nodes (5): Firma de documentos por usuario (nombre + cargo), Prellenado de nómina con P (registro rápido), Reporte diario imprimible (formato hoja IMPRIMIR), Códigos de asistencia P/I/J/A/N, Reporte consolidado por rango de fechas (imprimible/CSV)

## Knowledge Gaps
- **24 isolated node(s):** `sesion`, `ctx`, `CONFIG_DEFECTO`, `firebaseConfig`, `app` (+19 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `esc()` connect `Asistencia y Estudiantes` to `Impresion y Reportes`, `Datos y Grados`, `Horarios`, `Usuarios`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Why does `db` connect `Autenticacion y Shell` to `Impresion y Reportes`, `Datos y Grados`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `initAsistencia()` connect `Asistencia y Estudiantes` to `Autenticacion y Shell`, `Datos y Grados`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `initAsistencia()` (e.g. with `app.js` and `cargar()`) actually correct?**
  _`initAsistencia()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `initEstudiantes()` (e.g. with `app.js` and `pintarTabla()`) actually correct?**
  _`initEstudiantes()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `sesion`, `ctx`, `CONFIG_DEFECTO` to the rest of the system?**
  _24 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Impresion y Reportes` be split into smaller, more focused modules?**
  _Cohesion score 0.10846560846560846 - nodes in this community are weakly interconnected._