"use client";

import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { Eye, ImageUp, QrCode, RefreshCw, Save } from "lucide-react";

import { AppLoading } from "@/components/app-loading-new";
import { ResponseDialog } from "@/components/response-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// ponytail: Card imports removed — now uses Double-Bezel pattern directly
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/api";
import {
  buildQrLabelPngDataUrl,
  clearQrLabelLogoCache,
  loadQrLabelLogoDataUrl,
  loadQrLabelSettings,
  type QrLabelSettings,
} from "@/lib/qr-label";

type UploadResult = {
  id: string;
  attachment_id?: string | null;
  original_name?: string | null;
  mime_type?: string | null;
};

type QrLabelSettingsPanelProps = {
  token?: string | null;
};

export function QrLabelSettingsPanel({ token }: QrLabelSettingsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [setting, setSetting] = useState<QrLabelSettings | null>(null);
  const [logoPreviewDataUrl, setLogoPreviewDataUrl] = useState("");
  const [labelPreviewDataUrl, setLabelPreviewDataUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cropSourceDataUrl, setCropSourceDataUrl] = useState("");
  const [cropPreviewDataUrl, setCropPreviewDataUrl] = useState("");
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffsetX, setCropOffsetX] = useState(0);
  const [cropOffsetY, setCropOffsetY] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successDialogTitle, setSuccessDialogTitle] = useState("");
  const [successDialogDescription, setSuccessDialogDescription] = useState("");
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError("");
      try {
        const [nextSetting, logoDataUrl] = await Promise.all([
          loadQrLabelSettings(token),
          loadQrLabelLogoDataUrl(token).catch(() => ""),
        ]);
        if (cancelled) return;
        setSetting(nextSetting);
        setLogoPreviewDataUrl(logoDataUrl);
      } catch (err) {
        if (!cancelled) setError((err as Error).message || "Gagal memuat QR label settings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    async function buildPreview() {
      try {
        const qrDataUrl = await QRCode.toDataURL("https://syntrix-one.vercel.app/field/odp/sample", {
          width: 360,
          margin: 2,
          errorCorrectionLevel: "H",
        });
        const dataUrl = await buildQrLabelPngDataUrl({
          deviceName: "AGD-ODP-01.01",
          deviceCode: "INV-2019/07/010/0003",
          deviceType: "ODP",
          popName: "DIPATIUKUR | DPU",
          projectName: "FTTH Bandung 2026",
          tenantName: "Retail",
          qrDataUrl,
          logoDataUrl: logoPreviewDataUrl || undefined,
          footerText: setting?.footer_text || undefined,
        });
        if (!cancelled) setLabelPreviewDataUrl(dataUrl);
      } catch {
        if (!cancelled) setLabelPreviewDataUrl("");
      }
    }

    if (!loading) void buildPreview();
    return () => {
      cancelled = true;
    };
  }, [loading, logoPreviewDataUrl, setting?.footer_text]);

  useEffect(() => {
    if (!cropSourceDataUrl) {
      setCropPreviewDataUrl("");
      return;
    }

    let cancelled = false;
    cropImageDataUrl(cropSourceDataUrl, cropZoom, cropOffsetX, cropOffsetY)
      .then((dataUrl) => {
        if (!cancelled) setCropPreviewDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setCropPreviewDataUrl("");
      });

    return () => {
      cancelled = true;
    };
  }, [cropOffsetX, cropOffsetY, cropSourceDataUrl, cropZoom]);

  async function reloadSettings() {
    clearQrLabelLogoCache();
    const [nextSetting, logoDataUrl] = await Promise.all([
      loadQrLabelSettings(token),
      loadQrLabelLogoDataUrl(token).catch(() => ""),
    ]);
    setSetting(nextSetting);
    setLogoPreviewDataUrl(logoDataUrl);
  }

  async function handleFile(file: File | null) {
    setError("");
    setSuccess("");

    if (!file) {
      setSelectedFile(null);
      setCropSourceDataUrl("");
      setCropPreviewDataUrl("");
      await reloadSettings().catch(() => undefined);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setSelectedFile(null);
      setError("Logo QR harus berupa file image.");
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    setSelectedFile(null);
    setCropSourceDataUrl(dataUrl);
    setCropZoom(1);
    setCropOffsetX(0);
    setCropOffsetY(0);
    setLogoPreviewDataUrl(dataUrl);
  }

  async function handleApplyCrop() {
    if (!cropSourceDataUrl) return;
    setError("");
    setSuccess("");
    try {
      const croppedDataUrl = await cropImageDataUrl(cropSourceDataUrl, cropZoom, cropOffsetX, cropOffsetY);
      const croppedFile = await dataUrlToFile(croppedDataUrl, "qr-label-logo.png");
      setSelectedFile(croppedFile);
      setLogoPreviewDataUrl(croppedDataUrl);
      setCropSourceDataUrl("");
      setCropPreviewDataUrl("");
    } catch (err) {
      setError((err as Error).message || "Gagal crop logo QR.");
    }
  }

  function handleCancelCrop() {
    setSelectedFile(null);
    setCropSourceDataUrl("");
    setCropPreviewDataUrl("");
    void reloadSettings().catch(() => undefined);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      let logoAttachmentId = normalizeNullableSettingValue(setting?.qr_logo_attachment_id);
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("file_category", "image");
        formData.append("entity_type", "qr_label_setting");
        formData.append("is_public", "false");

        const upload = await apiFetch<{ data: UploadResult }>("/attachments/upload", {
          method: "POST",
          token: token || undefined,
          body: formData,
        });
        logoAttachmentId = upload.data.id;
      }

      const response = await apiFetch<{ data: QrLabelSettings }>("/qr-label-settings", {
        method: "PATCH",
        token: token || undefined,
        body: {
          qr_logo_attachment_id: logoAttachmentId,
          footer_text: setting?.footer_text || "Scan QR untuk membuka detail/validasi Device",
          is_active: true,
        },
      });

      clearQrLabelLogoCache();
      setSetting(response.data);
      setSelectedFile(null);
      setCropSourceDataUrl("");
      setCropPreviewDataUrl("");
      await reloadSettings();
      const message = selectedFile
        ? "Logo QR label berhasil diupload dan diterapkan ke detail ODP serta bulk QR."
        : "QR label settings berhasil disimpan.";
      setSuccess(message);
      setSuccessDialogTitle("QR Label Berhasil Disimpan");
      setSuccessDialogDescription(message);
      setSuccessDialogOpen(true);
    } catch (err) {
      setError((err as Error).message || "Gagal menyimpan QR label settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetLogo() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await apiFetch<{ data: QrLabelSettings }>("/qr-label-settings", {
        method: "PATCH",
        token: token || undefined,
        body: {
          reset_logo: true,
          footer_text: setting?.footer_text || "Scan QR untuk membuka detail/validasi Device",
          is_active: true,
        },
      });
      clearQrLabelLogoCache();
      setSetting(response.data);
      setSelectedFile(null);
      setCropSourceDataUrl("");
      setCropPreviewDataUrl("");
      await reloadSettings();
      const message = "Logo QR dikembalikan ke default.";
      setSuccess(message);
      setSuccessDialogTitle("Logo QR Berhasil Direset");
      setSuccessDialogDescription(message);
      setSuccessDialogOpen(true);
    } catch (err) {
      setError((err as Error).message || "Gagal reset logo QR.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="rounded-[1.5rem] border border-border/40 bg-muted/10 p-1 shadow-2xs dark:bg-white/[0.01]">
        <div className="rounded-[calc(1.5rem-0.25rem)] border border-border/60 bg-card glass-inset">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/40 p-5 pb-4">
            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                KONFIGURASI / QR LABEL
              </p>
              <h2 className="mt-0.5 flex items-center gap-2 text-base font-semibold text-foreground">
                <QrCode className="size-4 text-primary" />
                QR Label Settings
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Atur logo tengah dan footer QR label untuk download detail ODP dan bulk QR.
              </p>
            </div>
            <Badge variant="secondary" className="font-mono text-[9px] uppercase tracking-[0.12em]">
              Superadmin
            </Badge>
          </div>
          <div className="grid min-w-0 gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
          <div className="min-w-0 space-y-5">
            {loading ? <AppLoading label="Memuat QR label settings..." /> : null}

            {!loading ? (
              <>
                {/* Status Aktif */}
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-muted/15 px-4 py-3 text-sm shadow-2xs glass-inset">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground">Logo Aktif</span>
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="truncate text-xs text-muted-foreground">
                    {cropSourceDataUrl ? "Menunggu crop" : selectedFile?.name || setting?.qr_logo_original_name || "Default Syntrix logo"}
                  </span>
                  {setting?.updated_at ? (
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                      &middot; Update: {new Date(setting.updated_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  ) : null}
                  {cropSourceDataUrl ? (
                    <Badge variant="destructive" className="ml-auto shrink-0 font-mono text-[9px] uppercase tracking-[0.12em]">
                      Belum disimpan
                    </Badge>
                  ) : null}
                </div>

                {/* Mobile Preview Toggle */}
                <div className="xl:hidden">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-center gap-2 rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                    onClick={() => setMobilePreviewOpen((v) => !v)}
                  >
                    <Eye className="size-3.5" />
                    {mobilePreviewOpen ? "Tutup preview" : "Lihat preview QR label"}
                  </Button>
                  {mobilePreviewOpen ? (
                    <div className="mt-3 space-y-2">
                      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Preview label</p>
                      <div className="overflow-hidden rounded-2xl border border-border/60 bg-white p-3 shadow-2xs">
                        {labelPreviewDataUrl ? (
                          <Image
                            src={labelPreviewDataUrl}
                            alt="QR label preview"
                            width={900}
                            height={450}
                            unoptimized
                            className="h-auto w-full rounded-xl"
                          />
                        ) : (
                          <div className="flex aspect-[2/1] items-center justify-center text-xs text-muted-foreground">Preview belum tersedia</div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Upload Zone */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
                  onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                  onDrop={(e) => { e.preventDefault(); setDragActive(false); void handleFile(e.dataTransfer.files?.[0] || null); }}
                  className={[
                    "flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center shadow-2xs glass-inset transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                    dragActive ? "border-primary bg-primary/5 text-primary" : "border-border/60 hover:border-primary/50 hover:bg-muted/15",
                    saving ? "pointer-events-none opacity-50" : "",
                  ].join(" ")}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void handleFile(e.target.files?.[0] || null)}
                    disabled={saving}
                  />
                  <div className="mb-2 rounded-xl border border-border/50 bg-muted/40 p-2.5 shadow-2xs">
                    <ImageUp className="size-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Upload atau drag logo QR</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Gunakan logo dengan kontras jelas. Format persegi (1:1) direkomendasikan.
                  </p>
                  {selectedFile ? (
                    <Badge variant="secondary" className="mt-2.5 font-mono text-[9px] uppercase tracking-[0.12em]">
                      File: {selectedFile.name}
                    </Badge>
                  ) : null}
                </div>

                {/* Crop Controls */}
                {cropSourceDataUrl ? (
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4 shadow-2xs glass-inset">
                    <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">Crop Logo</p>
                    <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
                      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-white shadow-2xs">
                        {cropPreviewDataUrl ? (
                          <Image src={cropPreviewDataUrl} alt="Preview crop" width={512} height={512} unoptimized className="h-full w-full object-contain" />
                        ) : (
                          <span className="text-xs text-muted-foreground">Memproses...</span>
                        )}
                      </div>
                      <div className="space-y-3.5">
                        <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                          Hasil crop square agar logo rapi di tengah QR label.
                        </p>
                        <CropRange id="qr-logo-crop-zoom" label="Zoom" min={1} max={3} step={0.05} value={cropZoom} valueLabel={`${cropZoom.toFixed(2)}x`} onChange={setCropZoom} />
                        <CropRange id="qr-logo-crop-x" label="Geser Horizontal" min={-100} max={100} step={1} value={cropOffsetX} valueLabel={`${cropOffsetX}`} onChange={setCropOffsetX} />
                        <CropRange id="qr-logo-crop-y" label="Geser Vertikal" min={-100} max={100} step={1} value={cropOffsetY} valueLabel={`${cropOffsetY}`} onChange={setCropOffsetY} />
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void handleApplyCrop()}
                            disabled={saving || !cropPreviewDataUrl}
                            className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                          >
                            Gunakan Crop
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleCancelCrop}
                            disabled={saving}
                            className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                          >
                            Batal
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Footer Text */}
                <div className="space-y-1.5">
                  <Label htmlFor="qr-footer-text" className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                    Footer Label
                  </Label>
                  <Input
                    id="qr-footer-text"
                    value={setting?.footer_text || ""}
                    onChange={(e) => setSetting((prev) => ({ ...(prev || {}), footer_text: e.target.value }))}
                    placeholder="Scan QR untuk membuka detail/validasi Device"
                    disabled={saving}
                    className="h-9 rounded-xl border-border/60 bg-card text-xs shadow-2xs glass-inset"
                  />
                  <p className="font-mono text-[10px] text-muted-foreground">Teks ini muncul di bawah QR label.</p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving || loading || Boolean(cropSourceDataUrl)}
                    className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                  >
                    <Save className="mr-2 size-3.5" />
                    {saving ? "Menyimpan..." : "Simpan Pengaturan"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleResetLogo()}
                    disabled={saving || loading}
                    className="rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                  >
                    <RefreshCw className="mr-2 size-3.5" />
                    Reset Logo
                  </Button>
                </div>

                {/* Error/Success */}
                {error ? (
                  <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive glass-inset">
                    {error}
                  </div>
                ) : null}
                {success ? (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-300 glass-inset">
                    {success}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          {/* Desktop Preview */}
          <div className="hidden min-w-0 space-y-2 xl:sticky xl:top-4 xl:block xl:self-start">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Preview Label QR</p>
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-white p-3.5 shadow-xs">
              {labelPreviewDataUrl ? (
                <Image
                  src={labelPreviewDataUrl}
                  alt="QR label preview"
                  width={900}
                  height={450}
                  unoptimized
                  className="h-auto w-full max-w-full rounded-xl"
                />
              ) : (
                <div className="flex aspect-[2/1] items-center justify-center text-xs text-muted-foreground">
                  Preview belum tersedia
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Preview adalah representasi cetak fisik. QR akan mengarah ke detail ODP di aplikasi.
            </p>
          </div>
        </div>
      </div>
    </div>

      <ResponseDialog
        open={successDialogOpen}
        title={successDialogTitle}
        description={successDialogDescription}
        variant="success"
        actionLabel="OK"
        onOpenChange={setSuccessDialogOpen}
        onAction={() => setSuccessDialogOpen(false)}
      />
    </>
  );
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Gagal membaca file logo."));
    reader.readAsDataURL(file);
  });
}

function CropRange({
  id,
  label,
  min,
  max,
  step,
  value,
  valueLabel,
  onChange,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  valueLabel: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
          {label}
        </Label>
        <span className="font-mono text-[10px] tabular-nums font-semibold">{valueLabel}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer accent-primary"
      />
    </div>
  );
}

function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Gagal memuat preview logo."));
    image.src = src;
  });
}

async function cropImageDataUrl(src: string, zoom: number, offsetX: number, offsetY: number) {
  const image = await loadImageElement(src);
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  if (!naturalWidth || !naturalHeight) throw new Error("Ukuran logo tidak valid.");

  const outputSize = 512;
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser tidak mendukung crop logo.");

  const normalizedZoom = Math.max(1, zoom);
  const cropSize = Math.max(1, Math.min(naturalWidth, naturalHeight) / normalizedZoom);
  const maxShiftX = Math.max(0, (naturalWidth - cropSize) / 2);
  const maxShiftY = Math.max(0, (naturalHeight - cropSize) / 2);
  const centerX = naturalWidth / 2 + (clamp(offsetX, -100, 100) / 100) * maxShiftX;
  const centerY = naturalHeight / 2 + (clamp(offsetY, -100, 100) / 100) * maxShiftY;
  const sourceX = clamp(centerX - cropSize / 2, 0, naturalWidth - cropSize);
  const sourceY = clamp(centerY - cropSize / 2, 0, naturalHeight - cropSize);

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, outputSize, outputSize);
  context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, outputSize, outputSize);

  return canvas.toDataURL("image/png");
}

async function dataUrlToFile(dataUrl: string, filename: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: "image/png" });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeNullableSettingValue(value?: string | null) {
  const text = String(value || "").trim();
  if (!text || text.toLowerCase() === "null" || text.toLowerCase() === "undefined") return null;
  return text;
}
