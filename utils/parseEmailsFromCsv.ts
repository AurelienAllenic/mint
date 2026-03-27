/**
 * Extrait les adresses e-mail valides d’un contenu CSV / texte.
 * Accepte une colonne « email », plusieurs colonnes, ou un e-mail par ligne.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseEmailsFromCsv(raw: string): string[] {
  const text = raw.replace(/^\uFEFF/, "").trim();
  if (!text) return [];

  const loose = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const seen = new Set<string>();
  const out: string[] = [];

  let m: RegExpExecArray | null;
  while ((m = loose.exec(text)) !== null) {
    let e = m[0].replace(/[.,;\s]+$/g, "");
    if (EMAIL_REGEX.test(e)) {
      const key = e.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(e);
      }
    }
  }

  return out;
}

/** Fusionne le texte saisi et des e-mails importés, sans doublons (insensible à la casse). */
export function mergeUniqueEmails(existingText: string, extra: string[]): string {
  const fromText = existingText
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter((s) => EMAIL_REGEX.test(s));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of [...fromText, ...extra]) {
    const k = e.toLowerCase();
    if (EMAIL_REGEX.test(e) && !seen.has(k)) {
      seen.add(k);
      out.push(e);
    }
  }
  return out.join("\n");
}
