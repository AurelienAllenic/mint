import type { Sponsor } from "@/types/api";

/** Normalise un sponsor renvoyé par GET /sponsors ou peuplé sur une course. */
export function normalizeSponsor(raw: any): Sponsor | null {
  if (raw == null) return null;
  const id = String(raw.id ?? raw._id ?? "");
  if (!id) return null;
  return {
    id,
    name: String(raw.name ?? ""),
    image: raw.image != null ? String(raw.image) : null,
    ...(raw.websiteUrl != null
      ? { websiteUrl: String(raw.websiteUrl) }
      : {}),
  };
}

/**
 * Liste de sponsors pour affichage depuis une course :
 * `sponsors[]` (priorité) ou ancien champ `sponsor` unique.
 */
export function sponsorsFromRace(race: any): Sponsor[] {
  const out: Sponsor[] = [];
  const list = race?.sponsors;
  if (Array.isArray(list)) {
    for (const item of list) {
      const s = typeof item === "string" ? { id: item, name: "", image: null, websiteUrl: null } : normalizeSponsor(item);
      if (s) out.push(s);
    }
    return out;
  }
  if (race?.sponsor != null) {
    const s = typeof race.sponsor === "string" ? { id: race.sponsor, name: "", image: null, websiteUrl: null } : normalizeSponsor(race.sponsor);
    if (s) out.push(s);
  }
  return out;
}
