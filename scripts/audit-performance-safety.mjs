import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

const checks = [
  {
    name: "TanStack Query dependency is installed",
    run() {
      const pkg = readJson("package.json");
      return pkg.dependencies?.["@tanstack/react-query"]
        ? []
        : ["package.json is missing @tanstack/react-query"];
    },
  },
  {
    name: "Query provider is mounted in app layout",
    run() {
      const layout = readText("app/layout.tsx");
      const provider = readText("components/providers/query-provider.tsx");
      const issues = [];
      if (!layout.includes("QueryProvider")) {
        issues.push("app/layout.tsx does not mount QueryProvider");
      }
      if (!provider.includes("new QueryClient") || !provider.includes("staleTime") || !provider.includes("gcTime")) {
        issues.push("components/providers/query-provider.tsx does not define QueryClient cache defaults");
      }
      return issues;
    },
  },
  {
    name: "Reference data uses a shared cached query",
    run() {
      const hook = readText("hooks/use-reference-data.ts");
      const api = readText("lib/api.ts");
      const issues = [];
      if (!hook.includes("useQuery") || !hook.includes("referenceDataKeys.list")) {
        issues.push("hooks/use-reference-data.ts does not use a shared referenceData query key");
      }
      if (!hook.includes("staleTime: 10 * 60_000") || !hook.includes("gcTime: 30 * 60_000")) {
        issues.push("hooks/use-reference-data.ts does not keep reference data warm long enough for route navigation");
      }
      if (!api.includes("/reference-data")) {
        issues.push("lib/api.ts does not expose the batch /reference-data endpoint");
      }
      return issues;
    },
  },
  {
    name: "Device detail and list use stable query keys",
    run() {
      const hook = readText("hooks/use-device-data.ts");
      const issues = [];
      if (!hook.includes("deviceKeys.detail") || !hook.includes("deviceKeys.list")) {
        issues.push("hooks/use-device-data.ts is missing stable device detail/list query keys");
      }
      if (!hook.includes("staleTime: 60_000")) {
        issues.push("hooks/use-device-data.ts does not keep device data cached during route navigation");
      }
      if (hook.includes("/attachments")) {
        issues.push("hooks/use-device-data.ts fetches attachments in core device query");
      }
      return issues;
    },
  },
  {
    name: "Mutation helpers invalidate related cached data",
    run() {
      const invalidation = readText("lib/query-invalidation.ts");
      const issues = [];
      for (const expected of ["invalidateReferenceData", "invalidateDeviceData", "invalidateMasterData", "invalidateValidationRequestData"]) {
        if (!invalidation.includes(expected)) {
          issues.push(`lib/query-invalidation.ts is missing ${expected}`);
        }
      }
      if (!invalidation.includes("historyKeys.device")) {
        issues.push("device invalidation does not refresh device validation history");
      }
      return issues;
    },
  },
  {
    name: "Attachment data stays lazy outside core device hooks",
    run() {
      const listPage = readText("app/(app)/data-management/list/[slug]/page.tsx");
      const detailPage = readText("app/(app)/data-management/list/[slug]/[id]/page.tsx");
      const issues = [];
      if (listPage.includes("/attachments/") || listPage.includes("/attachments?")) {
        issues.push("data-management list page fetches attachment files directly");
      }
      if (!detailPage.includes("DeviceGallerySection")) {
        issues.push("device detail page does not isolate gallery rendering in DeviceGallerySection");
      }
      return issues;
    },
  },
];

const failures = [];

for (const check of checks) {
  const result = check.run();
  if (result.length) {
    failures.push({ name: check.name, result });
  } else {
    console.log(`ok - ${check.name}`);
  }
}

if (failures.length) {
  console.error("\nPerformance safety audit failed:");
  for (const failure of failures) {
    console.error(`\n${failure.name}`);
    for (const issue of failure.result) {
      console.error(`- ${issue}`);
    }
  }
  process.exit(1);
}

console.log("\nPerformance safety audit passed.");

function readText(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!existsSync(fullPath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return readFileSync(fullPath, "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}
