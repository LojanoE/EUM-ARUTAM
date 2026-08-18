# EUM-ARUTAM — Registro de Asistencia

Aplicación web estática para registrar e imprimir la asistencia diaria de la
sección vespertina de la Unidad Educativa del Milenio "Arutam"
(8vo–10mo EGB "A" y 1ro–3ro BGU "A"). Reemplaza los Excel de `DOC/`.

- **Alojamiento**: GitHub Pages (archivos estáticos, sin build).
- **Base de datos**: Firebase Firestore (proyecto `uem-arutam`).
- **Login**: usuario/contraseña contra la colección `usuarios` (sin Firebase Auth).

## Estructura

```
index.html            Login
app.html              Plataforma (shell con menú lateral y módulos)
imprimir.html         Reporte diario imprimible (formato de la hoja IMPRIMIR)
reporte.html          Reporte consolidado por rango de fechas (imprimible/CSV)
js/                   firebase-config, auth, data, version, app (shell)
js/mod-dashboard.js   Resumen por grado, alertas y ranking de inasistencias
js/mod-asistencia.js  Registro diario (marcas por hora) + reporte por rango
js/mod-estudiantes.js Búsqueda, ficha con historial, agregar/editar/mover
js/mod-horarios.js    Horario semanal por grado (ver/editar bloques)
js/mod-grados.js      CRUD de grados; renombrar actualiza todo en cascada
js/mod-usuarios.js    CRUD de usuarios + firma del subinspector en documentos
css/                  styles.css (app) y print.css (reportes, A4 vertical)
seed/                 Datos iniciales (JSON) + seed.html para cargarlos
scripts/extraer_excel.py  Genera seed/*.json desde los Excel de DOC/
firebase.json, firestore.rules  Configuración de reglas de Firestore
```

### Módulos y permisos

- **Dashboard**: tarjetas por grado, estado de la asistencia de hoy, alertas
  de inasistencia (3+ injustificadas seguidas o <80% de asistencia) y ranking
  de estudiantes con más inasistencias.
- **Asistencia**: registro diario por grado y fecha, con marcas por hora
  (P/I/J/A/N), igual que la hoja IMPRIMIR del Excel. Los días nuevos se
  prellenan con todos presentes para registrar solo las excepciones, y cada
  estudiante admite una observación (motivo de falta) que sale en su ficha y
  en el reporte impreso. Incluye el reporte consolidado por rango de fechas
  (imprimible y CSV).
- **Estudiantes**: consulta con filtros, ficha con historial completo; el rol
  `admin` además puede agregar, editar nombre y mover de grado (el historial
  se conserva). No se eliminan estudiantes.
- **Horarios**: vista semanal por grado; el rol `admin` puede editar, agregar
  o quitar bloques.
- **Grados** (solo `admin`): agregar, editar tutor/sección, renombrar (con
  actualización en cascada de estudiantes, horarios y asistencias) y eliminar
  grados sin estudiantes.
- **Usuarios** (solo `admin`): gestión de cuentas. Cada usuario tiene nombre
  y **cargo**, con los que se firman los documentos que imprime.

Los roles se definen en el campo `rol` de la colección `usuarios`
(`admin` edita; cualquier otro rol solo consulta y registra asistencia).

Para agregar un módulo nuevo: crear `js/mod-nombre.js` que exporte
`initNombre(contenedor, ctx)`, agregar su entrada en `MODULOS` de `js/app.js`
y un botón `data-modulo="nombre"` en el menú de `app.html`.

Códigos de asistencia: `P` Presente, `I` Injustificado, `J` Justificado,
`A` Atraso, `N` No hay clases.

## Puesta en marcha (una sola vez)

1. **Abrir las reglas de Firestore.** La app no usa Firebase Auth, así que las
   reglas deben permitir lectura/escritura. Dos opciones:
   - Consola Firebase → Firestore → Reglas: pegar el contenido de
     `firestore.rules` y publicar; o
   - Con la CLI: `firebase login` y luego `firebase deploy --only firestore:rules --project uem-arutam`.
2. **Editar el usuario inicial** en `seed/usuarios.json` si se desea
   (por defecto: usuario `admin`, contraseña `arutam2026` — cámbiela).
3. **Servir localmente** para la carga inicial (los módulos ES no funcionan
   con `file://`):
   ```
   python -m http.server 8000
   ```
4. Abrir `http://localhost:8000/seed/seed.html` y pulsar **Cargar datos**.
   Esto sube estudiantes, horarios, tutores y usuarios a Firestore.
5. Probar el login en `http://localhost:8000/`.

## Despliegue en GitHub Pages

1. Hacer push de la rama principal.
2. En GitHub: Settings → Pages → Source: rama principal, carpeta `/ (root)`.
3. La app quedará en `https://<usuario>.github.io/EUM-ARUTAM/`.

## Versionado

Se usa versionado semántico (`MAYOR.MENOR.PARCHE`):

- La versión vigente está en `js/version.js` y se muestra en la app
  (`vX.Y.Z` en el login y en la barra superior).
- Cada cambio debe actualizar `js/version.js` y agregar su entrada en
  `CHANGELOG.md`.
- Después del commit, crear el tag correspondiente:
  ```
  git tag -a vX.Y.Z -m "Descripción breve"
  git push --tags
  ```

## Seguridad (limitación conocida)

El login es un control básico de interfaz: las contraseñas se guardan en texto
plano en Firestore y las reglas están abiertas. Cualquiera con la configuración
del proyecto podría leer o modificar la base. Es una solución interna
provisional; lo correcto a futuro es migrar a Firebase Auth y reglas con
`request.auth`. Después de la carga inicial, elimine `seed/seed.html`.

## Regenerar los datos desde los Excel

```
python scripts/extraer_excel.py
```

Lee `DOC/1.-ASISTENCIA_EGB_ARUTAM_V0 (2).xlsm` y
`DOC/2.-ASISTENCIA_BACHILLERATO_ARUTAM_V0 (2).xlsm` y regenera
`seed/estudiantes.json`, `seed/horarios.json` y `seed/tutores.json`.
Requiere `openpyxl`.
