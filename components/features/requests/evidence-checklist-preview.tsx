import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
    <div className="rounded-md border p-2.5">
      <p className="mb-1.5 text-sm font-medium">Pemeriksaan Awal & Checklist Kondisi</p>
      {initialPhotos.length ? (
        <div className="mb-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Pemeriksaan Awal</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {initialPhotos.map((item, index) => (
              <div key={`${valueText(item.label)}-${index}`} className="rounded-md border bg-muted/20 p-2">
                <p className="text-xs font-medium">{valueText(item.label)}</p>
                <p className="text-xs text-muted-foreground">Foto: {getInspectionAttachmentName(item.attachment)}</p>
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
          <p className="mb-1 text-xs font-medium text-muted-foreground">Checklist Kondisi</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {conditionChecks.map((item, index) => (
              <div key={`${valueText(item.label)}-${index}`} className="rounded-md border bg-muted/20 p-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium">{valueText(item.label)}</p>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {valueText(item.condition)}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Keterangan: {valueText(item.note)}</p>
                <p className="text-xs text-muted-foreground">Foto: {getInspectionAttachmentName(item.attachment)}</p>
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
  return valueText(attachment.name || attachment.attachment_id || attachment.id);
}

function valueText(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  return String(value);
}
