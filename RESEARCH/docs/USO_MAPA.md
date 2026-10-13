# Mapa de locales

Aplicación web de React, TypeScript y Leaflet. Leaflet dibuja el mapa y carga calles de OpenStreetMap. Los recorridos por calles se calculan con OSRM.

## Uso

- Buscá por nombre, dirección o localidad.
- Filtrá por panaderías, heladerías, barberías/peluquerías y por provincia. El filtro por localidad está disponible al elegir Formosa.
- Seleccioná un local para centrar el mapa y consultar su dirección, coordenadas, contactos y fuente.
- En el teléfono, abrí el menú para buscar, filtrar, activar ubicación, marcar un destino o instalar la app.
- Los puntos cercanos se agrupan con un contador. Al acercar el mapa se separan en puntos individuales.
- Elegí **Cómo llegar** en una ficha o **Marcar un punto** para establecer un destino. **Iniciar guía** habilita el GPS, calcula una ruta para auto y muestra distancia, tiempo e instrucciones de maniobra.
- El botón **Abrir navegación en Google Maps** ofrece navegación externa opcional. Google Maps no dibuja el mapa de la aplicación.

## Ubicación y recorridos

La ubicación requiere permiso del navegador y HTTPS, salvo en `localhost`. La app pide lecturas GPS nuevas y de alta precisión, descarta posiciones antiguas y no mueve el mapa con una precisión peor que 100 metros. Si detecta un salto improbable, espera una lectura que lo confirme.

Al desplazar el mapa se pausa el seguimiento. La guía recalcula si la posición queda lejos de la ruta. Las rutas son para auto, dependen de OSRM y no incluyen tráfico en vivo ni indicaciones por voz.

## Instalación y modo sin conexión

La app es una PWA (aplicación web instalable). Después de la primera carga guarda la interfaz, los datos, los logos y los límites provinciales. Las calles de OpenStreetMap y los recorridos necesitan conexión; la app no descarga las teselas del mapa en bloque.

- Android/Chrome: usá **Instalar en el teléfono** o la opción de instalación del navegador.
- iPhone/Safari: **Compartir → Agregar a inicio**.

## Datos

La última base local contiene 916 registros geolocalizados: Buenos Aires 762, Córdoba 112 y Formosa 42. Formosa incluye 31 panaderías/heladerías y 11 barberías/peluquerías. La app excluye registros asociados a Grido.

La dirección resuelta o una coordenada publicada no confirma que un negocio siga abierto. Las fichas conservan enlaces a las fuentes consultadas.

- Datos servidos por la app: `public/data/locations.json`.
- Límites provinciales: `public/data/argentina-provincias.geojson`.
- Fuentes de las tablas: `RESEARCH/sources/`.
- Evidencia de consultas Exa y OSM: `RESEARCH/exa/`.
- Datos de investigación y caché de fuentes usados por los importadores: `RESEARCH/data/`.

## Desarrollo

Desde la raíz del proyecto:

```sh
npm ci
npm run dev
```

Para generar la versión de producción, usá `npm run build`. Los scripts de actualización de datos están en `scripts/`; requieren Python 3 y acceso a internet para descargar logos.
