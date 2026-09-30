import { dictionaries, translate } from "../lib/locales/index.ts";

const assert = {
  strictEqual(actual, expected, msg) {
    if (actual !== expected) {
      throw new Error(`${msg || "assertion failed"}: ${actual} !== ${expected}`);
    }
  },
};

assert.strictEqual(translate("id", "sidebar.dashboard"), "Pusat Kendali", "ID translation");
assert.strictEqual(translate("en", "sidebar.dashboard"), "Dashboard", "EN translation");
assert.strictEqual(
  translate("id", "dashboard.openItem", { title: "X" }),
  "Buka X",
  "interpolation ID",
);
assert.strictEqual(
  translate("en", "dashboard.openItem", { title: "X" }),
  "Open X",
  "interpolation EN",
);
assert.strictEqual(translate("id", "__unknown__", undefined), "__unknown__", "unknown fallback");

const sampleKeys = Object.keys(dictionaries.id).slice(0, 25);
for (const key of sampleKeys) {
  const idVars = new Set(
    [...dictionaries.id[key].matchAll(/\{([^}]+)\}/g)].map((m) => m[1]),
  );
  const enVars = new Set(
    [...dictionaries.en[key].matchAll(/\{([^}]+)\}/g)].map((m) => m[1]),
  );
  if (JSON.stringify([...idVars].sort()) !== JSON.stringify([...enVars].sort())) {
    throw new Error(`placeholder mismatch ${key}`);
  }
}

console.log("Locale runtime checks passed.");
