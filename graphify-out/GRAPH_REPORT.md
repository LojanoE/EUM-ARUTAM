# Graph Report - EUM-ARUTAM  (2026-08-20)

## Corpus Check
- Corpus is ~17,598 words - fits in a single context window. You may not need a graph.

## Summary
- 200 nodes · 488 edges · 14 communities
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.83)
- Token cost: 0 input · 79,239 output

## Community Hubs (Navigation)
- Reportes e Impresión
- Datos y Notificaciones
- App Shell y Autenticación
- Estudiantes y Dashboard
- Estructura del Proyecto
- Evolución Temprana (v1.0-1.2)
- Importación de Datos (Excel/Seed)
- Módulo Grados
- v1.6.0: Estudiantes y Robustez
- v1.4.0: Registro Rápido y Reportes
- v1.5.0: Usuarios y Firma
- Lógica de Asistencia (UI)
- v1.3.0: Alertas y Firma Configurable
- v1.7.0: Notificaciones y Guardado Seguro

## God Nodes (most connected - your core abstractions)
1. `README.md — EUM-ARUTAM Registro de Asistencia` - 35 edges
2. `esc()` - 25 edges
3. `initAsistencia()` - 16 edges
4. `initEstudiantes()` - 15 edges
5. `notificarError()` - 14 edges
6. `initDashboard()` - 13 edges
7. `diaDeFecha()` - 11 edges
8. `iniciar()` - 11 edges
9. `initHorarios()` - 11 edges
10. `initUsuarios()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Módulo Usuarios` --semantically_similar_to--> `Módulo Usuarios (crear/editar/eliminar cuentas)`  [INFERRED] [semantically similar]
  README.md → CHANGELOG.md
- `Notificaciones de guardado (verde/roja) y relectura de confirmación` --semantically_similar_to--> `Notificaciones visuales (toasts)`  [INFERRED] [semantically similar]
  README.md → CHANGELOG.md
- `Feriados y suspensiones (config)` --semantically_similar_to--> `Feriados y suspensiones`  [INFERRED] [semantically similar]
  README.md → CHANGELOG.md
- `Estudiantes retirados/reincorporados` --semantically_similar_to--> `Estudiantes retirados (retirar/reincorporar)`  [INFERRED] [semantically similar]
  README.md → CHANGELOG.md
- `Firma de documentos con nombre y cargo del usuario` --semantically_similar_to--> `Firma de documentos por usuario (campo cargo)`  [INFERRED] [semantically similar]
  README.md → CHANGELOG.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Carga inicial de datos a Firestore** — seed_seed_handler_carga, seed_seed_leerjson, seed_seed_subirenlotes [EXTRACTED 1.00]
- **Módulos dinámicos initNombre(contenedor, ctx) registrados en MODULOS de js/app.js** — js_mod_dashboard, js_mod_asistencia, js_mod_estudiantes, js_mod_horarios, js_mod_grados, js_mod_usuarios, js_app [EXTRACTED 1.00]
- **Módulos y funciones restringidos al rol admin** — readme_grados_modulo, readme_usuarios_modulo, readme_permisos_por_rol, readme_horarios_modulo [INFERRED 0.75]
- **Evolución de la firma de documentos impresos (configurable → por usuario/cargo)** — changelog_firma_por_usuario, changelog_firma_configurable, readme_firma_cargo [INFERRED 0.85]

## Communities (14 total, 0 thin omitted)

### Community 0 - "Reportes e Impresión"
Cohesion: 0.10
Nodes (30): Reporte diario imprimible (formato hoja IMPRIMIR), diaDeFecha(), firmaDelUsuario(), obtenerAsistencia(), obtenerEstudiantes(), obtenerHorario(), obtenerTutor(), contar() (+22 more)

### Community 1 - "Datos y Notificaciones"
Cohesion: 0.15
Nodes (26): actualizarBloqueHorario(), actualizarUsuario(), agregarBloqueHorario(), agregarUsuario(), _cache, CODIGOS, CONFIG_DEFECTO, DIAS_SEMANA (+18 more)

### Community 2 - "App Shell y Autenticación"
Cohesion: 0.12
Nodes (18): Shell de plataforma con menú lateral y 6 secciones de módulo, Versión visible en login y barra superior, Página de login con script inline, ctx, MODULOS, sesion, cerrarSesion(), exigirSesion() (+10 more)

### Community 3 - "Estudiantes y Dashboard"
Cohesion: 0.25
Nodes (18): actualizarEstudiante(), agregarEstudiante(), CODIGOS_DESC, conCache(), esc(), fechaHoy(), fechaMenosDias(), indicePorEstudiante() (+10 more)

### Community 4 - "Estructura del Proyecto"
Cohesion: 0.15
Nodes (13): app.html (Plataforma), css/print.css, css/styles.css, firebase.json, firestore.rules, imprimir.html (Reporte diario imprimible), index.html (Login), README.md — EUM-ARUTAM Registro de Asistencia (+5 more)

### Community 5 - "Evolución Temprana (v1.0-1.2)"
Cohesion: 0.22
Nodes (12): Helper esc() para escapar interpolaciones HTML, Error 'query requires an index' resuelto ordenando en cliente, Módulo Grados (CRUD, renombrar en cascada), Permisos por rol (admin edita, resto consulta), Plataforma con menú lateral y módulos, v1.0.0 (2026-08-17), v1.0.1 (2026-08-17), v1.1.0 (2026-08-17) (+4 more)

### Community 6 - "Importación de Datos (Excel/Seed)"
Cohesion: 0.27
Nodes (12): cargar(), extraer_estudiantes(), extraer_horarios(), extraer_tutores(), limpiar(), main(), Quita espacios y corrige caracteres rotos de codificación., seed/estudiantes.json (+4 more)

### Community 7 - "Módulo Grados"
Cohesion: 0.40
Nodes (10): actualizarGrado(), agregarGrado(), contarPorGrado(), ejecutarEnLotes(), eliminarGrado(), invalidarCache(), obtenerTutores(), renombrarGrado() (+2 more)

### Community 8 - "v1.6.0: Estudiantes y Robustez"
Cohesion: 0.20
Nodes (10): Atajo 'Toda la fila' en el registro diario, Aviso de cambios sin guardar, Botón 'Guardar asistencia' deshabilitado durante guardado (evita dobles envíos), Caché en memoria (2 min) para evitar re-descargas al cambiar de módulo, Dashboard limitado a últimos 90 días (evita descargar toda la colección), Estudiantes retirados (retirar/reincorporar), Eliminación de función sin uso resumenEnRango y campo muerto numId, v1.6.0 (2026-08-18) (+2 more)

### Community 9 - "v1.4.0: Registro Rápido y Reportes"
Cohesion: 0.28
Nodes (9): Observación por estudiante (motivo de falta/atraso), Registro rápido de asistencia (prellenado con P), Reporte por rango de fechas, v1.4.0 (2026-08-17), Módulo Asistencia, Observación por estudiante (motivo de falta), Prellenado de nómina con P (registro rápido), Reporte consolidado por rango de fechas (+1 more)

### Community 10 - "v1.5.0: Usuarios y Firma"
Cohesion: 0.29
Nodes (7): Feriados y suspensiones, Firma de documentos por usuario (campo cargo), Módulo Usuarios (crear/editar/eliminar cuentas), v1.5.0 (2026-08-17), Feriados y suspensiones (config), Firma de documentos con nombre y cargo del usuario, Módulo Usuarios

### Community 11 - "Lógica de Asistencia (UI)"
Cohesion: 0.38
Nodes (5): initAsistencia(), marcarSucio(), opcionesMarca(), pintarHorario(), pintarNomina()

### Community 12 - "v1.3.0: Alertas y Firma Configurable"
Cohesion: 0.40
Nodes (5): Alertas de inasistencia en el Dashboard, Firma configurable en documentos, v1.3.0 (2026-08-17), Alertas de inasistencia (3+ injustificadas o <80%), Módulo Dashboard

### Community 13 - "v1.7.0: Notificaciones y Guardado Seguro"
Cohesion: 0.40
Nodes (5): Notificaciones visuales (toasts), Red de seguridad global (errores no capturados), v1.7.0 (2026-08-18), Verificación real del guardado de asistencia, Notificaciones de guardado (verde/roja) y relectura de confirmación

## Knowledge Gaps
- **40 isolated node(s):** `sesion`, `ctx`, `_cache`, `CONFIG_DEFECTO`, `firebaseConfig` (+35 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `README.md — EUM-ARUTAM Registro de Asistencia` connect `Estructura del Proyecto` to `Datos y Notificaciones`, `App Shell y Autenticación`, `Estudiantes y Dashboard`, `Evolución Temprana (v1.0-1.2)`, `Importación de Datos (Excel/Seed)`, `Módulo Grados`, `v1.6.0: Estudiantes y Robustez`, `v1.4.0: Registro Rápido y Reportes`, `v1.5.0: Usuarios y Firma`, `v1.3.0: Alertas y Firma Configurable`, `v1.7.0: Notificaciones y Guardado Seguro`?**
  _High betweenness centrality (0.459) - this node is a cross-community bridge._
- **Why does `esc()` connect `Estudiantes y Dashboard` to `Reportes e Impresión`, `Datos y Notificaciones`, `Lógica de Asistencia (UI)`, `Módulo Grados`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `v1.6.0 (2026-08-18)` connect `v1.6.0: Estudiantes y Robustez` to `v1.5.0: Usuarios y Firma`, `v1.7.0: Notificaciones y Guardado Seguro`, `Evolución Temprana (v1.0-1.2)`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `initAsistencia()` (e.g. with `app.js` and `cargar()`) actually correct?**
  _`initAsistencia()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `sesion`, `ctx`, `_cache` to the rest of the system?**
  _40 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Reportes e Impresión` be split into smaller, more focused modules?**
  _Cohesion score 0.1028225806451613 - nodes in this community are weakly interconnected._
- **Should `App Shell y Autenticación` be split into smaller, more focused modules?**
  _Cohesion score 0.11857707509881422 - nodes in this community are weakly interconnected._