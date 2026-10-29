import assert from "node:assert";

console.log("=== Hazard QR Label Unit Tests ===");

function formatValidationDate(value) {
  if (!value) return "—";
  const str = String(value).trim();
  if (!str || str === "null" || str === "undefined") return "—";
  const parsed = new Date(str);
  if (isNaN(parsed.getTime())) return str;
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
}

// 1. null / undefined / empty fallback
assert.strictEqual(formatValidationDate(null), "—");
assert.strictEqual(formatValidationDate(undefined), "—");
assert.strictEqual(formatValidationDate(""), "—");
assert.strictEqual(formatValidationDate("   "), "—");
assert.strictEqual(formatValidationDate("null"), "—");
assert.strictEqual(formatValidationDate("undefined"), "—");
console.log("✅ formatValidationDate fallback cases verified");

// 2. ISO date formats
assert.strictEqual(formatValidationDate("2026-10-29"), "29/10/2026");
assert.strictEqual(formatValidationDate("2026-01-05T12:00:00Z"), "05/01/2026");
console.log("✅ formatValidationDate ISO date parsing verified");

// 3. Fallback for non-parseable custom date strings
assert.strictEqual(formatValidationDate("29/10/2026"), "29/10/2026");
console.log("✅ formatValidationDate custom date string passthrough verified");

// 4. Template style fallback
function resolveDeviceTemplateStyle(setting) {
  return setting?.device_template_style === "hazard" ? "hazard" : "default";
}
assert.strictEqual(resolveDeviceTemplateStyle({ device_template_style: "hazard" }), "hazard");
assert.strictEqual(resolveDeviceTemplateStyle({ device_template_style: "default" }), "default");
assert.strictEqual(resolveDeviceTemplateStyle({ device_template_style: "invalid" }), "default");
assert.strictEqual(resolveDeviceTemplateStyle(null), "default");
console.log("✅ resolveDeviceTemplateStyle safety verified");

// 5. Customer Patch Cord style fallback
function resolvePatchCordTemplateStyle(setting) {
  return setting?.customer_patch_cord_style === "qr" ? "qr" : "plain";
}
assert.strictEqual(resolvePatchCordTemplateStyle({ customer_patch_cord_style: "qr" }), "qr");
assert.strictEqual(resolvePatchCordTemplateStyle({ customer_patch_cord_style: "plain" }), "plain");
assert.strictEqual(resolvePatchCordTemplateStyle({ customer_patch_cord_style: "invalid" }), "plain");
assert.strictEqual(resolvePatchCordTemplateStyle(null), "plain");
console.log("✅ resolvePatchCordTemplateStyle safety verified");

// 6. Customer CID cleaner
function formatCleanCid(raw) {
  const code = String(raw || "CSC-XXXX").trim();
  return code.replace(/^CID:\s*/i, "").trim().toUpperCase();
}
assert.strictEqual(formatCleanCid("CSC-2026/0891"), "CSC-2026/0891");
assert.strictEqual(formatCleanCid("CID: CSC-2026/0891"), "CSC-2026/0891");
assert.strictEqual(formatCleanCid("cid: csc-1234"), "CSC-1234");
assert.strictEqual(formatCleanCid(""), "CSC-XXXX");
assert.strictEqual(formatCleanCid(null), "CSC-XXXX");
console.log("✅ formatCleanCid verified");

// 7. Customer QR URL generation
function buildCustomerQrHref(customerId, appBaseUrl = "https://syntrix.net") {
  return `${appBaseUrl.replace(/\/+$/, "")}/data-management/list/customer/${encodeURIComponent(customerId)}`;
}
assert.strictEqual(
  buildCustomerQrHref("cust-123", "https://syntrix.net/"),
  "https://syntrix.net/data-management/list/customer/cust-123"
);
console.log("✅ buildCustomerQrHref verified");

console.log("=== ALL HAZARD & PATCH CORD QR LABEL TESTS PASSED ===");
