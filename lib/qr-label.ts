import type { jsPDF as JsPdfDocument } from "jspdf";
import { API_BASE_URL, apiFetch } from "@/lib/api";

export type QrLabelPayload = {
  deviceName: string;
  deviceCode: string;
  deviceType: string;
  popName: string;
  projectName?: string;
  tenantName?: string;
  qrDataUrl: string;
  logoDataUrl?: string;
  footerText?: string;
  validationDate?: string | null;
  templateStyle?: "default" | "hazard" | null;
};

export type QrLabelSettings = {
  id?: string | null;
  qr_logo_attachment_id?: string | null;
  qr_logo_url?: string | null;
  qr_logo_original_name?: string | null;
  footer_text?: string | null;
  device_template_style?: "default" | "hazard" | null;
  customer_patch_cord_style?: "plain" | "qr" | null;
  is_active?: boolean;
  updated_at?: string | null;
};

export type PatchCordLabelPayload = {
  popName: string;
  customerCode: string;
  customerId?: string | null;
  customerName?: string | null;
  portLabel?: string | null;
  odpName?: string | null;
  qrDataUrl?: string;
  variant?: "plain" | "qr" | null;
};

const QR_LABEL_FOOTER = "Scan QR untuk membuka detail/validasi Device";
const DEFAULT_QR_LOGO_SRC = "/syntrix-logo.png";
let defaultLogoDataUrlPromise: Promise<string> | null = null;
const qrLogoDataUrlCache = new Map<string, Promise<string>>();

export function formatQrPopLabel(popName: string, popCode?: string | null) {
  const name = normalizeQrText(popName, "-");
  const code = normalizeQrText(popCode);
  if (!code || code === "-" || code === name || isLikelyUuid(code)) return name;
  return `${name} | ${code}`;
}

export function buildDeviceQrHref({
  appBaseUrl,
  categorySlug,
  deviceId,
  deviceTypeKey,
}: {
  appBaseUrl?: string | null;
  categorySlug: string;
  deviceId: string;
  deviceTypeKey?: string | null;
}) {
  const isOdp = String(deviceTypeKey || "").toUpperCase() === "ODP";
  const path = isOdp ? `/field/odp/${deviceId}` : `/data-management/list/${categorySlug}/${deviceId}`;
  const baseUrl = String(appBaseUrl || "").trim().replace(/\/+$/, "");
  if (baseUrl) return `${baseUrl}${path}`;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

export function buildCustomerQrHref({
  appBaseUrl,
  customerId,
}: {
  appBaseUrl?: string | null;
  customerId: string;
}) {
  const path = `/data-management/list/customer/${encodeURIComponent(customerId)}`;
  const baseUrl = String(appBaseUrl || "").trim().replace(/\/+$/, "");
  if (baseUrl) return `${baseUrl}${path}`;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

export async function buildQrLabelPngDataUrl(payload: QrLabelPayload) {
  if (payload.templateStyle === "hazard") {
    return buildHazardQrLabelPngDataUrl(payload);
  }

  const {
    deviceName,
    deviceCode,
    deviceType,
    popName,
    projectName,
    tenantName,
    qrDataUrl,
    logoDataUrl: providedLogoDataUrl,
    footerText,
  } = payload;

  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 450;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser tidak mendukung canvas export.");

  const qrImage = await loadImage(qrDataUrl);
  const logoDataUrl = providedLogoDataUrl ?? await loadDefaultQrLogoDataUrl().catch(() => "");
  const logoImage = logoDataUrl ? await loadImage(logoDataUrl).catch(() => null) : null;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawRoundedCanvasRect(context, 8, 8, 884, 434, 16, "#ffffff", "#111827", 7);
  drawRoundedCanvasRect(context, 18, 18, 864, 414, 10, "transparent", "#111827", 3);

  context.imageSmoothingEnabled = false;
  const qrX = 28;
  const qrY = 35;
  const qrSize = 370;
  context.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
  if (logoImage) drawQrLogoImageCanvas(context, logoImage, qrX + qrSize / 2, qrY + qrSize / 2, 76);
  else drawDefaultQrLogoCanvas(context, qrX + qrSize / 2, qrY + qrSize / 2, 76);

  context.fillStyle = "#111827";
  context.fillRect(417, 24, 8, 402);

  const textX = 448;
  context.fillStyle = "#020617";
  drawAdaptiveCanvasText(context, deviceName, textX, 63, 390, {
    weight: 800,
    maxSize: 38,
    minSize: 24,
  });

  drawAdaptiveCanvasText(context, `ID: ${deviceCode}`, textX, 112, 380, {
    weight: 800,
    maxSize: 26,
    minSize: 18,
  });
  drawAdaptiveCanvasText(context, `TYPE: ${deviceType}`, textX, 153, 380, {
    weight: 800,
    maxSize: 26,
    minSize: 18,
  });
  drawAdaptiveCanvasText(context, `POP: ${popName}`, textX, 194, 380, {
    weight: 800,
    maxSize: 26,
    minSize: 17,
  });

  const optionalLines = [
    { label: "PROJECT", value: projectName },
    { label: "TENANT", value: tenantName },
  ].filter((line) => isQrLabelOptionalTextVisible(line.value));
  optionalLines.slice(0, 2).forEach((line, index) => {
    drawAdaptiveCanvasText(context, `${line.label}: ${line.value}`, textX, 238 + index * 36, 380, {
      weight: 700,
      maxSize: 20,
      minSize: 14,
    });
  });

  context.fillStyle = "#dc2626";
  drawAdaptiveCanvasText(context, footerText || QR_LABEL_FOOTER, textX, 414, 390, {
    weight: 700,
    maxSize: 17,
    minSize: 12,
  });

  return canvas.toDataURL("image/png");
}

export function formatValidationDate(value?: string | null): string {
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

export function createHazardPattern(context: CanvasRenderingContext2D, stripeWidth = 14): CanvasPattern | string {
  const patternCanvas = document.createElement("canvas");
  const size = stripeWidth * 2;
  patternCanvas.width = size;
  patternCanvas.height = size;
  const pctx = patternCanvas.getContext("2d");
  if (!pctx) return "#F59E0B";

  pctx.fillStyle = "#F59E0B";
  pctx.fillRect(0, 0, size, size);

  pctx.fillStyle = "#020617";
  pctx.beginPath();
  pctx.moveTo(0, 0);
  pctx.lineTo(stripeWidth, 0);
  pctx.lineTo(0, stripeWidth);
  pctx.closePath();
  pctx.fill();

  pctx.beginPath();
  pctx.moveTo(0, size);
  pctx.lineTo(size, 0);
  pctx.lineTo(size, stripeWidth);
  pctx.lineTo(stripeWidth, size);
  pctx.closePath();
  pctx.fill();

  return context.createPattern(patternCanvas, "repeat") || "#F59E0B";
}

export function drawHazardBorder(
  context: CanvasRenderingContext2D,
  outerX: number,
  outerY: number,
  outerW: number,
  outerH: number,
  outerRadius: number,
  innerInset: number,
  innerRadius: number,
  stripeWidth = 14,
) {
  context.save();
  const pattern = createHazardPattern(context, stripeWidth);
  drawRoundedCanvasRect(context, outerX, outerY, outerW, outerH, outerRadius, pattern, "#020617", 2);

  const innerX = outerX + innerInset;
  const innerY = outerY + innerInset;
  const innerW = outerW - innerInset * 2;
  const innerH = outerH - innerInset * 2;
  drawRoundedCanvasRect(context, innerX, innerY, innerW, innerH, innerRadius, "#ffffff", "#020617", 2);
  context.restore();
}

export async function buildHazardQrLabelPngDataUrl({
  deviceName,
  deviceCode,
  deviceType,
  popName,
  projectName,
  tenantName,
  qrDataUrl,
  logoDataUrl: providedLogoDataUrl,
  footerText,
  validationDate,
}: QrLabelPayload) {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 450;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser tidak mendukung canvas export.");

  const qrImage = await loadImage(qrDataUrl);
  const logoDataUrl = providedLogoDataUrl ?? await loadDefaultQrLogoDataUrl().catch(() => "");
  const logoImage = logoDataUrl ? await loadImage(logoDataUrl).catch(() => null) : null;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Outer hazard stripe border
  drawHazardBorder(context, 8, 8, 884, 434, 16, 14, 12, 14);

  // Top Section: QR Code (236x236)
  context.imageSmoothingEnabled = false;
  const qrX = 38;
  const qrY = 36;
  const qrSize = 236;
  context.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
  if (logoImage) drawQrLogoImageCanvas(context, logoImage, qrX + qrSize / 2, qrY + qrSize / 2, 52);
  else drawDefaultQrLogoCanvas(context, qrX + qrSize / 2, qrY + qrSize / 2, 52);

  // Vertical divider between QR and Specs
  context.fillStyle = "#CBD5E1";
  context.fillRect(290, 36, 3, 236);

  // Top Section: Specifications
  const textX = 308;
  context.fillStyle = "#020617";
  drawAdaptiveCanvasText(context, deviceName, textX, 68, 548, {
    weight: 800,
    maxSize: 32,
    minSize: 20,
  });

  drawAdaptiveCanvasText(context, `ID: ${deviceCode}`, textX, 108, 548, {
    weight: 800,
    maxSize: 22,
    minSize: 15,
  });
  drawAdaptiveCanvasText(context, `TYPE: ${deviceType}`, textX, 146, 548, {
    weight: 800,
    maxSize: 22,
    minSize: 15,
  });
  drawAdaptiveCanvasText(context, `POP: ${popName}`, textX, 184, 548, {
    weight: 800,
    maxSize: 22,
    minSize: 15,
  });

  const optionalLines = [
    { label: "PROJECT", value: projectName },
    { label: "TENANT", value: tenantName },
  ].filter((line) => isQrLabelOptionalTextVisible(line.value));
  optionalLines.slice(0, 2).forEach((line, index) => {
    drawAdaptiveCanvasText(context, `${line.label}: ${line.value}`, textX, 222 + index * 34, 548, {
      weight: 700,
      maxSize: 18,
      minSize: 13,
    });
  });

  // Middle Section: Dark Warning Banner with Hazard Accent
  const bannerX = 36;
  const bannerY = 286;
  const bannerW = 828;
  const bannerH = 90;
  drawRoundedCanvasRect(context, bannerX, bannerY, bannerW, bannerH, 8, "#090D16", "#F59E0B", 2);

  // Warning triangle icon
  context.save();
  context.fillStyle = "#F59E0B";
  context.beginPath();
  context.moveTo(70, 309);
  context.lineTo(92, 351);
  context.lineTo(48, 351);
  context.closePath();
  context.fill();

  // Exclamation mark '!'
  context.fillStyle = "#020617";
  context.beginPath();
  context.rect(68.5, 320, 3, 15);
  context.fill();
  context.beginPath();
  context.arc(70, 342, 2.2, 0, Math.PI * 2);
  context.fill();
  context.restore();

  // Warning text
  const warningTextX = 104;
  context.font = "800 13px Arial, sans-serif";
  const headerText = "PERHATIAN: ";
  const bodyText1 = "PERANGKAT INI SUDAH DI VALIDASI & MASUK DATABASE SYNTRIX.";
  context.fillStyle = "#EF4444";
  context.fillText(headerText, warningTextX, 326);
  const headerWidth = context.measureText(headerText).width;
  context.fillStyle = "#FFFFFF";
  context.fillText(bodyText1, warningTextX + headerWidth, 326);

  context.fillStyle = "#E2E8F0";
  context.font = "700 12.5px Arial, sans-serif";
  context.fillText(
    "JIKA ADA PERUBAHAN DATA HARAP KOORDINASI DENGAN OM REGIONAL & TEAM INVENTORY.",
    warningTextX,
    352,
  );

  // Bottom Section: Validation Date Bar
  const barX = 36;
  const barY = 388;
  const barW = 828;
  const barH = 32;
  drawRoundedCanvasRect(context, barX, barY, barW, barH, 6, "#F1F5F9", "#CBD5E1", 1);

  const dateStr = formatValidationDate(validationDate);
  context.font = "800 13.5px Arial, sans-serif";
  context.fillStyle = "#0F172A";
  context.fillText("VALIDATION DATE:", barX + 16, barY + 21);
  context.font = "700 13.5px Arial, sans-serif";
  context.fillStyle = "#2563EB";
  context.fillText(dateStr, barX + 162, barY + 21);

  // Footer text on the right of the bottom bar
  context.textAlign = "right";
  context.fillStyle = "#DC2626";
  context.font = "700 12px Arial, sans-serif";
  context.fillText(footerText || QR_LABEL_FOOTER, barX + barW - 16, barY + 21);
  context.textAlign = "left";

  return canvas.toDataURL("image/png");
}

export async function drawQrLabelPdf(doc: JsPdfDocument, rows: QrLabelPayload[]) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;
  const gap = 4;
  const columns = 2;
  const rowsPerPage = 6;
  const labelWidth = (pageWidth - margin * 2 - gap * (columns - 1)) / columns;
  const labelHeight = (pageHeight - margin * 2 - gap * (rowsPerPage - 1)) / rowsPerPage;
  const labelImages = await Promise.all(rows.map((row) => buildQrLabelPngDataUrl(row)));

  labelImages.forEach((labelDataUrl, index) => {
    if (index > 0 && index % (columns * rowsPerPage) === 0) doc.addPage();
    const pageIndex = index % (columns * rowsPerPage);
    const column = pageIndex % columns;
    const rowIndex = Math.floor(pageIndex / columns);
    const x = margin + column * (labelWidth + gap);
    const y = margin + rowIndex * (labelHeight + gap);
    doc.addImage(labelDataUrl, "PNG", x, y, labelWidth, labelHeight);
  });
}

function renderSinglePatchCordPanel(
  context: CanvasRenderingContext2D,
  panelX: number,
  panelY: number,
  panelW: number,
  panelH: number,
  payload: PatchCordLabelPayload,
  qrImage: HTMLImageElement | null,
) {
  const { popName, customerCode, customerName, portLabel, odpName, variant } = payload;
  const isQr = variant === "qr" && Boolean(qrImage);

  // Outer border & fill
  drawRoundedCanvasRect(context, panelX, panelY, panelW, panelH, 10, "#FFFFFF", "#0F172A", 2);

  if (!isQr) {
    // ── Varian A: Plain (2 Panel) ──
    // Header for POP
    drawRoundedCanvasRect(context, panelX + 8, panelY + 8, panelW - 16, 42, 6, "#F8FAFC", "#CBD5E1", 1.5);
    context.fillStyle = "#0F172A";
    drawAdaptiveCanvasText(context, `POP ${popName.toUpperCase()}`, panelX + 16, panelY + 35, panelW - 32, {
      weight: 800,
      maxSize: 18,
      minSize: 12,
    });

    // Middle: CID and Customer Name
    context.fillStyle = "#64748B";
    context.font = "800 11px Arial, sans-serif";
    context.fillText("CUSTOMER ID", panelX + 16, panelY + 74);

    context.fillStyle = "#0F172A";
    drawAdaptiveCanvasText(context, customerCode, panelX + 16, panelY + 104, panelW - 32, {
      weight: 800,
      maxSize: 26,
      minSize: 16,
    });

    if (customerName) {
      context.fillStyle = "#334155";
      drawAdaptiveCanvasText(context, customerName, panelX + 16, panelY + 132, panelW - 32, {
        weight: 600,
        maxSize: 14,
        minSize: 10,
      });
    }

    // Bottom bar: Port & ODP reference
    drawRoundedCanvasRect(context, panelX + 8, panelY + 154, panelW - 16, 32, 6, "#F1F5F9", "#CBD5E1", 1);
    context.fillStyle = "#0F172A";
    context.font = "700 11px Arial, sans-serif";
    context.fillText(portLabel ? `PORT: ${portLabel}` : "PATCH CORD", panelX + 16, panelY + 174);
    if (odpName) {
      context.textAlign = "right";
      context.fillText(odpName, panelX + panelW - 16, panelY + 174);
      context.textAlign = "left";
    }
  } else {
    // ── Varian B: With QR Code ──
    const qrSize = 140;
    const qrX = panelX + 12;
    const qrY = panelY + 28;
    if (qrImage) {
      context.imageSmoothingEnabled = false;
      context.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
      drawRoundedCanvasRect(context, qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 4, "transparent", "#CBD5E1", 1);
    }

    // Right: Info Column
    const textX = panelX + 162;
    const maxTextW = panelW - 174;

    // POP pill
    drawRoundedCanvasRect(context, textX, panelY + 14, maxTextW, 36, 6, "#F8FAFC", "#CBD5E1", 1.5);
    context.fillStyle = "#0F172A";
    drawAdaptiveCanvasText(context, `POP ${popName.toUpperCase()}`, textX + 8, panelY + 38, maxTextW - 16, {
      weight: 800,
      maxSize: 13,
      minSize: 10,
    });

    // CID
    context.fillStyle = "#64748B";
    context.font = "800 10px Arial, sans-serif";
    context.fillText("CUSTOMER ID", textX + 4, panelY + 70);

    context.fillStyle = "#0F172A";
    drawAdaptiveCanvasText(context, customerCode, textX + 4, panelY + 96, maxTextW - 8, {
      weight: 800,
      maxSize: 18,
      minSize: 12,
    });

    if (customerName) {
      context.fillStyle = "#334155";
      drawAdaptiveCanvasText(context, customerName, textX + 4, panelY + 118, maxTextW - 8, {
        weight: 600,
        maxSize: 12,
        minSize: 9,
      });
    }

    // Bottom port badge
    drawRoundedCanvasRect(context, textX, panelY + 144, maxTextW, 36, 6, "#F1F5F9", "#CBD5E1", 1);
    context.fillStyle = "#0F172A";
    context.font = "700 11px Arial, sans-serif";
    context.fillText(portLabel ? `PORT ${portLabel}` : "PATCH CORD", textX + 8, panelY + 166);
  }
}

export async function buildPatchCordLabelPngDataUrl(payload: PatchCordLabelPayload) {
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 220;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser tidak mendukung canvas export.");

  // Background
  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, canvas.width, canvas.height);

  let qrImage: HTMLImageElement | null = null;
  if (payload.variant === "qr") {
    let qrUrl = payload.qrDataUrl;
    if (!qrUrl && payload.customerId) {
      const QRCode = (await import("qrcode")).default;
      qrUrl = await QRCode.toDataURL(buildCustomerQrHref({ customerId: payload.customerId }), {
        width: 280,
        margin: 1,
        errorCorrectionLevel: "M",
      });
    }
    if (qrUrl) {
      qrImage = await loadImage(qrUrl).catch(() => null);
    }
  }

  // Draw Center Vertical Dotted Separator
  context.save();
  context.strokeStyle = "#94A3B8";
  context.lineWidth = 1.5;
  context.setLineDash([5, 5]);
  context.beginPath();
  context.moveTo(360, 8);
  context.lineTo(360, 212);
  context.stroke();
  context.restore();

  const panelW = 336;
  const panelH = 196;
  const panelY = 12;

  // Panel 1 (Left)
  renderSinglePatchCordPanel(context, 12, panelY, panelW, panelH, payload, qrImage);

  // Panel 2 (Right) - Identical
  renderSinglePatchCordPanel(context, 372, panelY, panelW, panelH, payload, qrImage);

  return canvas.toDataURL("image/png");
}

export async function drawPatchCordLabelPdf(doc: JsPdfDocument, rows: PatchCordLabelPayload[]) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const gapX = 6;
  const gapY = 5;
  const columns = 2;
  const rowsPerPage = 7;
  const labelWidth = (pageWidth - margin * 2 - gapX * (columns - 1)) / columns;
  const labelHeight = (pageHeight - margin * 2 - gapY * (rowsPerPage - 1)) / rowsPerPage;
  const labelImages = await Promise.all(rows.map((row) => buildPatchCordLabelPngDataUrl(row)));

  labelImages.forEach((labelDataUrl, index) => {
    if (index > 0 && index % (columns * rowsPerPage) === 0) doc.addPage();
    const pageIndex = index % (columns * rowsPerPage);
    const column = pageIndex % columns;
    const rowIndex = Math.floor(pageIndex / columns);
    const x = margin + column * (labelWidth + gapX);
    const y = margin + rowIndex * (labelHeight + gapY);
    doc.addImage(labelDataUrl, "PNG", x, y, labelWidth, labelHeight);
  });
}

export async function buildQrPreviewPngDataUrl(qrDataUrl: string, logoDataUrl?: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = 300;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser tidak mendukung canvas export.");

  const qrImage = await loadImage(qrDataUrl);
  const activeLogoDataUrl = logoDataUrl ?? await loadDefaultQrLogoDataUrl().catch(() => "");
  const logoImage = activeLogoDataUrl ? await loadImage(activeLogoDataUrl).catch(() => null) : null;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = false;
  context.drawImage(qrImage, 0, 0, canvas.width, canvas.height);
  if (logoImage) drawQrLogoImageCanvas(context, logoImage, canvas.width / 2, canvas.height / 2, 62);
  else drawDefaultQrLogoCanvas(context, canvas.width / 2, canvas.height / 2, 62);

  return canvas.toDataURL("image/png");
}

export function loadDefaultQrLogoDataUrl() {
  if (!defaultLogoDataUrlPromise) {
    defaultLogoDataUrlPromise = loadImage(DEFAULT_QR_LOGO_SRC).then((image) => {
      const canvas = document.createElement("canvas");
      canvas.width = 96;
      canvas.height = 96;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Browser tidak mendukung canvas export.");
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/png");
    });
  }
  return defaultLogoDataUrlPromise;
}

export async function loadQrLabelSettings(token?: string | null) {
  const response = await apiFetch<{ data: QrLabelSettings }>("/qr-label-settings", { token: token || undefined });
  return normalizeQrLabelSettings(response.data);
}

export async function loadQrLabelLogoDataUrl(token?: string | null) {
  const cacheKey = token ? `auth:${token}` : "default";
  if (!qrLogoDataUrlCache.has(cacheKey)) {
    qrLogoDataUrlCache.set(cacheKey, resolveQrLabelLogoDataUrl(token).catch(() => loadDefaultQrLogoDataUrl()));
  }
  return qrLogoDataUrlCache.get(cacheKey) as Promise<string>;
}

export function clearQrLabelLogoCache() {
  qrLogoDataUrlCache.clear();
}

async function resolveQrLabelLogoDataUrl(token?: string | null) {
  const setting = await loadQrLabelSettings(token);
  if (!setting?.is_active || !setting.qr_logo_attachment_id) {
    return loadDefaultQrLogoDataUrl();
  }

  const previewPath = setting.qr_logo_url || `/attachments/${setting.qr_logo_attachment_id}/preview`;
  const response = await fetch(`${API_BASE_URL}${previewPath}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) return loadDefaultQrLogoDataUrl();
  return blobToDataUrl(await response.blob());
}

function normalizeQrLabelSettings(setting: QrLabelSettings): QrLabelSettings {
  return {
    ...setting,
    qr_logo_attachment_id: normalizeNullableSettingValue(setting?.qr_logo_attachment_id),
    qr_logo_url: normalizeNullableSettingValue(setting?.qr_logo_url),
    qr_logo_original_name: normalizeNullableSettingValue(setting?.qr_logo_original_name),
    device_template_style: setting?.device_template_style === "hazard" ? "hazard" : "default",
    customer_patch_cord_style: setting?.customer_patch_cord_style === "qr" ? "qr" : "plain",
  };
}

function normalizeNullableSettingValue(value?: string | null) {
  const text = String(value || "").trim();
  if (!text || text.toLowerCase() === "null" || text.toLowerCase() === "undefined") return null;
  return text;
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Gagal memuat logo QR."));
    reader.readAsDataURL(blob);
  });
}

function normalizeQrText(value?: string | null, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  if (!text || text === "null" || text === "undefined") return fallback;
  return text;
}

function isLikelyUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

function isQrLabelOptionalTextVisible(value?: string | null) {
  const text = normalizeQrText(value);
  return Boolean(text && text !== "-" && !isLikelyUuid(text));
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Gagal memuat QR image."));
    image.src = src;
  });
}

function drawRoundedCanvasRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string | CanvasPattern,
  strokeStyle: string,
  lineWidth: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
  if (fillStyle !== "transparent") {
    context.fillStyle = fillStyle;
    context.fill();
  }
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;
  context.stroke();
}

function roundedCanvasPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function drawDefaultQrLogoCanvas(context: CanvasRenderingContext2D, centerX: number, centerY: number, size: number) {
  const rectX = centerX - size / 2;
  const rectY = centerY - size / 2;
  const innerPadding = size * 0.07;
  const innerX = rectX + innerPadding;
  const innerY = rectY + innerPadding;
  const innerSize = size - innerPadding * 2;
  context.save();
  drawRoundedCanvasRect(context, rectX, rectY, size, size, 5, "#ffffff", "#ffffff", Math.max(3, size * 0.06));
  drawRoundedCanvasRect(context, innerX, innerY, innerSize, innerSize, 5, "#020617", "#020617", 1);

  context.strokeStyle = "#ffffff";
  context.lineWidth = Math.max(2, size * 0.045);
  const nodeRadius = size * 0.07;
  const points = [
    [centerX, centerY - size * 0.23],
    [centerX - size * 0.2, centerY + size * 0.12],
    [centerX + size * 0.2, centerY + size * 0.12],
  ];
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  context.lineTo(points[1][0], points[1][1]);
  context.lineTo(points[2][0], points[2][1]);
  context.closePath();
  context.stroke();
  points.forEach(([x, y], index) => {
    context.fillStyle = index === 2 ? "#2dd4bf" : "#60a5fa";
    context.beginPath();
    context.arc(x, y, nodeRadius, 0, Math.PI * 2);
    context.fill();
  });
  context.restore();
}

function drawQrLogoImageCanvas(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  centerX: number,
  centerY: number,
  size: number,
) {
  const rectX = centerX - size / 2;
  const rectY = centerY - size / 2;
  const innerPadding = size * 0.07;
  const innerX = rectX + innerPadding;
  const innerY = rectY + innerPadding;
  const innerSize = size - innerPadding * 2;
  context.save();
  drawRoundedCanvasRect(context, rectX, rectY, size, size, 5, "#ffffff", "#ffffff", Math.max(3, size * 0.06));
  drawRoundedCanvasRect(context, innerX, innerY, innerSize, innerSize, 5, "#020617", "#020617", 1);
  roundedCanvasPath(context, innerX + size * 0.025, innerY + size * 0.025, innerSize - size * 0.05, innerSize - size * 0.05, 5);
  context.clip();
  const imageSize = size * 0.88;
  context.drawImage(image, centerX - imageSize / 2, centerY - imageSize / 2, imageSize, imageSize);
  context.restore();
}

function drawAdaptiveCanvasText(
  context: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  options: { weight: number; maxSize: number; minSize: number },
) {
  const text = normalizeQrText(value, "-");
  let fontSize = options.maxSize;
  while (fontSize > options.minSize) {
    context.font = `${options.weight} ${fontSize}px Arial, sans-serif`;
    if (context.measureText(text).width <= maxWidth) break;
    fontSize -= 1;
  }
  context.font = `${options.weight} ${fontSize}px Arial, sans-serif`;
  if (context.measureText(text).width <= maxWidth) {
    context.fillText(text, x, y);
    return;
  }

  let candidate = text;
  while (candidate.length > 1 && context.measureText(`${candidate}...`).width > maxWidth) {
    candidate = candidate.slice(0, -1);
  }
  context.fillText(`${candidate}...`, x, y);
}
