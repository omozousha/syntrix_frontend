import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/ui/optimized-image";

export type EvidenceChecklistRef = {
  key: string;
  candidates: string[];
  available: boolean;
};

export function EvidenceChecklistPreview({
  inspection,
  onPreview,
  onDownload,
}: {
  inspection?: Record<string, unknown> | null;
  onPreview: (candidates: string[], label: string) => Promise<void>;
  onDownload: (candidates: string[]) => Promise<void>;
}) {
  const initialPhotos = objectRecordValues(inspection?.initial_photos);
  const conditionChecks = objectRecordValues(inspection?.condition_checks);

  if (!initialPhotos.length && !conditionChecks.length) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-card p-2.5 shadow-2xs">
      <p className="mb-2 text-sm font-semibold tracking-tight">Pemeriksaan Awal & Checklist Kondisi</p>
      {initialPhotos.length ? (
        <div className="mb-4">
          <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Pemeriksaan Awal</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {initialPhotos.map((item, index) => (
              <div key={`${valueText(item.label)}-${index}`} className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
                <p className="text-xs font-semibold leading-normal text-foreground">{valueText(item.label)}</p>
                <p className="text-[11px] leading-relaxed text-muted-foreground mb-1.5">Foto: <span className="font-mono text-[10px]">{getInspectionAttachmentName(item.attachment)}</span></p>
                {getInspectionAttachmentUrl(item.attachment) && (
                  <OptimizedImage
                    src={getInspectionAttachmentUrl(item.attachment)}
                    thumbUrl={getInspectionAttachmentUrl(item.attachment)}
                    alt={valueText(item.label)}
                    aspectRatio="square"
                    size="thumb"
                    className="mb-2 h-24 w-full"
                  />
                )}
                <InspectionEvidenceActions
                  attachment={item.attachment}
                  label={`${valueText(item.label)} ${index + 1}`}
                  onPreview={onPreview}
                  onDownload={onDownload}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {conditionChecks.length ? (
        <div>
          <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Checklist Kondisi</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {conditionChecks.map((item, index) => (
              <div key={`${valueText(item.label)}-${index}`} className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold leading-normal text-foreground">{valueText(item.label)}</p>
                  <Badge variant="outline" className="shrink-0 font-mono text-[9px] uppercase tracking-normal">
                    {valueText(item.condition)}
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] leading-normal text-muted-foreground">Keterangan: {valueText(item.note)}</p>
                <p className="text-[11px] leading-normal text-muted-foreground">Foto: <span className="font-mono text-[10px]">{getInspectionAttachmentName(item.attachment)}</span></p>
                <InspectionEvidenceActions
                  attachment={item.attachment}
                  label={`${valueText(item.label)} ${index + 1}`}
                  onPreview={onPreview}
                  onDownload={onDownload}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InspectionEvidenceActions({
  attachment,
  label,
  onPreview,
  onDownload,
}: {
  attachment: unknown;
  label: string;
  onPreview: (candidates: string[], label: string) => Promise<void>;
  onDownload: (candidates: string[]) => Promise<void>;
}) {
  const ref = getInspectionAttachmentRef(attachment, label);
  if (!ref) {
    return (
      <p className="mt-2 rounded-md border border-dashed px-2 py-1 text-[11px] text-muted-foreground">
        Evidence belum tersedia.
      </p>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 px-2 text-[11px]"
        onClick={() => void onPreview(ref.candidates, label)}
      >
        Preview
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 px-2 text-[11px]"
        onClick={() => void onDownload(ref.candidates)}
      >
        Download
      </Button>
    </div>
  );
}

function getInspectionAttachmentRef(value: unknown, keyPrefix: string): EvidenceChecklistRef | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const attachment = value as Record<string, unknown>;
  const candidates = [attachment.id, attachment.attachment_id, attachment.storage_file_id, attachment.file_id]
    .map((candidate) => String(candidate || "").trim())
    .filter(Boolean);
  if (!candidates.length) return null;
  return {
    key: `${keyPrefix}-${candidates[0]}`,
    candidates,
    available: true,
  };
}

function objectRecordValues(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.values(value as Record<string, unknown>).filter(
    (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
}

function getInspectionAttachmentName(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "-";
  const attachment = value as Record<string, unknown>;
  return normalizeImageFilename(valueText(attachment.name || attachment.attachment_id || "Attachment tidak tersedia"));
}

// Sinkronkan ekstensi tampilan nama evidence lama (jpg/png/gif) menjadi .webp
// karena seluruh pipeline image sekarang dikonversi ke WebP di backend.
const RASTER_IMAGE_EXT = /\.(jpe?g|png|gif|bmp|tiff?|avif|webp)$/i;
function normalizeImageFilename(name: string) {
  if (!name || name === "-") return name;
  return RASTER_IMAGE_EXT.test(name) ? name.replace(/\.[^/.]+$/, "") + ".webp" : name;
}

function getInspectionAttachmentUrl(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const attachment = value as Record<string, unknown>;
  return (attachment.url || attachment.thumbUrl || attachment.file_url) as string | null;
}

function valueText(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  return String(value);
}
