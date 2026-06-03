"use client";

import Image from "next/image";
import { ImagePlus, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/features/data-management/device-form/form-field-grid";

const MAX_IMAGE_ATTACHMENTS = 10;

export function ImageAttachmentField({
  label,
  tooltip,
  files,
  previewUrls,
  onChange,
  onRemove,
  onClear,
}: {
  label: string;
  tooltip: string;
  files: File[];
  previewUrls: string[];
  onChange: (files: FileList | null) => void;
  onRemove: (index: number) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-2">
      <FieldLabel label={label} tooltip={tooltip} />
      <Input type="file" accept="image/*" multiple onChange={(event) => onChange(event.target.files)} />
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ImagePlus className="size-3.5" />
        Maksimal {MAX_IMAGE_ATTACHMENTS} file, masing-masing max 5MB.
      </div>

      {files.length ? (
        <div className="space-y-2 rounded-lg border bg-muted/20 p-2">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">{files.length} file dipilih</Badge>
            <Button type="button" variant="ghost" size="sm" onClick={onClear}>
              <Trash2 className="mr-1 size-4" />
              Clear
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2 md:grid-cols-5 lg:grid-cols-6">
            {files.map((file, index) => (
              <div key={`${file.name}-${file.size}-${index}`} className="relative overflow-hidden rounded-md border bg-background">
                {previewUrls[index] ? (
                  <Image
                    src={previewUrls[index]}
                    alt={file.name}
                    width={320}
                    height={96}
                    unoptimized
                    className="h-14 w-full object-cover sm:h-16 md:h-20"
                  />
                ) : (
                  <div className="h-14 w-full bg-muted sm:h-16 md:h-20" />
                )}
                <div className="space-y-1 p-1.5">
                  <p className="truncate text-[10px] text-muted-foreground">{file.name}</p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute right-1 top-1 size-5 sm:size-6"
                  onClick={() => onRemove(index)}
                >
                  <X className="size-3 sm:size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SupportDocumentField({
  label,
  tooltip,
  files,
  onChange,
}: {
  label: string;
  tooltip: string;
  files: File[];
  onChange: (files: File[]) => void;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel label={label} tooltip={tooltip} />
      <Input
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
        onChange={(event) => onChange(Array.from(event.target.files || []))}
      />
      <p className="text-xs text-muted-foreground">Format: image, excel, word, pdf</p>
      {files.length ? (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {files.map((file) => (
            <li key={`${file.name}-${file.size}`}>{file.name}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
