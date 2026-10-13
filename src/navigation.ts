import { z } from "zod";

export type Point = { lat: number; lng: number };
export type Destination = { point: Point; label: string };
export type UserPosition = Point & { accuracy: number; timestamp: number };
export type MapIntent = (
  | { kind: "country" }
  | { kind: "province"; province: string }
  | { kind: "local"; localId: string }
  | { kind: "zoom"; amount: number }
  | { kind: "route" }
);
export type MapCommand = { serial: number } & MapIntent;

const CoordinateSchema = z.tuple([z.number(), z.number()]);
const GeometrySchema = z.object({ type: z.literal("LineString"), coordinates: z.array(CoordinateSchema).min(2) });
const StepSchema = z.object({
  distance: z.number(), duration: z.number(), name: z.string(),
  maneuver: z.object({ type: z.string(), modifier: z.string().optional(), exit: z.number().optional(), location: CoordinateSchema }),
});
const RouteSchema = z.object({
  distance: z.number(), duration: z.number(), geometry: GeometrySchema,
  legs: z.array(z.object({ steps: z.array(StepSchema) })),
});
const ResponseSchema = z.object({ code: z.string(), routes: z.array(RouteSchema).optional() });
export type Route = z.infer<typeof RouteSchema>;
export type RouteStep = z.infer<typeof StepSchema>;

export async function calculateRoute(origin: Point, destination: Point, signal: AbortSignal): Promise<Route> {
  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=true`, { signal });
  if (!response.ok) throw new Error("El servicio de rutas no respondió. Podés reintentar o abrir Google Maps.");
  const payload: unknown = await response.json();
  const result = ResponseSchema.safeParse(payload);
  if (!result.success) throw new Error("El servicio devolvió una ruta incompleta. Reintentá o abrí Google Maps.");
  const route = result.data.routes?.[0];
  if (result.data.code !== "Ok" || !route) throw new Error("No encontramos una ruta por calles hasta ese punto. Elegí un destino cercano a una calle.");
  return route;
}

export function distanceBetween(a: Point, b: Point): number {
  const radians = Math.PI / 180;
  const lat = (a.lat + b.lat) / 2 * radians;
  return Math.hypot((b.lat - a.lat) * radians, (b.lng - a.lng) * radians * Math.cos(lat)) * 6371000;
}

export function routeProgress(route: Route, position: Point) {
  let travelled = 0;
  let bestTravelled = 0;
  let nearestDistance = Infinity;
  const coordinates = route.geometry.coordinates;
  for (let index = 1; index < coordinates.length; index++) {
    const a = coordinates[index - 1];
    const b = coordinates[index];
    if (!a || !b) continue;
    const start = { lng: a[0], lat: a[1] };
    const end = { lng: b[0], lat: b[1] };
    const factor = Math.cos(position.lat * Math.PI / 180);
    const dx = (end.lng - start.lng) * factor;
    const dy = end.lat - start.lat;
    const denominator = dx * dx + dy * dy;
    const t = denominator === 0 ? 0 : Math.max(0, Math.min(1, ((position.lng - start.lng) * factor * dx + (position.lat - start.lat) * dy) / denominator));
    const projected = { lat: start.lat + (end.lat - start.lat) * t, lng: start.lng + (end.lng - start.lng) * t };
    const distance = distanceBetween(position, projected);
    const segmentLength = distanceBetween(start, end);
    if (distance < nearestDistance) { nearestDistance = distance; bestTravelled = travelled + segmentLength * t; }
    travelled += segmentLength;
  }
  const fraction = travelled ? Math.min(1, bestTravelled / travelled) : 0;
  const remaining = route.distance * (1 - fraction);
  const steps = route.legs.flatMap(leg => leg.steps);
  let stepStart = 0;
  let nextStep = steps[steps.length - 1];
  let toManeuver = remaining;
  for (const step of steps) {
    if (stepStart > route.distance * fraction + 12) { nextStep = step; toManeuver = stepStart - route.distance * fraction; break; }
    stepStart += step.distance;
  }
  return { remaining, seconds: route.duration * (1 - fraction), offRoute: nearestDistance, nextStep, toManeuver };
}

export function maneuverText(step: RouteStep): string {
  const road = step.name ? ` en ${step.name}` : "";
  const directions: Record<string, string> = { right: "a la derecha", left: "a la izquierda", "slight right": "levemente a la derecha", "slight left": "levemente a la izquierda", "sharp right": "a la derecha", "sharp left": "a la izquierda", uturn: "y cambiá de sentido", straight: "derecho" };
  const direction = directions[step.maneuver.modifier ?? "straight"] ?? "derecho";
  if (step.maneuver.type === "arrive") return "Llegá al destino";
  if (step.maneuver.type === "depart") return `Comenzá el recorrido${road}`;
  if (step.maneuver.type.includes("roundabout") || step.maneuver.type.includes("rotary")) return `Tomá ${step.maneuver.exit ? `la salida ${step.maneuver.exit}` : "la salida"} de la rotonda${road}`;
  if (step.maneuver.type === "new name") return `Continuá${road}`;
  if (step.maneuver.type === "fork") return `Mantenete ${direction}${road}`;
  if (["turn", "end of road"].includes(step.maneuver.type)) return `${step.maneuver.modifier === "straight" ? "Seguí" : "Girá"} ${direction}${road}`;
  if (step.maneuver.type === "merge") return `Incorporate ${direction}${road}`;
  return `Continuá ${direction}${road}`;
}

export function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1).replace(".", ",")} km` : `${Math.max(0, Math.round(meters / 10) * 10)} m`;
}
export function mapsNavigationUrl(destination: Destination): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${destination.point.lat},${destination.point.lng}&travelmode=driving&dir_action=navigate`;
}
