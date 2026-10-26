# Full Map

Mapa base de Argentina con Leaflet y OpenStreetMap. Incluye límites provinciales, controles de zoom, ubicación GPS, selección de un destino en el mapa y cálculo de rutas por calles.

## Iniciar en local

Requisitos: Node.js y npm.

Desde la carpeta del proyecto, ejecutá:

```sh
npm install
npm run dev
```

Abrí la dirección local que muestra Vite, normalmente `http://localhost:5173`. Para usar el GPS, habilitá el permiso de ubicación del navegador. La ubicación funciona en `localhost` o en un sitio servido con HTTPS.

## Compilar

```sh
npm run build
```

La versión compilada queda en `dist/`. Para verla localmente:

```sh
npm run preview
```

## Datos y servicios

- `public/data/argentina-provincias.geojson` contiene los límites provinciales dibujados en el mapa.
- OpenStreetMap provee las imágenes de calles.
- OSRM calcula las rutas en auto. Requiere conexión a internet.
- El GPS se obtiene con el permiso del navegador y permanece en el dispositivo.
- El enlace opcional de navegación externa abre Google Maps; el mapa de esta aplicación sigue usando OpenStreetMap.
