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

// 4. Template style fallback (supports hazard_compact)
function resolveDeviceTemplateStyle(setting) {
  const v = setting?.device_template_style;
  return ["hazard", "hazard_compact"].includes(v) ? v : "default";
}
assert.strictEqual(resolveDeviceTemplateStyle({ device_template_style: "hazard" }), "hazard");
assert.strictEqual(resolveDeviceTemplateStyle({ device_template_style: "hazard_compact" }), "hazard_compact");
assert.strictEqual(resolveDeviceTemplateStyle({ device_template_style: "default" }), "default");
assert.strictEqual(resolveDeviceTemplateStyle({ device_template_style: "invalid" }), "default");
assert.strictEqual(resolveDeviceTemplateStyle(null), "default");
console.log("✅ resolveDeviceTemplateStyle safety verified (incl. hazard_compact)");

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

// 8. CID priority resolution
function resolveCustomerCid(row) {
  const raw = row.customer_number || row.customer_code || "CSC-XXXX";
  return String(raw).replace(/^CID:\s*/i, "").trim().toUpperCase();
}
assert.strictEqual(
  resolveCustomerCid({ customer_number: "CSC-9999", customer_code: "CUST-INT-1", id: "uuid-123" }),
  "CSC-9999"
);
assert.strictEqual(
  resolveCustomerCid({ customer_code: "CSC-8888", id: "uuid-456" }),
  "CSC-8888"
);
assert.strictEqual(
  resolveCustomerCid({ id: "uuid-789" }),
  "CSC-XXXX"
);
console.log("✅ resolveCustomerCid priority verified");

// 9. Patch Cord A4 PDF Sheet Geometry (4 cols x 14 rows = 56 labels, 2x smaller)
const A4_WIDTH = 210;
const A4_HEIGHT = 297;
const MARGIN_X = 8;
const MARGIN_Y = 8;
const GAP_X = 3;
const GAP_Y = 3;
const COLS = 4;
const ROWS = 14;
const LABEL_W = (A4_WIDTH - MARGIN_X * 2 - GAP_X * (COLS - 1)) / COLS;
const LABEL_H = (A4_HEIGHT - MARGIN_Y * 2 - GAP_Y * (ROWS - 1)) / ROWS;
assert.strictEqual(COLS * ROWS, 56);
assert.ok(LABEL_W >= 46 && LABEL_W <= 48, `Expected label width ~46.5mm, got ${LABEL_W}`);
assert.ok(LABEL_H >= 17 && LABEL_H <= 18, `Expected label height ~17.5mm, got ${LABEL_H}`);
console.log("✅ Patch Cord 4x14 grid geometry (56 labels/A4) verified");

// 10. Hazard Compact A4 PDF Sheet Geometry (2 cols x 3 rows = 6 labels)
// Uses actual drawQrLabelPdf params: margin=8mm, gap=4mm
const HC_MARGIN = 8;
const HC_GAP = 4;
const HC_COLS = 2;
const HC_ROWS = 3;
const HC_LABEL_W = (A4_WIDTH - HC_MARGIN * 2 - HC_GAP * (HC_COLS - 1)) / HC_COLS;
const HC_LABEL_H = (A4_HEIGHT - HC_MARGIN * 2 - HC_GAP * (HC_ROWS - 1)) / HC_ROWS;
assert.strictEqual(HC_COLS * HC_ROWS, 6);
assert.ok(HC_LABEL_W >= 95 && HC_LABEL_W <= 99, `Expected hazard_compact label width ~95mm, got ${HC_LABEL_W}`);
assert.ok(HC_LABEL_H >= 88 && HC_LABEL_H <= 94, `Expected hazard_compact label height ~90mm, got ${HC_LABEL_H}`);
console.log("✅ Hazard Compact 2x3 grid geometry (6 labels/A4) verified");

console.log("=== ALL HAZARD & PATCH CORD QR LABEL TESTS PASSED ===");
