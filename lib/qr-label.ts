import type { jsPDF as JsPdfDocument } from "jspdf";

export type QrLabelPayload = {
  deviceName: string;
  deviceCode: string;
  deviceType: string;
  popName: string;
  qrDataUrl: string;
  logoDataUrl?: string;
};

const QR_LABEL_FOOTER = "Scan QR untuk membuka detail/validasi Device";
const DEFAULT_QR_LOGO_SRC = "/syntrix-logo.png";
let defaultLogoDataUrlPromise: Promise<string> | null = null;

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

export async function buildQrLabelPngDataUrl({
  deviceName,
  deviceCode,
  deviceType,
  popName,
  qrDataUrl,
}: QrLabelPayload) {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 450;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser tidak mendukung canvas export.");

  const qrImage = await loadImage(qrDataUrl);
  const logoDataUrl = await loadDefaultQrLogoDataUrl().catch(() => "");
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

  drawAdaptiveCanvasText(context, `ID: ${deviceCode}`, textX, 119, 380, {
    weight: 800,
    maxSize: 26,
    minSize: 18,
  });
  drawAdaptiveCanvasText(context, `TYPE: ${deviceType}`, textX, 164, 380, {
    weight: 800,
    maxSize: 26,
    minSize: 18,
  });
  drawAdaptiveCanvasText(context, `POP: ${popName}`, textX, 209, 380, {
    weight: 800,
    maxSize: 26,
    minSize: 17,
  });

  context.fillStyle = "#dc2626";
  drawAdaptiveCanvasText(context, QR_LABEL_FOOTER, textX, 414, 390, {
    weight: 700,
    maxSize: 17,
    minSize: 12,
  });

  return canvas.toDataURL("image/png");
}

export function drawQrLabelPdf(doc: JsPdfDocument, rows: QrLabelPayload[]) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;
  const gap = 4;
  const columns = 2;
  const rowsPerPage = 6;
  const labelWidth = (pageWidth - margin * 2 - gap * (columns - 1)) / columns;
  const labelHeight = (pageHeight - margin * 2 - gap * (rowsPerPage - 1)) / rowsPerPage;

  rows.forEach((row, index) => {
    if (index > 0 && index % (columns * rowsPerPage) === 0) doc.addPage();
    const pageIndex = index % (columns * rowsPerPage);
    const column = pageIndex % columns;
    const rowIndex = Math.floor(pageIndex / columns);
    const x = margin + column * (labelWidth + gap);
    const y = margin + rowIndex * (labelHeight + gap);
    const inset = 1.2;
    const qrSize = Math.min(labelHeight - 5.2, labelWidth * 0.43);
    const qrX = x + 2.2;
    const qrY = y + (labelHeight - qrSize) / 2;
    const separatorX = qrX + qrSize + 2.2;
    const textX = separatorX + 3.2;
    const textWidth = labelWidth - (textX - x) - 2.2;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(17, 24, 39);
    doc.setLineWidth(0.7);
    doc.roundedRect(x, y, labelWidth, labelHeight, 2.2, 2.2, "FD");
    doc.setLineWidth(0.32);
    doc.roundedRect(x + inset, y + inset, labelWidth - inset * 2, labelHeight - inset * 2, 1.6, 1.6);

    doc.addImage(row.qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
    if (row.logoDataUrl) drawQrLogoImagePdf(doc, row.logoDataUrl, qrX + qrSize / 2, qrY + qrSize / 2, qrSize * 0.22);
    else drawDefaultQrLogoPdf(doc, qrX + qrSize / 2, qrY + qrSize / 2, qrSize * 0.22);

    doc.setFillColor(17, 24, 39);
    doc.rect(separatorX, y + 2, 1.1, labelHeight - 4, "F");

    doc.setTextColor(2, 6, 23);
    doc.setFont("helvetica", "bold");
    drawAdaptivePdfText(doc, row.deviceName, textX, y + 7.2, textWidth, 9.1, 6.4);
    drawAdaptivePdfText(doc, `ID: ${row.deviceCode}`, textX, y + 14.8, textWidth, 5.9, 4.3);
    drawAdaptivePdfText(doc, `TYPE: ${row.deviceType}`, textX, y + 20.6, textWidth, 5.9, 4.3);
    drawAdaptivePdfText(doc, `POP: ${row.popName}`, textX, y + 26.4, textWidth, 5.9, 4);
    doc.setTextColor(220, 38, 38);
    drawAdaptivePdfText(doc, QR_LABEL_FOOTER, textX, y + labelHeight - 3, textWidth, 4.5, 3.4);
  });
}

export async function buildQrPreviewPngDataUrl(qrDataUrl: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = 300;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser tidak mendukung canvas export.");

  const qrImage = await loadImage(qrDataUrl);
  const logoDataUrl = await loadDefaultQrLogoDataUrl().catch(() => "");
  const logoImage = logoDataUrl ? await loadImage(logoDataUrl).catch(() => null) : null;

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

function normalizeQrText(value?: string | null, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  if (!text || text === "null" || text === "undefined") return fallback;
  return text;
}

function isLikelyUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
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
  fillStyle: string,
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

function drawDefaultQrLogoPdf(doc: JsPdfDocument, centerX: number, centerY: number, size: number) {
  const rectX = centerX - size / 2;
  const rectY = centerY - size / 2;
  const innerPadding = size * 0.07;
  const innerX = rectX + innerPadding;
  const innerY = rectY + innerPadding;
  const innerSize = size - innerPadding * 2;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(Math.max(0.18, size * 0.06));
  doc.roundedRect(rectX, rectY, size, size, 1.2, 1.2, "FD");
  doc.setFillColor(2, 6, 23);
  doc.setDrawColor(2, 6, 23);
  doc.roundedRect(innerX, innerY, innerSize, innerSize, 1.2, 1.2, "FD");

  const points = [
    [centerX, centerY - size * 0.23],
    [centerX - size * 0.2, centerY + size * 0.12],
    [centerX + size * 0.2, centerY + size * 0.12],
  ];
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(Math.max(0.12, size * 0.045));
  doc.line(points[0][0], points[0][1], points[1][0], points[1][1]);
  doc.line(points[1][0], points[1][1], points[2][0], points[2][1]);
  doc.line(points[2][0], points[2][1], points[0][0], points[0][1]);

  points.forEach(([x, y], index) => {
    if (index === 2) doc.setFillColor(45, 212, 191);
    else doc.setFillColor(96, 165, 250);
    doc.circle(x, y, size * 0.07, "F");
  });
}

function drawQrLogoImagePdf(doc: JsPdfDocument, logoDataUrl: string, centerX: number, centerY: number, size: number) {
  const rectX = centerX - size / 2;
  const rectY = centerY - size / 2;
  const innerPadding = size * 0.07;
  const innerX = rectX + innerPadding;
  const innerY = rectY + innerPadding;
  const innerSize = size - innerPadding * 2;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(Math.max(0.18, size * 0.06));
  doc.roundedRect(rectX, rectY, size, size, 1.2, 1.2, "FD");
  doc.setFillColor(2, 6, 23);
  doc.setDrawColor(2, 6, 23);
  doc.roundedRect(innerX, innerY, innerSize, innerSize, 1.2, 1.2, "FD");
  const imageSize = size * 0.88;
  doc.addImage(logoDataUrl, "PNG", centerX - imageSize / 2, centerY - imageSize / 2, imageSize, imageSize);
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

function drawAdaptivePdfText(
  doc: JsPdfDocument,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  maxFontSize: number,
  minFontSize: number,
) {
  const text = normalizeQrText(value, "-");
  let fontSize = maxFontSize;
  while (fontSize > minFontSize) {
    doc.setFontSize(fontSize);
    if (doc.getTextWidth(text) <= maxWidth) break;
    fontSize -= 0.2;
  }
  doc.setFontSize(fontSize);
  const fittedText = doc.getTextWidth(text) <= maxWidth ? text : truncatePdfTextByWidth(doc, text, maxWidth);
  doc.text(fittedText, x, y, { maxWidth });
}

function truncatePdfTextByWidth(doc: JsPdfDocument, value: string, maxWidth: number) {
  const text = normalizeQrText(value, "-");
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let candidate = text;
  while (candidate.length > 1 && doc.getTextWidth(`${candidate}...`) > maxWidth) {
    candidate = candidate.slice(0, -1);
  }
  return `${candidate}...`;
}
