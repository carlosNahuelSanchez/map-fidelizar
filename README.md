# Fidelizar para Android

Prototipo React Native y Expo para compartir locales y notas entre varios teléfonos, sin cuentas personales, correos ni contraseñas. La APK funciona como cliente; Supabase provee la API, la base PostgreSQL y las sesiones automáticas de cada dispositivo. El mapa es nativo, con MapLibre y calles de OpenStreetMap.

El desarrollo móvil está en `main`. La rama `full-map` conserva el mapa web anterior.

## Instalar la APK

El archivo generado está en `artifacts/fidelizar.apk`. Copialo a los celulares y habilitá la instalación desde esa fuente cuando Android lo solicite. La APK release no necesita servidor de desarrollo ni cuenta de Expo para ejecutarse.

En la primera apertura, completá la URL de Supabase, su clave pública `sb_publishable_...` o `anon` y el código compartido del equipo. El nombre del teléfono es opcional y permite reconocer sus notas. Todos usan el mismo proyecto y código. Después la app entra automáticamente.

El código del equipo y la sesión automática se guardan en el almacenamiento seguro de Android. No ingreses una clave `service_role`, `sb_secret` ni un token de administración en la APK.

Podés usar “Ver mapa” antes de configurar el equipo. Los datos compartidos se habilitan después de completar la conexión. Agregar locales o notas no requiere distribuir otra APK; los cambios de código de la app sí.

## Configurar Supabase

Creá un proyecto Supabase vacío. No hace falta desplegar un servidor Node adicional.

Copiá `.env.admin.example` como `.env.admin` y completá:

- `SUPABASE_PROJECT_REF`: identificador del proyecto, visible en la URL del panel.
- `SUPABASE_ACCESS_TOKEN`: token personal de Supabase con permisos de base de datos y configuración de Auth. Se obtiene en la configuración de la cuenta.

Desde la raíz del proyecto, ejecutá:

```sh
npm install
npm run backend:setup
```

El comando instala las tablas, las validaciones, los permisos y los cambios en tiempo real. También habilita las sesiones anónimas automáticas y deshabilita el acceso por correo. Al finalizar muestra el código compartido del equipo. Puede repetirse sin borrar datos ni cambiar ese código.

La URL y la clave pública del proyecto se obtienen en el panel de Supabase. Cargalas en la APK junto con el código del equipo. `.env.admin` está excluido de Git y de la compilación Android; solo lo usa la computadora que prepara el backend.

### Alternativa desde el panel

Si no querés usar el token personal, ejecutá el archivo `supabase/migrations/202610260001_team_map.sql` en el SQL Editor. En Authentication habilitá “Allow anonymous sign-ins” y permití nuevas altas para que Supabase pueda crear las sesiones anónimas. Podés deshabilitar el proveedor de correo porque la app no lo usa.

Consultá el código generado con:

```sql
select access_code from private.team_settings where id = true;
```

El código está en un esquema privado, no puede leerse desde la API pública. La app lo presenta al conectar y la base habilita ese teléfono en el equipo. Conocer solo la URL y la clave pública no permite leer ni modificar los datos del equipo.

## Usar la app

- “Agregar local” abre el formulario: nombre, rubro, localidad, provincia, dirección, teléfono y coordenadas.
- Elegí las coordenadas tocando el mapa, ingresándolas manualmente o usando el GPS.
- Mantené presionado un punto para crear un local allí o consultar una ruta.
- Tocá un local o abrilo desde la lista para ver datos, editarlo y agregar notas.
- Todos los teléfonos habilitados ven y editan los locales. Solo el dispositivo que creó un local puede eliminarlo, junto con sus notas.
- Las notas son compartidas. Cada dispositivo puede editar y eliminar las notas que creó.
- Con GPS se puede filtrar por radios de 1, 5, 10 y 25 km en línea recta.
- “Equipo” permite cambiar la conexión. No hay pantalla de registro ni de inicio de sesión.

Los cambios llegan por Supabase Realtime. También se consulta al volver a la app y periódicamente: cada 30 segundos para los locales y cada 20 para las notas abiertas. Hay actualización manual.

Supabase crea una identidad técnica anónima por instalación para aplicar los permisos; no pide datos personales. Esa identidad se conserva al cerrar y abrir la app. Si se desinstala o se borran los datos del teléfono, puede perderse: los aportes siguen compartidos, pero el nuevo dispositivo no hereda la autoría anterior. No borres las identidades anónimas de Supabase que estén vinculadas a aportes.

Para deshabilitar un teléfono sin eliminar sus aportes:

```sql
update public.team_members set active = false where user_id = 'UUID_DEL_TELEFONO';
```

## Generar otra APK en Windows

Requisitos: Node.js 22.13 o una versión compatible más reciente, JDK 17 y Android SDK. Configurá `JAVA_HOME` y `ANDROID_HOME`. En esta computadora, el script también detecta las herramientas preparadas en `.cache/map-fidelizar-android` dentro del perfil del usuario.

Desde la raíz:

```sh
npm ci
npm run typecheck
npm test
npm run apk:android
```

La primera compilación descarga las dependencias de Android. El script usa una carpeta corta, `C:/fma`, para evitar el límite de rutas de Windows. Solo copia código, recursos y dependencias de compilación; verifica que esa carpeta pertenezca a este proyecto. Se puede elegir otra carpeta corta con `FIDELIZAR_ANDROID_BUILD_ROOT`.

Expo genera Android, Gradle compila la versión release y el script la firma con una clave privada local. El resultado se copia a `artifacts/fidelizar.apk`, junto con su huella SHA-256. Incluye ARM64 y x86_64, para teléfonos modernos y emuladores.

La firma está en `.credentials/`, excluida de Git. Conservá esa carpeta de forma privada: se necesita para actualizar una APK ya instalada sin desinstalarla y perder la identidad del dispositivo.

Para desarrollar con Android SDK configurado, usá `npm start` y en otra terminal `npm run android`. MapLibre requiere una compilación nativa; no funciona en Expo Go. `npm run build` exporta el paquete JavaScript Android con Metro, pero no genera una APK.

Opcionalmente, copiá `.env.example` como `.env` para incluir la URL y la clave pública en una nueva APK. El código del equipo se ingresa desde el teléfono. La configuración guardada en el dispositivo prevalece; se cambia desde “Equipo”.

## Archivos

- `src/`: pantallas, mapa nativo, formularios, notas, GPS, rutas y cliente Supabase.
- `assets/`: icono y límites provinciales incluidos en la APK.
- `supabase/migrations/`: esquema y permisos de PostgreSQL.
- `scripts/setup-supabase.mjs`: instalación remota del esquema y configuración del acceso automático.
- `scripts/build-apk.ps1`: compilación, firma y copia de la APK.
- `plugins/with-signing.js`: configuración de firma en el proyecto Android generado por Expo.
- `tests/`: validación de formularios y pruebas de permisos con PostgreSQL embebido para desarrollo.

## Límites del prototipo

Los datos compartidos, las calles y las rutas requieren internet. No hay cola de escrituras sin conexión, fotos ni notificaciones. Si dos personas modifican el mismo campo, queda el último cambio guardado. Cada nota es un registro independiente.

El GPS se usa con permiso mientras la app está abierta. El recorrido del dispositivo no se guarda en Supabase. Al pedir una ruta se envían origen y destino a OSRM. Google Maps solo se abre como navegación externa opcional. No se descargan mapas completos ni imágenes de calles en bloque.

El plan gratuito de Supabase tiene cuotas y puede pausar proyectos inactivos. El responsable administra el proyecto y comparte la URL, la clave pública y el código solo con su equipo.
