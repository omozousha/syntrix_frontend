import Image from "next/image";
import { ImagePlus, Images, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type AttachmentRef = {
  id: string;
  name?: string;
};

type DeviceGallerySectionProps = {
  attachments: AttachmentRef[];
  imagePreviewUrls: Record<string, string>;
  attachmentNames: Record<string, string>;
  loadingImagePreviews: boolean;
  editing: boolean;
  maxImageAttachments: number;
  newImageFiles: File[];
  newImagePreviewUrls: string[];
  onOpenGallery: (index: number) => void;
  onNewImageFilesChange: (files: FileList | null) => void;
  onClearNewImages: () => void;
  onRemoveNewImage: (index: number) => void;
};

export function DeviceGallerySection({
  attachments,
  imagePreviewUrls,
  attachmentNames,
  loadingImagePreviews,
  editing,
  maxImageAttachments,
  newImageFiles,
  newImagePreviewUrls,
  onOpenGallery,
  onNewImageFilesChange,
  onClearNewImages,
  onRemoveNewImage,
}: DeviceGallerySectionProps) {
  return (
    <section className="rounded-lg border bg-muted/10 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Images className="size-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold">Galeri resmi device</h3>
              <p className="max-w-2xl text-xs leading-5 text-muted-foreground">
                Foto yang sudah menjadi attachment resmi device. Evidence validasi tetap ditampilkan di histori validasi.
              </p>
            </div>
          </div>
        </div>
        <Badge variant="outline" className="rounded-md tabular-nums">
          {attachments.length} file resmi
        </Badge>
      </div>

      <div className="mt-3">
        {attachments.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {attachments.map((attachment, index) => {
              const src = imagePreviewUrls[attachment.id];
              const fileName = attachmentNames[attachment.id] || attachment.name || attachment.id;
              return (
                <button
                  type="button"
                  key={attachment.id}
                  className="overflow-hidden rounded-md border bg-muted/30 text-left transition hover:ring-2 hover:ring-primary/40"
                  title={fileName}
                  onClick={() => onOpenGallery(index)}
                >
                  {src ? (
                    <Image src={src} alt={fileName} width={120} height={90} className="h-20 w-full object-cover" />
                  ) : (
                    <div className="flex h-20 items-center justify-center text-[10px] text-muted-foreground">
                      {loadingImagePreviews ? "Loading..." : "No preview"}
                    </div>
                  )}
                  <p className="truncate px-1.5 py-1 text-[10px] text-muted-foreground">{fileName}</p>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
            Belum ada foto resmi untuk device ini.
          </div>
        )}
      </div>

      {editing ? (
        <div className="mt-3 space-y-2 rounded-md border bg-background/70 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Tambah foto resmi</p>
              <p className="text-xs text-muted-foreground">File baru masuk sebagai attachment resmi setelah perubahan disimpan.</p>
            </div>
            <Badge variant="secondary">{newImageFiles.length} file baru</Badge>
          </div>
          <Input type="file" accept="image/*" multiple onChange={(event) => onNewImageFilesChange(event.target.files)} />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ImagePlus className="size-3.5" />
            Maksimal total {maxImageAttachments} file (existing + baru), masing-masing max 5MB.
          </div>
          {newImageFiles.length ? (
            <div className="space-y-2 rounded-md border bg-muted/20 p-2">
              <div className="flex items-center justify-between">
                <Button type="button" variant="ghost" size="sm" onClick={onClearNewImages}>
                  <Trash2 className="mr-1 size-4" />
                  Clear
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {newImageFiles.map((file, index) => (
                  <div key={`${file.name}-${file.size}-${index}`} className="relative overflow-hidden rounded-md border bg-background">
                    {newImagePreviewUrls[index] ? (
                      <Image
                        src={newImagePreviewUrls[index]}
                        alt={file.name}
                        width={120}
                        height={90}
                        className="h-20 w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="h-20 w-full bg-muted" />
                    )}
                    <p className="truncate px-1.5 py-1 text-[10px] text-muted-foreground">{file.name}</p>
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute right-1 top-1 size-5"
                      onClick={() => onRemoveNewImage(index)}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
