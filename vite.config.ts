import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: "autoUpdate",
    includeAssets: ["icons/apple-touch-icon.png", "icons/app-icon.svg"],
    manifest: {
      id: "/", name: "Relevamiento · Mapa de locales", short_name: "Relevamiento",
      description: "Comercios de cercanía, ubicación y recorridos por Argentina.",
      lang: "es-AR", start_url: "/", scope: "/", display: "standalone",
      theme_color: "#253d35", background_color: "#f4f6f3",
      icons: [
        { src: "/icons/app-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/app-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icons/app-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    workbox: {
      globPatterns: ["**/*.{js,css,html,png,jpg,jpeg,webp,svg,json,geojson}"],
      maximumFileSizeToCacheInBytes: 3000000,
      navigateFallback: "/index.html",
      cleanupOutdatedCaches: true,
      runtimeCaching: [{
        urlPattern: /\/data\/.*\.(?:json|geojson)$/,
        handler: "NetworkFirst", options: { cacheName: "relevamiento-data", networkTimeoutSeconds: 5 },
      }],
    },
  })],
});
