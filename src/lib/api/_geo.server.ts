/**
 * Geo helpers for meet-plan distance calculation and AMap geocoding.
 */

const AMAP_GEOCODE_URL = "https://restapi.amap.com/v3/geocode/geo";

/** City → centroid fallback when AMap is unavailable. */
const CITY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  shenzhen: { lat: 22.5431, lng: 114.0579 },
  shanghai: { lat: 31.2304, lng: 121.4737 },
  hongkong: { lat: 22.3193, lng: 114.1694 },
  "hong kong": { lat: 22.3193, lng: 114.1694 },
};

export function getCityCentroid(city: string): { lat: number; lng: number } {
  return CITY_CENTROIDS[city.toLowerCase()] ?? { lat: 0, lng: 0 };
}

/**
 * Haversine distance in kilometers.
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Convert straight-line km to an estimated walking minute count.
 * Uses a conservative 4.5 km/h walking speed + 15% overhead for turns.
 */
export function kmToWalkingMinutes(km: number): number {
  return Math.max(3, Math.round((km / 4.5) * 60 * 1.15));
}

/**
 * Geocode a city name via AMap. Returns centroid fallback if AMap key
 * is missing or the call fails.
 */
export async function geocodeCity(
  city: string,
): Promise<{ lat: number; lng: number; source: "amap" | "fallback" }> {
  const key = process.env.AMAP_WEB_API_KEY;
  if (!key) {
    return { ...getCityCentroid(city), source: "fallback" };
  }

  const url = new URL(AMAP_GEOCODE_URL);
  url.searchParams.set("key", key);
  url.searchParams.set("address", city);
  url.searchParams.set("output", "JSON");

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return { ...getCityCentroid(city), source: "fallback" };
    const json = (await res.json()) as {
      status?: string;
      geocodes?: Array<{ location?: string }>;
    };
    const location = json.geocodes?.[0]?.location;
    if (!location) return { ...getCityCentroid(city), source: "fallback" };
    const [lng, lat] = location.split(",").map(Number);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { ...getCityCentroid(city), source: "fallback" };
    }
    return { lat, lng, source: "amap" };
  } catch {
    return { ...getCityCentroid(city), source: "fallback" };
  }
}

/**
 * Parse a simple opening_hours string and check if the venue is likely
 * open at the given time. Supports formats like:
 *   "11:00-22:00"
 *   "周一至周日 11:00-22:00"
 *   "10:00-14:00,17:00-22:00"
 * Returns true if we can't parse (fail-open so we don't drop venues).
 */
export function isVenueOpenAt(openingHours: string | null | undefined, date: Date): boolean {
  if (!openingHours || openingHours.includes("休息") || openingHours.includes("Closed")) {
    return false;
  }

  // Extract all HH:MM-HH:MM ranges.
  const ranges = openingHours.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/g);
  if (!ranges || ranges.length === 0) return true; // fail-open

  const minutes = date.getHours() * 60 + date.getMinutes();
  for (const r of ranges) {
    const m = r.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (!m) continue;
    const [, sh, sm, eh, em] = m.map(Number);
    const start = sh * 60 + sm;
    let end = eh * 60 + em;
    if (end < start) end += 24 * 60; // overnight
    if (minutes >= start && minutes <= end) return true;
  }
  return false;
}

/**
 * Midpoint between two lat/lng points.
 */
export function midpoint(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): { lat: number; lng: number } {
  return {
    lat: (lat1 + lat2) / 2,
    lng: (lng1 + lng2) / 2,
  };
}
