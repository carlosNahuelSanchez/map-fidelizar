import { z } from "zod";

const PositionSchema = z.tuple([z.number(), z.number()]).rest(z.number());
const PolygonSchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(z.array(PositionSchema)),
});
const MultiPolygonSchema = z.object({
  type: z.literal("MultiPolygon"),
  coordinates: z.array(z.array(z.array(PositionSchema))),
});
const ProvinceFeatureSchema = z.object({
  type: z.literal("Feature"),
  properties: z.object({ name: z.string(), code: z.string() }),
  geometry: z.discriminatedUnion("type", [PolygonSchema, MultiPolygonSchema]),
});

export const ProvinceCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(ProvinceFeatureSchema),
});

export type ProvinceFeature = z.infer<typeof ProvinceFeatureSchema>;
export type ProvinceCollection = z.infer<typeof ProvinceCollectionSchema>;

export async function loadProvinceBoundaries(): Promise<ProvinceCollection> {
  const response = await fetch("/data/argentina-provincias.geojson");

  if (!response.ok) {
    throw new Error("No se pudieron cargar los límites provinciales.");
  }

  const payload: unknown = await response.json();
  return ProvinceCollectionSchema.parse(payload);
}
