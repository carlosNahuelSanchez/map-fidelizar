# RESEARCH

Documentación del producto, fuentes de los datos de locales y evidencia de investigación. Esta carpeta no se publica como parte de la aplicación.

## Carpetas

- `docs/`: guía de uso, diseño, descripción del producto y análisis de capacidades.
- `sources/`: tablas originales con locales y sus referencias.
- `exa/`: respuestas y evidencia de consultas de Exa, OpenStreetMap y rutas.
- `data/`: archivos auxiliares que usan los scripts para reconstruir `public/data/locations.json`.

El código y los archivos estáticos que consume el navegador están en `src/` y `public/`. Desde la raíz se inicia el entorno con `npm run dev` y se compila con `npm run build`.
