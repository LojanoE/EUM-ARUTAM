# Changelog

Historial de versiones de la app de Registro de Asistencia — UE "Arutam".
Versionado semántico: MAYOR.MENOR.PARCHE. La versión vigente está en
`js/version.js` y cada versión tiene su tag de git (`vX.Y.Z`).

## [1.22.0] — 2026-10-27

### Mejorado
- **Interfaz más cómoda** para personas de mayor edad: letra y campos más grandes,
  botones de 44 px y foco visible en toda la app.
- **Cambiar contraseña / Ingresar**: ya no se cortan ni se salen del recuadro en el
  celular; botón «Mostrar», requisitos escritos y aviso en vivo si las contraseñas coinciden.
- **Notas**: guía de 3 pasos, campos de nota más grandes y del mismo tamaño, columna
  del estudiante fija al desplazar, filas alternadas, indicador «Cambios sin guardar» /
  «Todo guardado ✓» y aviso antes de cambiar de materia, trimestre o salir sin guardar.
- **Libreta**: se adapta al ancho del celular, barra de botones en varias filas y
  mensaje de ayuda. La impresión y el PDF no cambian.

## [1.21.0] — 2026-10-27

### Añadido
- **Libreta de calificaciones** (`libreta.html`): notas por materia (T1, T2, T3,
  promedio final y estado), detalle de insumos/proyecto/examen, resumen de
  asistencia, observaciones y firmas. Una por estudiante o todo el grado.
- Se imprime, se descarga como PDF o se comparte (WhatsApp u otra app) para el
  representante. Acceso desde Notas con «Libretas del grado»; la ve el admin y
  el docente que da clases en ese grado.

## [1.20.0] — 2026-10-27

### Añadido
- Las cuentas de docentes nuevas se crean con contraseña igual al usuario y
  el sistema obliga a cambiarla en el primer ingreso.
- Botón «Cambiar contraseña» en el menú, disponible para todos los roles.
- Si el admin pone una contraseña nueva desde Usuarios, la persona también
  debe cambiarla al entrar.

## [1.19.1] — 2026-10-27

### Corregido
- La app no cargaba tras la 1.19.0: faltaba la sección del módulo Docentes en
  `app.html`. Además, una sección ausente ya no detiene la carga de los módulos.

## [1.19.0] — 2026-10-27

### Añadido
- Módulo **Docentes** (admin): lista maestra de docentes de ambas secciones, con
  sus materias, sección y usuario. Al editar un nombre se actualiza en todos los
  horarios (y en la cuenta si tenía exactamente ese nombre). Permite agregar,
  eliminar, importar los que solo están en horarios y crear cuentas de los
  seleccionados (con lista de credenciales imprimible).
- En **Horarios** el docente se elige de la lista en vez de escribirse.

### Cambiado
- Cargas ya no tiene el panel de docentes ni de credenciales (pasó a Docentes).

## [1.18.1] — 2026-10-27

### Corregido
- El vínculo usuario ↔ docente del horario también funciona cuando el nombre
  del usuario es más largo que el del horario (ej. «Albita Narcisa Sozoranga
  Morocho» ↔ «Narcisa Sozoranga»), para no crear cuentas duplicadas.

## [1.18.0] — 2026-10-27

### Cambiado
- Las **cargas docentes salen de los horarios**: cada docente ve en Notas las
  materias que el horario le asigna, vinculado por nombre (sin importar tildes,
  mayúsculas ni títulos como Lic./Mgtr.). Un cambio de horario se refleja solo.

### Agregado
- Cargas: panel «Docentes según el horario» y botón **Crear cuentas faltantes**,
  que genera usuario y contraseña de cada docente y muestra una lista imprimible.
- Las cargas manuales se conservan como «Cargas adicionales (reemplazos)».

## [1.17.0] — 2026-10-27

### Agregado
- **Rol `docente`**: los profesores entran con su usuario y solo ven los
  módulos Notas y Himnos.
- **Módulo Notas**: calificaciones por trimestre (insumos formativos
  editables, proyecto y examen), promedio automático 0–10 y resumen anual
  con estado Aprueba/Supletorio. El trimestre cerrado queda de solo lectura.
- **Módulo Cargas (admin)**: asigna a cada docente sus grados y asignaturas, y
  configura período lectivo, trimestre abierto, nota mínima y porcentajes.
- Colecciones nuevas en Firestore: `cargas` y `notas`. `CACHE` del service
  worker sube a `uem-arutam-v8`.

## [1.16.0] — 2026-10-27

### Agregado
- **Firebase Hosting**: la app también se publica en
  https://uem-arutam.web.app (`firebase deploy --only hosting`). Se excluyen
  `DOC/`, `scripts/`, `seed/`, `*.md` y reglas del despliegue.

## [1.15.0] — 2026-10-22

### Agregado
- **App instalable (PWA)**: `manifest.webmanifest`, iconos en `icons/`,
  `theme-color` y metas de iOS en todas las páginas; abre en `app.html` en
  modo standalone. El `CACHE` del service worker sube a `uem-arutam-v7`.

### Cambiado
- **Vista móvil**: la barra lateral pasa a ser un menú deslizable (☰) con
  barra superior que muestra el módulo actual; se cierra al elegir módulo,
  tocar el fondo o pulsar Escape.
- Campos a todo el ancho, objetivos táctiles de 44 px, botones y diálogos
  apilados, avisos centrados abajo y respeto de las zonas seguras
  (muesca y barra de gestos) en `css/styles.css`.

## [1.14.0] — 2026-09-25

### Agregado
- **Sección "Himnos"** en el menú lateral (`js/mod-himnos.js`, `app.html`,
  `js/app.js`, `css/styles.css`), visible para todos los roles. Reproduce
  los dos himnos de la institución desde YouTube (el video normal en 16:9 y
  el Short en vertical), con un enlace "Abrir en YouTube" por si el video no
  se puede reproducir dentro de la app. Necesita internet: YouTube no se
  guarda para uso offline.
- Se agrega el módulo a la precarga del service worker y se sube el `CACHE`
  a `uem-arutam-v6` (`sw.js`).

## [1.13.1] — 2026-09-15

### Corregido
- **La app seguía mostrando la versión anterior después de desplegar**
  (`sw.js`). El service worker respondía "caché primero con revalidación":
  servía la copia guardada y recién entonces descargaba la nueva, así que
  tras cada despliegue la pantalla quedaba una recarga atrasada (se veía
  v1.11.0 con v1.13.0 ya publicada). Ahora los archivos propios van **red
  primero**, con un límite de espera de 4 s y caída a la copia guardada: con
  internet siempre se ve la versión recién desplegada y sin internet la app y
  las hojas de impresión siguen abriendo igual que antes. Los scripts del CDN
  de Firebase se mantienen "caché primero" porque su URL incluye la versión.

### Agregado
- Aviso **"Hay una versión nueva de la aplicación — Recargar"**
  (`js/app.js`, `js/notificaciones.js`): cuando se despliega una versión
  mientras la app está abierta, aparece un aviso azul con botón. No recarga
  solo, para no perder una nómina a medio llenar.

## [1.13.0] — 2026-09-15

### Cambiado
- **Nuevo nombre de la institución**: pasa de UNIDAD EDUCATIVA DEL MILENIO
  "ARUTAM" a **UNIDAD EDUCATIVA "ARUTAM"**. Se actualiza el encabezado de
  todos los documentos impresos (`js/hoja-asistencia.js`, que alimenta la
  impresión individual y por lote, y `reporte.html`) y el título del login
  (`index.html`).
- La sigla **UEM** (Unidad Educativa del Milenio) pasa a **UE** en el menú
  lateral (`app.html`), en los títulos de pestaña de todas las páginas y en
  el usuario inicial de `seed/usuarios.json`.
- No cambian los identificadores técnicos que quedarían rotos si se tocaran:
  el proyecto de Firebase (`uem-arutam`), las claves de sesión y de caché en
  el navegador, y el nombre del repositorio.
- **Rediseño del dashboard** (`js/mod-dashboard.js`, `css/styles.css`). Antes
  la pantalla eran tarjetas con el número de estudiantes de cada grado y dos
  tablas largas; la información del día (lo único que se usa a diario) quedaba
  en letra pequeña y no se podía hacer nada desde ahí. Ahora:
  - **Franja de estado del día** arriba de todo: "4 de 6 grados registrados"
    con barra de avance, la lista de los grados que faltan, la fecha en
    palabras y cuatro indicadores (presentes, ausentes, % de asistencia de hoy
    y alertas activas). Distingue el fin de semana del feriado o suspensión.
  - **Tarjetas por grado orientadas a hoy**: etiqueta de estado
    (Registrado / Pendiente / Sin clases), presentes sobre el total con barra,
    el desglose de ausencias del día y un botón que lleva directo a registrar
    o corregir ese grado. El número de estudiantes pasa a dato secundario.
  - **Alertas como lista** en vez de tabla de cinco columnas, con el motivo en
    etiquetas y distinción visual entre alerta crítica (injustificadas
    seguidas) y de seguimiento (porcentaje bajo).
  - **Ranking más corto y legible**: barra proporcional de horas perdidas,
    menos columnas y la aclaración de que son horas clase, no días.
  - **Filtro por grado** para alertas y ranking, y botones "ver todas/todos"
    para no volcar listas enteras de entrada.
  - **Navegación directa**: la tarjeta de un grado abre el registro de
    asistencia de ese grado y ese día; un estudiante de las alertas o del
    ranking abre su ficha (también con Enter desde el teclado).
  - Botón **Actualizar datos**, que descarta la caché en memoria y vuelve a
    leer de Firestore.

### Agregado
- `ctx.irA(modulo, params)` en el shell (`js/app.js`): un módulo puede abrir
  otro ya situado. `js/mod-asistencia.js` acepta `grado`/`fecha` y
  `js/mod-estudiantes.js` acepta `estudianteId`.
- `refrescarCache()` en `js/data.js` para forzar una relectura.

## [1.11.0] — 2026-09-01

### Agregado
- **Imprimir en blanco** (`js/mod-asistencia.js`, `js/imprimir.js`): casilla
  "Imprimir en blanco" junto al botón "Imprimir reporte del día" que fuerza la
  hoja vacía aunque ya haya asistencia guardada ese día — para reimprimir y
  entregar de nuevo al profesor sin las marcas ya registradas.
- **Impresión por lote** (`imprimir-lote.html`, `js/imprimir-lote.js`): nuevo
  botón "Imprimir por lote…" que abre un selector de fecha y varios grados y
  genera, en una sola pestaña, todas las hojas seleccionadas (una por grado,
  con salto de página entre cada una) listas para imprimir o guardar como PDF
  en un solo trabajo de impresión. Pensado para que un inspector reparta hojas
  en blanco a varios profesores a la vez para que tomen lista a mano. Los
  grados sin horario ese día se omiten con un aviso, sin interrumpir el resto
  del lote.

### Cambiado
- El render de una hoja de asistencia (`imprimir.html`) se extrae a
  `js/hoja-asistencia.js`, compartido ahora entre la impresión individual y
  la impresión por lote, para que ambas usen exactamente el mismo formato.

## [1.10.0] — 2026-08-24

### Cambiado
- **Hoja de impresión de asistencia en una sola página** (`imprimir.html`,
  `js/imprimir.js`, `css/print.css`):
  - Se quita el margen de `@page` (lo movía Chrome a su propio encabezado de
    fecha/hora/URL/página) y se recupera como padding interno del reporte, lo
    que devuelve espacio vertical útil.
  - En la tabla de horario del día, la columna **TEMA** pasa a ser la más
    ancha (antes era la más angosta por no tener contenido de referencia) y
    **Nº** queda al final, angosta; se fijan anchos por columna con
    `<colgroup>` y `table-layout: fixed`.
  - Se quita la columna **DÍAS ASISTIDOS** de la nómina, junto con
    `diasAsistidosAcumulados()`, que leía toda la colección `asistencias` de
    Firestore en cada impresión.
  - Auto-ajuste de escala como red de seguridad para cursos con muchos
    estudiantes u horas, para que el reporte siga cabiendo en una hoja A4.
- El botón **"Imprimir reporte"** se mueve del panel de asistencia (donde
  quedaba junto a "Guardar asistencia") al panel de reportes, junto a
  "Generar reporte por rango" (`js/mod-asistencia.js`).

## [1.9.0] — 2026-08-24

### Agregado
- **Impresión sin internet** (datos en caché): las hojas de impresión
  (`imprimir.html` y `reporte.html`) funcionan sin conexión para cualquier
  grado, usando los datos descargados previamente.
  - Caché persistente de Firestore en IndexedDB
    (`js/firebase-config.js`, `persistentLocalCache` multi-pestaña): las
    lecturas hechas con internet quedan disponibles offline.
  - Precarga automática al entrar a la app y botón "Actualizar datos" en la
    barra lateral (`js/offline.js`, `js/app.js`): descarga estudiantes,
    tutores, horarios, todo el historial de asistencias y la firma del
    usuario, con las mismas consultas que usan las páginas de impresión. La
    fecha de la última precarga se muestra junto al botón.
  - Service worker (`sw.js`) que cachea los archivos estáticos y los scripts
    del CDN de Firebase, para que las páginas abran aunque no haya internet.
  - Aviso "Sin conexión — datos en caché del …" en la barra de herramientas
    de las hojas de impresión cuando se generan offline.
- El **registro** de asistencia sigue requiriendo conexión; no cambió.

### Cambiado
- Margen de impresión de las hojas de asistencia: de 8 mm a 2.54 cm
  (margen "Normal") en `css/print.css`.
- Encabezado de las hojas de impresión: periodo académico **2026 - 2027**.

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
