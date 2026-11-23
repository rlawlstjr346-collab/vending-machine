const RAW_HIGHLIGHT_RE = /==([^=]+?)==/g;
const LOOSE_MARKER_RE = /==+/g;
const EMOJI_RE =
  /[\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu;

const FORBIDDEN_REPLACEMENTS: Array<[RegExp, string]> = [
  [/준비\s*중/gi, "진행 단계"],
  [/coming\s+soon/gi, "예정"],
  [/샘플\s*데이터/gi, "실측 데이터"],
];

export function stripHighlightMarkers(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(RAW_HIGHLIGHT_RE, "$1")
    .replace(LOOSE_MARKER_RE, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeEditorialText(input: string | null | undefined): string {
  if (!input) return "";
  let text = stripHighlightMarkers(input);
  text = text.replace(EMOJI_RE, "");
  for (const [pattern, replacement] of FORBIDDEN_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  return text.replace(/\s+/g, " ").trim();
}

export function isValidHttpUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === "#" || trimmed.startsWith("javascript:")) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      parsed.hostname.includes(".") &&
      !parsed.hostname.endsWith("example.com") &&
      parsed.hostname !== "localhost"
    );
  } catch {
    return false;
  }
}

export function slugifyAscii(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ");
}
