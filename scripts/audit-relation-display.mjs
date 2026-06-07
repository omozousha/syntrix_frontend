import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const strictMode = process.argv.includes("--strict");
const frontendRoot = process.cwd();
const workspaceRoot = path.resolve(frontendRoot, "..");

const scanTargets = [
  { name: "frontend", root: frontendRoot, dirs: ["app", "components", "lib", "hooks"] },
  { name: "syntrix-one", root: path.join(workspaceRoot, "syntrix_app"), dirs: ["src"] },
];

const relationFields = [
  "region_id",
  "pop_id",
  "tenant_id",
  "device_type_id",
  "brand_id",
  "model_id",
  "manufacturer_id",
  "service_type_id",
  "project_id",
  "customer_id",
];
const allowedBusinessIdentifierFields = [
  "inventory_id",
  "device_id",
  "customer_number",
  "request_id",
  "document_id",
  "pop_code",
  "region_code",
];

const extensions = new Set([".ts", ".tsx"]);
const fieldPattern = relationFields.join("|");
const suspiciousPatterns = [
  {
    name: "JSX value prop uses raw relation id",
    strict: false,
    regex: new RegExp(`value=\\{[^}\\n]*(?:${fieldPattern})[^}\\n]*\\}`, "g"),
  },
  {
    name: "JSX text renders raw relation id",
    strict: true,
    regex: new RegExp(`>\\s*\\{[^}\\n]*(?:${fieldPattern})[^}\\n]*\\}\\s*<`, "g"),
  },
  {
    name: "Fallback uses raw relation id",
    strict: true,
    regex: new RegExp(`\\|\\|[^\\n]*(?:${fieldPattern})`, "g"),
  },
  {
    name: "valueOf receives raw relation id",
    strict: false,
    regex: new RegExp(`valueOf\\([^\\n)]*(?:${fieldPattern})[^\\n)]*\\)`, "g"),
  },
];

const benignLineFragments = [
  "params.set(",
  "query.set(",
  "searchParams(",
  "encodeURIComponent(",
  "onValueChange",
  "onChange({",
  "set(",
  ".filter(",
  ".map(",
  "type ",
  "interface ",
  "async ",
  "function ",
  "const ",
  "let ",
  "var ",
  "return Boolean",
  "getRegionDisplay(",
  "getPopDisplay(",
  "getProjectDisplay(",
  "getRegionLabel(",
  "getPopLabel(",
  "getProjectLabel(",
  "key={",
  "href={`",
  "href={",
  "body:",
  "payload:",
];

const findings = [];

for (const target of scanTargets) {
  if (!existsSync(target.root)) continue;
  const files = target.dirs.flatMap((dir) => listFiles(path.join(target.root, dir)));
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const lines = text.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
      if (isMostlyDataFlow(line)) continue;
      for (const pattern of suspiciousPatterns) {
        if (strictMode && !pattern.strict) continue;
        pattern.regex.lastIndex = 0;
        if (!pattern.regex.test(line)) continue;
        if (strictMode && isAllowedStrictLine(line)) continue;
        findings.push({
          target: target.name,
          file: relative(target.root, file),
          line: index + 1,
          rule: pattern.name,
          text: line.trim(),
        });
      }
    }
  }
}

console.log("# Relation Display Audit\n");
if (strictMode) console.log("Mode: strict guardrail\n");
console.log(`Scanned relation fields: ${relationFields.map((field) => `\`${field}\``).join(", ")}\n`);
console.log(`Allowed business identifiers: ${allowedBusinessIdentifierFields.map((field) => `\`${field}\``).join(", ")}\n`);

if (!findings.length) {
  console.log(strictMode ? "No strict raw relation display fallback found." : "No high-confidence raw relation display fallback found.");
  process.exit(0);
}

const byTarget = groupBy(findings, (item) => item.target);
for (const [target, targetFindings] of byTarget.entries()) {
  console.log(`## ${target}\n`);
  const byFile = groupBy(targetFindings, (item) => item.file);
  for (const [file, fileFindings] of byFile.entries()) {
    console.log(`### ${file}`);
    for (const finding of fileFindings) {
      console.log(`- L${finding.line} ${finding.rule}: \`${finding.text}\``);
    }
    console.log("");
  }
}

if (strictMode) {
  console.error("Strict relation display guard failed. User-facing relation labels must not fallback to raw technical IDs.");
  process.exit(1);
}

console.log("This audit is informational for Phase 1. Use it to migrate display code toward relation resolvers and display adapters.");

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) return listFiles(fullPath);
    if (stats.isFile() && extensions.has(path.extname(fullPath))) return [fullPath];
    return [];
  });
}

function relative(root, file) {
  return path.relative(root, file).replaceAll(path.sep, "/");
}

function isMostlyDataFlow(line) {
  const trimmed = line.trim();
  if (!trimmed) return true;
  return benignLineFragments.some((fragment) => trimmed.includes(fragment));
}

function isAllowedStrictLine(line) {
  const trimmed = line.trim();
  return [
    "apiFetch(",
    "JSON.stringify(",
    "region_id:",
    "pop_id:",
    "tenant_id:",
    "brand_id:",
    "model_id:",
    "manufacturer_id:",
    "project_id:",
    "customer_id:",
    "service_type_id:",
    "if (",
    "selectedCustomer?.",
    "traceDeviceMap[",
  ].some((fragment) => trimmed.includes(fragment));
}

function groupBy(items, getKey) {
  const grouped = new Map();
  for (const item of items) {
    const key = getKey(item);
    const list = grouped.get(key) || [];
    list.push(item);
    grouped.set(key, list);
  }
  return grouped;
}
