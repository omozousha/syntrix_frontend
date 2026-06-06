import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();

const requiredRoutes = [
  "app/login/page.tsx",
  "app/(app)/dashboard/page.tsx",
  "app/(app)/data-management/page.tsx",
  "app/(app)/data-management/create/page.tsx",
  "app/(app)/data-management/list/[slug]/page.tsx",
  "app/(app)/data-management/list/[slug]/[id]/page.tsx",
  "app/(app)/requests/page.tsx",
  "app/(app)/validation-requests/page.tsx",
  "app/(app)/account-management/page.tsx",
  "app/(app)/master-data/page.tsx",
  "app/field/odp/[id]/page.tsx",
];

const scanDirs = ["app", "components", "lib"];
const extensions = new Set([".ts", ".tsx", ".css"]);

const checks = [
  {
    name: "required routes are present",
    run() {
      return requiredRoutes
        .filter((route) => !existsSync(path.join(root, route)))
        .map((route) => `missing route file: ${route}`);
    },
  },
  {
    name: "role labels do not expose internal role ids",
    run(files) {
      const issues = [];
      for (const file of files) {
        const text = readFileSync(file, "utf8");
        if (/<Badge[^>]*>\s*{\s*me\.role\s*}\s*<\/Badge>/.test(text)) {
          issues.push(`${relative(file)} renders me.role directly in a badge`);
        }
        const lines = text.split(/\r?\n/);
        for (const [index, line] of lines.entries()) {
          const badCopyMatches = line.matchAll(/(?:=|:|\(|\[|,|\s)(["'`])([^"'`]*Adminregion[^"'`]*)\1/g);
          for (const match of badCopyMatches) {
            issues.push(`${relative(file)}:${index + 1} contains user-facing Adminregion copy: ${match[1]}${match[2]}${match[1]}`);
          }
        }
      }
      return issues;
    },
  },
  {
    name: "browser validation entry stays app-required",
    run(files) {
      const issues = [];
      for (const file of files) {
        const text = readFileSync(file, "utf8");
        if (text.includes("Open Validation")) {
          issues.push(`${relative(file)} still contains Open Validation copy`);
        }
      }
      return issues;
    },
  },
  {
    name: "production routes do not point to localhost",
    run(files) {
      const issues = [];
      for (const file of files) {
        const text = readFileSync(file, "utf8");
        if (text.includes("localhost:3000")) {
          issues.push(`${relative(file)} contains localhost:3000`);
        }
      }
      return issues;
    },
  },
  {
    name: "relation display does not fallback to raw technical ids",
    run() {
      try {
        execFileSync(process.execPath, ["scripts/audit-relation-display.mjs", "--strict"], {
          cwd: root,
          encoding: "utf8",
          stdio: "pipe",
        });
        return [];
      } catch (error) {
        const output = [error.stdout, error.stderr].filter(Boolean).join("\n").trim();
        return output ? output.split(/\r?\n/).filter(Boolean) : ["relation display strict audit failed"];
      }
    },
  },
];

const files = scanDirs.flatMap((dir) => listFiles(path.join(root, dir)));
const failures = [];

for (const check of checks) {
  const result = check.run(files);
  if (result.length) {
    failures.push({ name: check.name, result });
  } else {
    console.log(`ok - ${check.name}`);
  }
}

if (failures.length) {
  console.error("\nFrontend consistency check failed:");
  for (const failure of failures) {
    console.error(`\n${failure.name}`);
    for (const issue of failure.result) {
      console.error(`- ${issue}`);
    }
  }
  process.exit(1);
}

console.log("\nFrontend consistency check passed.");

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) return listFiles(fullPath);
    if (stats.isFile() && extensions.has(path.extname(fullPath))) return [fullPath];
    return [];
  });
  return entries;
}

function relative(file) {
  return path.relative(root, file).replaceAll(path.sep, "/");
}
