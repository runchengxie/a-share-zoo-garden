// Copy tracked public JSON snapshots into the generated frontend data directory.
// CSV files and rendered images remain outside the frontend data bundle.
import { existsSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const SRC = resolve(__dirname, "../../published/data");
const DEST = resolve(__dirname, "../public/data");

if (!existsSync(SRC)) {
  console.error(
    `[copy-published-data] Source directory not found: ${SRC}\n` +
      `Restore the reviewed published snapshots before building the site.`
  );
  process.exit(1);
}

mkdirSync(DEST, { recursive: true });

const files = readdirSync(SRC).filter((f) => f.endsWith(".json"));
if (files.length === 0) {
  console.warn(`[copy-published-data] No JSON files found in ${SRC}; the site may have no data.`);
}

for (const f of files) {
  copyFileSync(join(SRC, f), join(DEST, f));
}

const PLANT_SRC = resolve(__dirname, "../../published/plant/data");
const PLANT_DEST = resolve(__dirname, "../public/data/plant");
if (existsSync(PLANT_SRC)) {
  mkdirSync(PLANT_DEST, { recursive: true });
  for (const f of readdirSync(PLANT_SRC).filter((name) => name.endsWith(".json"))) {
    copyFileSync(join(PLANT_SRC, f), join(PLANT_DEST, f));
  }
  console.log(`[copy-published-data] Copied plant JSON snapshots to ${PLANT_DEST}`);
}

console.log(`[copy-published-data] Copied ${files.length} JSON files to ${DEST}`);
