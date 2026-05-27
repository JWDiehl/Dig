/**
 * scripts/generate-landing-data.ts
 *
 * Generates the static landing page graph data for Dig.
 *
 * Fetches the Miles Davis influence graph from live MusicBrainz, Wikipedia,
 * and Wikidata APIs (via graph-builder) and writes the result to
 * public/data/miles-davis.json.
 *
 * This file must be committed to the repository — it is the sole data source
 * for the landing page (no API call on first visit).
 *
 * Usage:
 *   npm run generate:landing
 *
 * Note: First run takes 30–60 seconds due to MusicBrainz 1 req/sec rate limit.
 * Do NOT interrupt early.
 */

import { buildGraph } from "@/lib/data/graph-builder";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const MILES_DAVIS_MBID = "561d854a-6a28-4aa7-8c99-323e6ce46c2a";

// __dirname equivalent for ESM
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "..", "public", "data", "miles-davis.json");

async function main(): Promise<void> {
  console.log("🎵 Generating landing data for Miles Davis…");
  console.log(
    "   (This makes ~30–60 live MusicBrainz API calls — please wait)\n",
  );

  const graphData = await buildGraph(MILES_DAVIS_MBID, 2);

  // Ensure public/data/ exists
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });

  writeFileSync(OUTPUT_PATH, JSON.stringify(graphData, null, 2));

  console.log(`✅ Written to ${OUTPUT_PATH}`);
  console.log(`   Artists : ${graphData.artists.length}`);
  console.log(`   Edges   : ${graphData.edges.length}`);
  console.log(`   Warnings: ${graphData.warnings.length}`);
  if (graphData.warnings.length > 0) {
    console.log("   ⚠️  Warnings:", graphData.warnings);
  }
}

main().catch((err: unknown) => {
  console.error("❌ Generation failed:", err);
  process.exit(1);
});
