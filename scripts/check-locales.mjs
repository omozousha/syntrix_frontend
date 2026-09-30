/**
 * Validasi kamus lokalitas (`lib/locales/index.ts`).
 *
 * Cek:
 * 1. Parity key id/en — Indonesia dan Inggris harus punya set key identik.
 * 2. Parity placeholder — `{name}` di id harus sama dengan di en, supaya
 *    substitusi runtime tidak menyisakan `{name}` literal di layar.
 * 3. Unused key — key yang sudah tidak dipakai di app/components/lib.
 *
 * Catatan: parity key juga sudah dijaga type `Messages` (compile-time).
 * Skrip ini adalah guard runtime/CI + laporan unused key (tsc tidak bisa).
 *
 * Jalankan: node scripts/check-locales.mjs
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const indexPath = path.join(root, "lib", "locales", "index.ts");
const scanDirs = ["app", "components", "lib"];
const extensions = new Set([".ts", ".tsx"]);
const scanFiles = scanDirs
  .flatMap((dir) => listFiles(path.join(root, dir)))
  .filter((file) => file !== indexPath);

const text = readFileSync(indexPath, "utf8");

const parseEntries = (name, terminator) => {
  const opener = `const ${name}`;
  const start = text.indexOf(opener);
  if (start === -1) throw new Error(`missing const ${name} in locales/index.ts`);
  const bodyStart = text.indexOf("{", start);
  const bodyEnd = text.indexOf(terminator, bodyStart);
  if (bodyEnd === -1) throw new Error(`missing terminator ${terminator} for ${name}`);
  const block = text.slice(bodyStart, bodyEnd);

  const keyRe = /"([^"]+)"\s*:/g;
  const entries = [];
  let match;
  while ((match = keyRe.exec(block))) {
    const rest = block.slice(match.index + match[0].length);
    const valueMatch = rest.match(/^\s*"((?:[^"\\]|\\.)*)"/);
    entries.push({ key: match[1], value: valueMatch ? valueMatch[1] : "" });
  }
  return entries;
};

const placeholders = (value) => {
  const vars = value.match(/\{([a-zA-Z0-9_]+)\}/g) ?? [];
  return new Set(vars.map((token) => token.slice(1, -1)));
};

const problems = [];

const idEntries = parseEntries("id", "\n} as const;");
const enEntries = parseEntries("en", "\n};");
const idKeys = new Set(idEntries.map((e) => e.key));
const enKeys = new Set(enEntries.map((e) => e.key));

const missingInEn = [...idKeys].filter((key) => !enKeys.has(key));
if (missingInEn.length) {
  problems.push(`key hilang di kamus EN (${missingInEn.length}): ${missingInEn.slice(0, 10).join(", ")}`);
}
const missingInId = [...enKeys].filter((key) => !idKeys.has(key));
if (missingInId.length) {
  problems.push(`key hilang di kamus ID (${missingInId.length}): ${missingInId.slice(0, 10).join(", ")}`);
}

// Parity placeholder: nilai EN punya set `{var}` yang sama dengan ID.
const enValueByKey = Object.fromEntries(enEntries.map((e) => [e.key, e.value]));
const placeholderMismatch = [];
for (const entry of idEntries) {
  if (!enValueByKey[entry.key]) continue;
  const idVars = placeholders(entry.value);
  const enVars = placeholders(enValueByKey[entry.key]);
  const diff = [...idVars].filter((token) => !enVars.has(token));
  if (diff.length) {
    placeholderMismatch.push(`${entry.key}: ID punya {${diff.join("}, {")}} yang tidak ada di EN`);
  }
}
if (placeholderMismatch.length) {
  problems.push(
    `placeholder mismatch ID/EN (${placeholderMismatch.length}):\n  ${placeholderMismatch.slice(0, 10).join("\n  ")}`,
  );
}

// Unused keys: string key harus muncul di source selain kamus itu sendiri.
// Key yang dikomposisi runtime (mis. t(`tip.${group}.1`), t(`masterData.section.${k}`))
// dianggap terpakai — deteksi via prefix dinamis, bukan literal.
const strict = process.argv.includes("--strict");
const sources = scanFiles.map((file) => ({ file, text: readFileSync(file, "utf8") }));

const dynamicPrefixes = new Set();
for (const source of sources) {
  for (const match of source.text.matchAll(/(?<![A-Za-z0-9_$])t\(\s*`([^`$]*?)\$\{/g)) {
    if (match[1]) dynamicPrefixes.add(match[1]);
  }
}
const coveredByDynamic = (key) => [...dynamicPrefixes].some((prefix) => key.startsWith(prefix));

const allSourceText = sources.map((s) => s.text).join("\n");
const unused = [...idKeys].filter(
  (key) => !allSourceText.includes(`"${key}"`) && !coveredByDynamic(key),
);
if (unused.length) {
  const message = `key tidak terpakai (${unused.length}) — hapus dari kamus atau catat sebagai TODO migrasi: ${unused.slice(0, 10).join(", ")}`;
  if (strict) problems.push(message);
  else console.warn(`WARN - ${message}`);
}

if (problems.length) {
  console.error("Locale check failed:");
  for (const problem of problems) console.error(`\n- ${problem}`);
  process.exit(1);
}

const unusedNote = unused.length
  ? `unused ${unused.length} (WARN, non-strict)`
  : "unused 0";

console.log(
  `Locale check passed. ${idKeys.size} key, parity id/en ok, placeholder ok, ${unusedNote}.`,
);

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    const stats = statSync(full, { throwIfNoEntry: false });
    if (!stats) return [];
    if (stats.isDirectory()) return listFiles(full);
    if (stats.isFile() && extensions.has(path.extname(full))) return [full];
    return [];
  });
}
