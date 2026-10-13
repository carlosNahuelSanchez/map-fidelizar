# Producto: mapa de locales

## Objetivo

Permitir explorar comercios geolocalizados en Argentina, revisar sus datos de contacto y consultar recorridos desde la ubicación actual.

## Usuarios y datos

La interfaz sirve a quien necesita buscar locales por categoría, nombre, provincia o localidad. La base actual contiene panaderías, heladerías, barberías y peluquerías. Los registros y límites provinciales se sirven como archivos estáticos.

## Capacidades actuales

- Mapa Leaflet con calles de OpenStreetMap y límites provinciales basados en IGN.
- Búsqueda, filtros, agrupación de puntos y fichas de locales con sus fuentes.
- Ubicación GPS, selección de destino, rutas en auto con OSRM y guía textual.
- Instalación PWA y caché sin conexión para la interfaz y datos.

## Criterios de producto

- Mostrar datos con fuentes asociadas y no inventar ubicaciones.
- Informar cuando no hay contacto directo o una ubicación requiere confirmación.
- Separar el mapa de la aplicación de enlaces externos de navegación.
