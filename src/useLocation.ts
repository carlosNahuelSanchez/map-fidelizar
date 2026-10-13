import { useCallback, useEffect, useRef, useState } from "react";
import { distanceBetween, type UserPosition } from "./navigation";

type LocationStatus = { kind: "idle" } | { kind: "loading" } | { kind: "ready" } | { kind: "imprecise"; message: string } | { kind: "error"; message: string };
const MAX_ACCURACY = 100;
export function useLocation() {
  const [position, setPosition] = useState<UserPosition | null>(null);
  const [status, setStatus] = useState<LocationStatus>({ kind: "idle" });
  const [enabled, setEnabled] = useState(false);
  const watch = useRef<number | null>(null);
  const generation = useRef(0);
  const accepted = useRef<UserPosition | null>(null);
  const candidate = useRef<UserPosition | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = useCallback(() => {
    generation.current += 1;
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    if (timer.current !== null) clearTimeout(timer.current);
    watch.current = null; timer.current = null; accepted.current = null; candidate.current = null;
  }, []);
  const disable = useCallback(() => {
    clear(); setEnabled(false); setPosition(null); setStatus({ kind: "idle" });
  }, [clear]);
  const enable = useCallback(() => {
    if (!window.isSecureContext) { setStatus({ kind: "error", message: "Para habilitar ubicación, abrí la app con HTTPS o en localhost." }); return; }
    if (!navigator.geolocation) { setStatus({ kind: "error", message: "Este navegador no permite acceder a tu ubicación." }); return; }
    clear(); setPosition(null); setEnabled(true); setStatus({ kind: "loading" });
    const request = generation.current;
    timer.current = setTimeout(() => {
      if (!accepted.current && request === generation.current) setStatus({ kind: "imprecise", message: "Seguimos esperando una señal precisa. Activá la ubicación precisa del dispositivo; en una computadora la ubicación puede ser aproximada." });
    }, 25000);
    watch.current = navigator.geolocation.watchPosition(
      result => {
        if (request !== generation.current) return;
        const next = { lat: result.coords.latitude, lng: result.coords.longitude, accuracy: result.coords.accuracy, timestamp: result.timestamp };
        if (![next.lat, next.lng, next.accuracy, next.timestamp].every(Number.isFinite) || Math.abs(next.lat) > 90 || Math.abs(next.lng) > 180 || next.accuracy < 0 || Date.now() - next.timestamp > 20000) return;
        if (next.accuracy > MAX_ACCURACY) {
          setStatus({ kind: "imprecise", message: `Señal aproximada: ±${Math.round(next.accuracy)} m. Esperando mayor precisión antes de mover el mapa. Activá la ubicación precisa del dispositivo.` });
          return;
        }
        const previous = accepted.current;
        if (previous && next.timestamp <= previous.timestamp) return;
        if (previous) {
          const seconds = Math.max(1, (next.timestamp - previous.timestamp) / 1000);
          const unexpectedJump = distanceBetween(previous, next) > Math.max(250, seconds * 70 + previous.accuracy + next.accuracy);
          if (unexpectedJump && (!candidate.current || next.timestamp - candidate.current.timestamp > 15000 || distanceBetween(candidate.current, next) > Math.max(100, next.accuracy + candidate.current.accuracy))) {
            candidate.current = next;
            setStatus({ kind: "imprecise", message: "La señal cambió de forma brusca. Confirmando la posición antes de mover el mapa." });
            return;
          }
        }
        candidate.current = null; accepted.current = next;
        if (timer.current !== null) clearTimeout(timer.current);
        timer.current = null; setPosition(next); setStatus({ kind: "ready" });
      },
      error => {
        if (request !== generation.current) return;
        const message = error.code === 1 ? "El permiso de ubicación está desactivado. Habilitá la ubicación precisa en los permisos del dispositivo y del navegador." : error.code === 2 ? "No pudimos obtener una señal de ubicación. Revisá el GPS y reintentá." : "La ubicación tardó demasiado. Seguimos buscando; activá el GPS o reintentá.";
        if (error.code === 1) { clear(); setEnabled(false); setPosition(null); }
        setStatus({ kind: "error", message });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 25000 },
    );
  }, [clear]);
  useEffect(() => clear, [clear]);
  return { position, status, enabled, enable, disable };
}
