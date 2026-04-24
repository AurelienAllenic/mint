import * as FileSystem from "expo-file-system";

export interface GPXPoint {
  latitude: number;
  longitude: number;
  elevation?: number;
  time?: string;
}

export interface GPXTrack {
  name?: string;
  points: GPXPoint[];
}

/**
 * Parse un fichier GPX et retourne les coordonnées du tracé
 */
export async function parseGPXFile(fileUri: string): Promise<GPXPoint[]> {
  try {
    // Lire le contenu du fichier GPX
    const gpxContent = await FileSystem.readAsStringAsync(fileUri);

    // Parser le XML (simple regex pour extraire les points)
    const points: GPXPoint[] = [];

    // Regex pour extraire les points du track
    const trkptRegex =
      /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>(?:.*?<ele>([^<]+)<\/ele>)?(?:.*?<time>([^<]+)<\/time>)?.*?<\/trkpt>/gs;

    let match;
    while ((match = trkptRegex.exec(gpxContent)) !== null) {
      const [, lat, lon, elevation, time] = match;
      points.push({
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        elevation: elevation ? parseFloat(elevation) : undefined,
        time: time || undefined,
      });
    }

    return points;
  } catch (error) {
    console.error("Erreur lors du parsing du fichier GPX:", error);
    throw new Error("Impossible de parser le fichier GPX");
  }
}

/**
 * Calcule le centre et la région d'affichage basée sur les points GPX
 */
export function calculateGPXRegion(points: GPXPoint[]) {
  if (points.length === 0) {
    return {
      latitude: 48.8566,
      longitude: 2.3522,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    };
  }

  const latitudes = points.map((p) => p.latitude);
  const longitudes = points.map((p) => p.longitude);

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  const latDelta = Math.max(0.01, (maxLat - minLat) * 1.2);
  const lngDelta = Math.max(0.01, (maxLng - minLng) * 1.2);

  return {
    latitude: centerLat,
    longitude: centerLng,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

export function parseGpx(
  xml: string
): { latitude: number; longitude: number }[] {
  try {
    const matches = Array.from(
      xml.matchAll(/<trkpt lat="([\d.-]+)" lon="([\d.-]+)"/g)
    );
    const coords = matches.map((m) => ({
      latitude: parseFloat(m[1]),
      longitude: parseFloat(m[2]),
    }));
    return coords.filter(
      (coord) => !isNaN(coord.latitude) && !isNaN(coord.longitude)
    );
  } catch (err) {
    console.error("Erreur lors du parsing GPX :", err);
    return [];
  }
}
