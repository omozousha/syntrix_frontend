// Test assertion untuk ODP stats formatters (salinan logic dari lib/formatters/odp-stats.ts)
// Tujuan: memverifikasi metric calculation & edge case sebelum dijalankan di production.
const assert = require("assert");

console.log("=== ODP Stats Formatters Unit Test ===");

// === formatValidationRate ===
function formatValidationRate(validated, total) {
  if (total <= 0 || validated < 0) {
    return { rate: null, isHigh: false };
  }
  const rate = Math.round((validated / total) * 100);
  const isHigh = rate >= 80;
  return { rate: `${rate}%`, isHigh };
}

assert.deepStrictEqual(formatValidationRate(75, 120), { rate: "63%", isHigh: false });
console.log("✅ formatValidationRate 75/120 = 63%");
assert.deepStrictEqual(formatValidationRate(100, 100), { rate: "100%", isHigh: true });
assert.deepStrictEqual(formatValidationRate(80, 100), { rate: "80%", isHigh: true });
assert.deepStrictEqual(formatValidationRate(79, 100), { rate: "79%", isHigh: false });
assert.deepStrictEqual(formatValidationRate(0, 0), { rate: null, isHigh: false });
assert.deepStrictEqual(formatValidationRate(-1, 10), { rate: null, isHigh: false });
console.log("✅ formatValidationRate boundary cases");

// === calculateValidationRate ===
function calculateValidationRate(validated, total) {
  if (total <= 0 || validated < 0) return null;
  return Math.round((validated / total) * 100);
}
assert.strictEqual(calculateValidationRate(75, 120), 63);
assert.strictEqual(calculateValidationRate(0, 0), null);
assert.strictEqual(calculateValidationRate(100, 100), 100);
console.log("✅ calculateValidationRate");

// === formatPortUsage ===
function formatPortUsage(used, total) {
  const validUsed = used ?? 0;
  const validTotal = total ?? 0;
  let label;
  let availabilityPct = null;
  if (used === null && total === null) {
    label = "--/--";
  } else if (used === null || total === null || total <= 0) {
    label = validUsed > 0 ? `${validUsed}/?` : "?/?";
  } else {
    label = `${validUsed}/${total}`;
    const available = Math.max(0, total - validUsed);
    const availPct = Math.round((available / total) * 100);
    availabilityPct = `${availPct}%`;
  }
  return { label, availabilityPct };
}
assert.deepStrictEqual(formatPortUsage(120, 320), { label: "120/320", availabilityPct: "63%" });
assert.deepStrictEqual(formatPortUsage(0, 0), { label: "?/?", availabilityPct: null });
assert.deepStrictEqual(formatPortUsage(null, null), { label: "--/--", availabilityPct: null });
assert.deepStrictEqual(formatPortUsage(50, null), { label: "50/?", availabilityPct: null });
assert.deepStrictEqual(formatPortUsage(0, 100), { label: "0/100", availabilityPct: "100%" });
assert.deepStrictEqual(formatPortUsage(100, 100), { label: "100/100", availabilityPct: "0%" });
console.log("✅ formatPortUsage");

// === calculateAvailablePorts ===
function calculateAvailablePorts(total, used) {
  const validTotal = total ?? 0;
  const validUsed = used ?? 0;
  if (total === null || used === null || validTotal <= 0) return 0;
  return Math.max(0, validTotal - validUsed);
}
assert.strictEqual(calculateAvailablePorts(320, 120), 200);
assert.strictEqual(calculateAvailablePorts(100, 150), 0);
assert.strictEqual(calculateAvailablePorts(null, null), 0);
assert.strictEqual(calculateAvailablePorts(0, 0), 0);
console.log("✅ calculateAvailablePorts");

// === calculateAvailableCores ===
function calculateAvailableCores(capacity, used) {
  const validCapacity = capacity ?? 0;
  const validUsed = used ?? 0;
  if (capacity === null || used === null || validCapacity <= 0) return 0;
  return Math.max(0, validCapacity - validUsed);
}
assert.strictEqual(calculateAvailableCores(24, 12), 12);
assert.strictEqual(calculateAvailableCores(null, null), 0);
console.log("✅ calculateAvailableCores");

// === isUnassignedPOP ===
function isUnassignedPOP(popId) {
  return popId === null || popId.trim() === "";
}
assert.strictEqual(isUnassignedPOP(null), true);
assert.strictEqual(isUnassignedPOP(""), true);
assert.strictEqual(isUnassignedPOP("  "), true);
assert.strictEqual(isUnassignedPOP("285f2f80-6e58-4e56-a44e-e8dd8b76a7e3"), false);
console.log("✅ isUnassignedPOP");

console.log("\n=== ALL ODP STATS FORMATTER TESTS PASSED ===");
