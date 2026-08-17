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
app.html              Registro de asistencia (grado + fecha, marcas por hora)
imprimir.html         Reporte diario imprimible (formato de la hoja IMPRIMIR)
js/                   firebase-config, auth, data, app, imprimir (módulos ES)
css/                  styles.css (app) y print.css (reporte)
seed/                 Datos iniciales (JSON) + seed.html para cargarlos
scripts/extraer_excel.py  Genera seed/*.json desde los Excel de DOC/
firebase.json, firestore.rules  Configuración de reglas de Firestore
```

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
