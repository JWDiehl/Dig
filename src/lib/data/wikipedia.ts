/**
 * Wikipedia MediaWiki API client.
 *
 * Fetches raw wikitext for an artist article and returns an array of
 * upstream influence names.
 *
 * Parsing strategy (in order):
 *  1. {{Infobox musical artist | influences = ... }} field
 *  2. Fallback: === Influences === article-body section wikilinks
 *
 * The infobox field is almost never populated for notable artists
 * (Wikipedia editors removed it as too subjective), so the section
 * fallback is used for nearly all mainstream artists.
 *
 * Contract:
 *  - No article / no infobox / no influences data → returns []
 *  - Network failure or non-OK HTTP response      → throws DataSourceError
 */

import { DataSourceError } from "../errors";

// ─── Constants ────────────────────────────────────────────────────────────────

const WIKI_API_BASE = "https://en.wikipedia.org/w/api.php";
const WIKI_USER_AGENT = "dig/0.1.0 (jondiehl22@gmail.com)";
const WIKI_HEADERS: Record<string, string> = {
  "User-Agent": WIKI_USER_AGENT,
  Accept: "application/json",
};

// ─── MediaWiki API response types ─────────────────────────────────────────────

interface WikiPage {
  pageid?: number;
  missing?: boolean;
  revisions?: Array<{
    slots: {
      main: {
        content: string;
      };
    };
  }>;
}

interface WikiApiResponse {
  query?: {
    pages?: WikiPage[];
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns an array of artist name strings that influenced the given artist,
 * parsed from the Wikipedia article.
 *
 * Returns an empty array when:
 *   - No Wikipedia article exists
 *   - No infobox influences field and no Influences section
 *
 * @throws {DataSourceError} on network failure or non-OK HTTP response
 */
export async function getUpstreamInfluences(
  artistName: string,
): Promise<string[]> {
  const wikitext = await fetchWikitext(artistName);
  if (wikitext === null) return [];
  return parseInfluences(wikitext);
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchWikitext(artistName: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    titles: artistName,
    prop: "revisions",
    rvprop: "content",
    rvslots: "main",
    format: "json",
    formatversion: "2",
  });

  const url = `${WIKI_API_BASE}?${params.toString()}`;

  let response: Response;
  try {
    response = await fetch(url, { headers: WIKI_HEADERS });
  } catch (err) {
    throw new DataSourceError(
      `Wikipedia: network error fetching "${artistName}": ${String(err)}`,
    );
  }

  if (!response.ok) {
    throw new DataSourceError(
      `Wikipedia: HTTP ${response.status} ${response.statusText} for "${artistName}"`,
    );
  }

  let data: WikiApiResponse;
  try {
    data = (await response.json()) as WikiApiResponse;
  } catch (err) {
    throw new DataSourceError(
      `Wikipedia: invalid JSON response for "${artistName}": ${String(err)}`,
    );
  }

  const pages = data?.query?.pages;
  if (!pages || pages.length === 0) return null;

  const page = pages[0];
  if (page.missing === true) return null;
  if (!page.revisions || page.revisions.length === 0) return null;

  return page.revisions[0].slots.main.content;
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

/**
 * Parse upstream influences from raw wikitext.
 *
 * Strategy:
 *  1. Try {{Infobox musical artist | influences = ...}} field.
 *  2. If empty, fall back to extracting wikilinks from the
 *     "=== Influences ===" article-body section.
 *
 * Exported for direct unit testing.
 */
export function parseInfluences(wikitext: string): string[] {
  // Strategy 1 — infobox field
  const infoboxResult = parseInfluencesFromInfobox(wikitext);
  if (infoboxResult.length > 0) return infoboxResult;

  // Strategy 2 — article body "Influences" section
  return parseInfluencesFromSection(wikitext);
}

// ─── Strategy 1: Infobox field ────────────────────────────────────────────────

function parseInfluencesFromInfobox(wikitext: string): string[] {
  // Step 1 — find the infobox
  const infoboxStart = wikitext.search(/\{\{Infobox musical artist/i);
  if (infoboxStart === -1) return [];

  const infoboxText = wikitext.slice(infoboxStart);

  // Step 2 — extract the influences field using nesting-aware extraction.
  // Naive regex (e.g. [^|]*?) fails because | appears inside [[...|...]] wikilinks.
  const raw = extractField(infoboxText, "influences");
  if (raw === null || raw.trim() === "" || raw.trim().startsWith("<!--"))
    return [];

  // Step 3 — decode HTML entities
  let value = decodeHtmlEntities(raw);

  // Step 4 — handle flatlist / hlist wrappers
  value = value.replace(
    /\{\{(?:flatlist|hlist)\s*\|([\s\S]*?)\}\}/gi,
    (_match: string, inner: string) => inner,
  );

  // Step 5 — extract wikilinks
  const wikilinkNames = extractWikilinks(value);
  if (wikilinkNames.length > 0) {
    return wikilinkNames.map(cleanName).filter(Boolean);
  }

  // Step 6 — fall back to splitting plain text
  const parts = value
    .replace(/<br\s*\/?>/gi, ",")
    .replace(/\*/g, ",")
    .split(",");

  return parts.map(cleanName).filter(Boolean);
}

// ─── Strategy 2: Article body section ────────────────────────────────────────

/**
 * Extract wikilinks from the "=== Influences ===" section of the article body.
 *
 * Many notable Wikipedia artist pages document influences in prose in an
 * "Influences" section rather than in the infobox field (which Wikipedia
 * editors rarely use for established artists as it's considered subjective).
 */
function parseInfluencesFromSection(wikitext: string): string[] {
  // Find the Influences section header (level 2–5)
  const sectionRe = /={2,5}\s*Influences\s*={2,5}/i;
  const sectionIdx = wikitext.search(sectionRe);
  if (sectionIdx === -1) return [];

  // Find the end of the header line
  const headerEnd = wikitext.indexOf("\n", sectionIdx) + 1;
  if (headerEnd === 0) return [];

  // Find the next section header at the same or higher level
  const rest = wikitext.slice(headerEnd);
  const nextSectionIdx = rest.search(/^={2,5}/m);
  const sectionBody =
    nextSectionIdx !== -1 ? rest.slice(0, nextSectionIdx) : rest.slice(0, 4000);

  // Remove citation markup that contains wikilinks to publications, not artists
  let cleaned = sectionBody;
  // Remove <ref>...</ref> blocks (contain citation wikilinks to publications)
  cleaned = cleaned.replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "");
  // Remove inline citation templates (sfn, cite, harvp, harvnb, harv)
  cleaned = cleaned.replace(
    /\{\{(?:sfn|cite|harvp|harvnb|harv)[^}]*\}\}/gi,
    "",
  );
  // Remove footnote and efn templates
  cleaned = cleaned.replace(/\{\{(?:efn|note)[^}]*\}\}/gi, "");

  return extractWikilinks(cleaned).map(cleanName).filter(Boolean);
}

// ─── Nesting-aware field extractor ───────────────────────────────────────────

/**
 * Extracts the value of a named infobox field from wikitext.
 *
 * Tracks `[[...]]` and `{{...}}` nesting so that pipe characters inside
 * wikilinks or nested templates are not mistaken for field separators.
 *
 * Returns null if the field is not found.
 */
function extractField(infoboxText: string, fieldName: string): string | null {
  const fieldRe = new RegExp(`\\|\\s*${fieldName}\\s*=`, "i");
  const match = fieldRe.exec(infoboxText);
  if (!match) return null;

  const start = match.index + match[0].length;
  let i = start;
  let depth = 0; // tracks nested [[ ]] and {{ }} pairs

  while (i < infoboxText.length) {
    const ch = infoboxText[i];
    const ch2 = infoboxText.slice(i, i + 2);

    if (ch2 === "{{" || ch2 === "[[") {
      depth++;
      i += 2;
      continue;
    }

    if (ch2 === "}}" || ch2 === "]]") {
      if (depth === 0) {
        // Closing the infobox itself — stop
        break;
      }
      depth--;
      i += 2;
      continue;
    }

    // Field separator: newline followed by | at top level (depth 0)
    if (ch === "\n" && depth === 0) {
      const rest = infoboxText.slice(i + 1);
      if (/^\s*\|/.test(rest)) {
        break; // next field starts here
      }
    }

    i++;
  }

  return infoboxText.slice(start, i);
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function extractWikilinks(text: string): string[] {
  // [[Target|Display]] → Target (use article title, not display text)
  // [[Target]]         → Target
  const WIKILINK_RE = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
  const names: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = WIKILINK_RE.exec(text)) !== null) {
    names.push(m[1]);
  }
  return names;
}

function cleanName(raw: string): string {
  let name = raw;
  // Strip remaining {{...}} templates
  name = name.replace(/\{\{[^}]*\}\}/g, "");
  // Trim first before namespace check
  name = name.trim();
  // Strip namespace prefix (e.g. "w:Artist Name" → "Artist Name")
  name = name.replace(/^[a-zA-Z]+:/, "");
  // Final trim and strip leading bullets/asterisks
  name = name.trim().replace(/^[*\s]+|[*\s]+$/g, "");
  return name;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}
