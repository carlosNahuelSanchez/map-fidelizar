import { z } from "zod";

const LocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["panadería", "heladería", "barbería", "peluquería"]),
  niche: z.enum(["PAN", "HEL", "BAR", "PEL"]),
  province: z.string(),
  jurisdiction: z.string(),
  address: z.string().optional(),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  locationNote: z.string().optional(),
  businessStatus: z.string().optional(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  website: z.string().url().nullable(),
  instagram: z.string().url().nullable(),
  contactType: z.string(),
  exaStatus: z.string(),
  sources: z.array(z.string().url()),
  brandId: z.string(),
  logo: z.string().nullable(),
  logoSource: z.string().url().nullable(),
});

const LocationsPayloadSchema = z.object({
  sourceReadme: z.string(),
  generatedAt: z.string(),
  countGeolocated: z.number(),
  countWithoutCoordinates: z.number(),
  logoCount: z.number(),
  businesses: z.array(LocationSchema),
});

export type Local = z.infer<typeof LocationSchema>;

export async function loadLocations(): Promise<Local[]> {
  const response = await fetch("/data/locations.json");

  if (!response.ok) {
    throw new Error("No se pudieron cargar los locales.");
  }

  const payload: unknown = await response.json();
  return LocationsPayloadSchema.parse(payload).businesses.filter(local =>
    !/grido/i.test(`${local.name} ${local.brandId} ${local.website ?? ""} ${local.instagram ?? ""}`),
  );
}
