import * as FileSystem from "expo-file-system";

/**
 * Extrait les adresses e-mail valides d’un contenu CSV / texte.
 * Accepte une colonne « email », plusieurs colonnes, ou un e-mail par ligne.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Normalise le texte lu depuis un fichier : BOM, UTF-16 mal interprété (octets nuls),
 * fins de ligne Windows / Mac.
 */
export function normalizeCsvContentForParsing(raw: string): string {
  if (raw == null || typeof raw !== "string") return "";
  return raw
    .replace(/^\uFEFF/, "")
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

export function parseEmailsFromCsv(raw: string): string[] {
  const text = normalizeCsvContentForParsing(raw);
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

function base64ToUint8Array(b64: string): Uint8Array {
  const bin = atob(b64);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i) & 0xff;
  return u;
}

function decodeUtf8Bytes(bytes: Uint8Array): string {
  try {
    if (typeof TextDecoder !== "undefined") {
      return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    }
  } catch {
    /* noop */
  }
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return s;
}

function decodeUtf16Le(bytes: Uint8Array): string {
  let out = "";
  const len = bytes.length - (bytes.length % 2);
  for (let i = 0; i < len; i += 2) {
    out += String.fromCharCode(bytes[i]! | (bytes[i + 1]! << 8));
  }
  return out;
}

function decodeUtf16Be(bytes: Uint8Array): string {
  let out = "";
  const len = bytes.length - (bytes.length % 2);
  for (let i = 0; i < len; i += 2) {
    out += String.fromCharCode((bytes[i]! << 8) | bytes[i + 1]!);
  }
  return out;
}

/** Heuristique : texte ASCII en UTF-16 LE (octet nul après chaque caractère). */
function looksLikeUtf16LeAscii(bytes: Uint8Array): boolean {
  if (bytes.length < 8) return false;
  let oddZeros = 0;
  let evenZeros = 0;
  const sample = Math.min(bytes.length, 64);
  for (let i = 0; i < sample; i++) {
    if (bytes[i] === 0) {
      if (i % 2 === 1) oddZeros++;
      else evenZeros++;
    }
  }
  return oddZeros >= 3 && evenZeros <= 1;
}

function decodeBytesToString(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  ) {
    return decodeUtf8Bytes(bytes.subarray(3));
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return decodeUtf16Le(bytes.subarray(2));
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return decodeUtf16Be(bytes.subarray(2));
  }
  if (looksLikeUtf16LeAscii(bytes)) {
    return decodeUtf16Le(bytes);
  }
  return decodeUtf8Bytes(bytes);
}

/**
 * Lit un fichier local (URI DocumentPicker / cache).
 * « Vide » = aucun caractère utile après normalisation.
 *
 * Plusieurs stratégies : certaines URI `content://` (Android) renvoient une chaîne
 * vide avec readAsStringAsync alors que fetch(arrayBuffer) ou Base64 fonctionne.
 */
export async function readCsvFileAsString(uri: string): Promise<{
  content: string;
  isEmptyFile: boolean;
}> {
  let bestRaw = "";
  let bestNormLen = 0;

  const consider = (r: unknown) => {
    const s = typeof r === "string" ? r : "";
    const n = normalizeCsvContentForParsing(s).length;
    if (n > bestNormLen) {
      bestRaw = s;
      bestNormLen = n;
    }
  };

  try {
    const s = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    consider(s);
  } catch {
    /* suivant */
  }

  try {
    const b64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (typeof b64 === "string" && b64.length > 0) {
      const bytes = base64ToUint8Array(b64);
      if (bytes.length > 0) consider(decodeBytesToString(bytes));
    }
  } catch {
    /* suivant */
  }

  try {
    const res = await fetch(uri);
    if (res.ok) {
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      if (bytes.length > 0) consider(decodeBytesToString(bytes));
    }
  } catch {
    /* suivant */
  }

  return {
    content: bestRaw,
    isEmptyFile: bestNormLen === 0,
  };
}

/**
 * Sur Android, les URI `content://` renvoyées par DocumentPicker ne se lisent pas
 * toujours avec FileSystem / fetch (lecture vide). Copie obligatoire vers le cache app.
 */
export async function resolveDocumentPickerUriForRead(uri: string): Promise<string> {
  if (!uri.startsWith("content://")) {
    return uri;
  }
  const base = FileSystem.cacheDirectory;
  if (!base) return uri;
  try {
    const dest = `${base}csv_import_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.csv`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    return uri;
  }
}

/** À utiliser après getDocumentAsync : résout content:// puis lit le fichier. */
export async function readCsvFromPickedDocument(uri: string): Promise<{
  content: string;
  isEmptyFile: boolean;
}> {
  const local = await resolveDocumentPickerUriForRead(uri);
  let result = await readCsvFileAsString(local);
  if (!result.isEmptyFile) return result;
  if (local !== uri) {
    result = await readCsvFileAsString(uri);
  }
  return result;
}
