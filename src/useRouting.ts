import { useEffect, useMemo, useRef, useState } from "react";
import { calculateRoute, distanceBetween, routeProgress, type Destination, type Route, type UserPosition } from "./navigation";

type RoutingStatus = { kind: "idle" } | { kind: "loading" } | { kind: "ready" } | { kind: "error"; message: string };
export function useRouting(destination: Destination | null, position: UserPosition | null) {
  const [route, setRoute] = useState<Route | null>(null);
  const [status, setStatus] = useState<RoutingStatus>({ kind: "idle" });
  const [active, setActive] = useState(false);
  const [revision, setRevision] = useState(0);
  const latestPosition = useRef(position);
  const lastRecalculation = useRef(0);
  const hasPosition = position !== null;
  useEffect(() => { latestPosition.current = position; }, [position]);
  useEffect(() => { setRoute(null); setActive(Boolean(destination)); }, [destination]);
  useEffect(() => {
    const origin = latestPosition.current;
    if (!destination || !origin || !hasPosition) { setRoute(null); setStatus({ kind: "idle" }); return; }
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 18000);
    setStatus({ kind: "loading" });
    lastRecalculation.current = Date.now();
    void calculateRoute(origin, destination.point, controller.signal).then(result => {
      if (!controller.signal.aborted) { setRoute(result); setStatus({ kind: "ready" }); }
    }).catch((error: unknown) => {
      if (controller.signal.aborted && !timedOut) return;
      const message = timedOut ? "El servicio de rutas tardó demasiado. Reintentá o abrí Google Maps." : error instanceof Error ? error.message : "No pudimos calcular la ruta.";
      setStatus({ kind: "error", message });
    }).finally(() => clearTimeout(timeout));
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [destination, hasPosition, revision]);
  const progress = useMemo(() => route && position ? routeProgress(route, position) : null, [route, position]);
  const arrived = Boolean(destination && position && position.accuracy <= 60 && distanceBetween(position, destination.point) < 35);
  useEffect(() => {
    if (!active || !progress || !position || status.kind !== "ready" || position.accuracy > 60 || arrived) return;
    if (progress.offRoute > 70 && Date.now() - lastRecalculation.current > 20000) setRevision(value => value + 1);
  }, [active, progress, position, status.kind, arrived]);
  return { route, status, active, setActive, progress, arrived, retry: () => setRevision(value => value + 1) };
}
