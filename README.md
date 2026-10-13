# Mapa de locales

Aplicación web para consultar locales en un mapa de Argentina. Usa React, TypeScript, Leaflet y OpenStreetMap. Los datos que consume el navegador están en `public/data/locations.json`.

## Iniciar en local

Requisitos: Node.js y npm instalados.

Desde la carpeta raíz del proyecto, ejecutá:

```sh
npm install
npm run dev
```

Vite mostrará una dirección local, normalmente `http://localhost:5173`. Abrila en el navegador. Para probar la ubicación, permití el acceso a la ubicación del dispositivo; el navegador suele requerir `localhost` o HTTPS.

Para generar una versión de producción:

```sh
npm run build
```

Para servir localmente esa versión ya compilada:

```sh
npm run preview
```

## Agregar locales

Pedile al agente que agregue locales con datos verificables y que actualice tanto la fuente de investigación como los datos que usa la aplicación. Por ejemplo:

> Agregá estos locales a la provincia y rubro indicados. Verificá nombre, dirección, localidad, coordenadas, sitio o perfil oficial y fuentes. Revisá duplicados y sucursales; no inventes coordenadas ni datos faltantes. Actualizá la documentación en `RESEARCH/sources/` y los archivos de datos correspondientes en `RESEARCH/data/` y `public/data/locations.json`. Conservá el formato y los campos existentes.

Incluí en el pedido los enlaces o la información inicial disponible. Si no se puede confirmar una coordenada, el local no debe aparecer en el mapa como si su ubicación fuera exacta: registralo como pendiente siguiendo el formato existente. Después de modificar datos, pedile al agente que valide el JSON y compile el proyecto.

El archivo que carga la aplicación es `public/data/locations.json`. Las fuentes editables están en `RESEARCH/sources/`; los archivos de `RESEARCH/data/` son datos auxiliares que usan los scripts. No ejecutes scripts de importación sin revisar primero qué archivos regeneran: pueden reemplazar `public/data/locations.json` y descargar imágenes de logos desde sitios externos.

## Carpetas principales

- `src/`: interfaz, mapa, geolocalización, filtros y navegación.
- `public/`: recursos estáticos que se publican con la aplicación, incluidos el GeoJSON de provincias, logos, iconos y `data/locations.json`.
- `RESEARCH/`: documentación, investigación, fuentes y datos auxiliares; no forma parte de la interfaz publicada.
- `scripts/`: herramientas Python para convertir o combinar las fuentes con los datos de la aplicación.
- `tests/`: pruebas automatizadas con Playwright.

## Qué hay en RESEARCH

- `RESEARCH/README.md`: índice de las carpetas de investigación.
- `RESEARCH/docs/USO_MAPA.md`: instrucciones para usar el mapa, ubicación, rutas e instalación.
- `RESEARCH/docs/PRODUCT.md`: objetivo, usuarios y criterios del producto.
- `RESEARCH/docs/funcionalidades-actuales.md`: resumen de funciones, servicios externos, límites y posibles siguientes etapas.
- `RESEARCH/docs/DESIGN.md`: guía visual y decisiones de diseño de la interfaz.
- `RESEARCH/sources/`: tablas documentadas de locales y sus enlaces de referencia.
- `RESEARCH/data/`: datos intermedios y caché de fuentes de logos que leen o generan los scripts.
- `RESEARCH/exa/`: evidencia y resultados de búsquedas de Exa, OpenStreetMap y rutas, cuando están disponibles.

## Scripts de datos

Los scripts requieren Python 3. Se ejecutan desde la raíz del proyecto:

```sh
python scripts/import_readme_locals.py
python scripts/import_hair_locals.py
python scripts/enrich_formosa.py
```

- `import_readme_locals.py`: convierte las tablas generales de `RESEARCH/sources/` a registros y reconstruye `public/data/locations.json`. También combina los aportes de los otros dos scripts y puede descargar logos oficiales. Puede sobrescribir el JSON publicado.
- `import_hair_locals.py`: convierte la tabla de barberías y peluquerías, actualiza `RESEARCH/data/hair-locations.json`, la caché de logos y los registros de peluquerías en `public/data/locations.json`.
- `enrich_formosa.py`: guarda el relevamiento complementario de Formosa en `RESEARCH/data/formosa-research.json`, actualiza la caché de logos y aplica ese relevamiento a `public/data/locations.json`.

Los scripts consultan páginas externas para descargar imágenes de logos cuando faltan. No necesitan una API key de Google Maps; el mapa de la aplicación usa OpenStreetMap.

## Comandos disponibles

- `npm run dev`: inicia el servidor de desarrollo.
- `npm run build`: revisa los tipos TypeScript y genera el sitio en `dist/`.
- `npm run preview`: sirve localmente la versión compilada.
- `npm run test:e2e`: ejecuta las pruebas de extremo a extremo de Playwright.
# map-fidelizar
# map-fidelizar
