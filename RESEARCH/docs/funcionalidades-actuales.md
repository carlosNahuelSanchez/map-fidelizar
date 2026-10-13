# Funcionalidades actuales

Revisión del código en `src/`, los datos publicados en `public/data/` y la configuración de Vite.

## Lo que ya hace

1. **Muestra un mapa nacional.** Leaflet dibuja límites de provincias y solicita teselas de OpenStreetMap. Los puntos y límites se cargan desde archivos JSON y GeoJSON locales.
2. **Busca y filtra 916 locales.** Permite buscar por nombre, dirección y localidad; filtra panaderías, heladerías, barberías/peluquerías y las provincias con datos. Al elegir Formosa aparece un filtro adicional por localidad. La lista muestra hasta 30 resultados por vez.
3. **Ayuda a explorar los puntos.** Los locales cercanos se agrupan según el nivel de zoom. Al acercar, muestra pines individuales con logo o iniciales. La ficha ofrece dirección, coordenadas, enlaces de contacto, web, Instagram y fuente cuando esos datos existen.
4. **Permite marcar un destino y orientarse.** El usuario puede elegir un local o tocar el mapa. Si concede permiso, la app obtiene ubicación GPS. OSRM calcula una ruta para auto; la interfaz muestra instrucciones, tiempo y distancia, sigue el avance, detecta llegada y permite reintentar o recalcular.
5. **Se adapta al teléfono.** El panel de búsqueda se vuelve un menú lateral con navegación por teclado, cierre con Escape y controles de zoom para pantallas pequeñas.
6. **Puede instalarse como PWA.** Vite genera el manifiesto y el service worker. Se guardan la interfaz, los locales, los logos y los límites para uso sin conexión tras la primera carga.

## Qué servicios externos intervienen

- **OpenStreetMap:** imágenes de las calles y datos cartográficos.
- **OSRM:** cálculo de rutas; se consulta cuando hay origen GPS y destino.
- **Navegación externa:** hay un enlace opcional que abre Google Maps para guiar al usuario fuera de la app. No carga Google Maps dentro de la aplicación ni requiere una API key de Google Maps.
- **Enlaces de las fichas:** webs, Instagram, WhatsApp, correo y páginas que documentan cada fuente.

Sin conexión se mantienen la interfaz y los registros guardados; las calles del mapa y el cálculo de rutas necesitan internet.

## Límites actuales observables

- El conjunto cubre Buenos Aires, Córdoba y Formosa; no hay un flujo de administración para editar datos desde la interfaz.
- Los registros se actualizan con scripts en `scripts/` y quedan consolidados en un JSON estático. No hay API de negocio ni base de datos en el servidor.
- La guía de rutas es para auto, depende del servicio público OSRM, no incluye tráfico y no emite instrucciones de voz.
- La caché sin conexión guarda datos y recursos de la app, pero no descarga previamente las teselas de OpenStreetMap.
- La existencia de una coordenada o fuente no confirma que el negocio siga abierto. La base debe revisarse manualmente.

## Candidatos para la siguiente etapa

1. Administración de locales y un flujo de revisión de cambios.
2. Estado de vigencia y fecha de verificación para cada ficha.
3. Cobertura territorial configurable y filtros por zona.
4. Mejoras de rutas, como modos adicionales o navegación hablada, si el servicio y el producto lo justifican.

Esta lista propone opciones a partir de los límites técnicos; todavía no define una prioridad ni un compromiso de implementación.
