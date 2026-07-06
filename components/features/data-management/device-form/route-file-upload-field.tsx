"use client";

import { useState, useRef } from "react";
import { useSession } from "@/components/session-context";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react";

type ParsedRouteData = {
  coordinates: number[][];
  length_m: number;
  point_count: number;
  route_file_url: string | null;
};

type RouteFileUploadProps = {
  onParsed: (data: ParsedRouteData) => void;
  disabled?: boolean;
};

export function RouteFileUploadField({ onParsed, disabled = false }: RouteFileUploadProps) {
  const { token } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [parsed, setParsed] = useState<ParsedRouteData | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleUpload = async (selectedFile: File) => {
    setFile(selectedFile);
    setError("");
    setParsed(null);

    const ext = selectedFile.name.split(".").pop()?.toLowerCase() || "";
    if (!["kml", "kmz"].includes(ext)) {
      setError("Format file harus KML atau KMZ.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const result = await apiFetch<{
        success: boolean;
        message: string;
        data: ParsedRouteData;
      }>("/cables/upload-route", {
        method: "POST",
        token,
        body: formData,
      });

      if (result.success && result.data) {
        const data = result.data;
        setParsed(data);
        onParsed(data);
      } else {
        throw new Error(result.message || "Gagal memproses file.");
      }
    } catch (err) {
      const message = (err as Error).message || "Gagal upload file.";
      setError(message);
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleUpload(droppedFile);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleUpload(selectedFile);
  };

  const handleRemove = () => {
    setFile(null);
    setParsed(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <div
        className={`
          relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors
          ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
          ${error ? "border-destructive/50 bg-destructive/5" : ""}
          ${parsed ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" : ""}
          ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
        `}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".kml,.kmz"
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Memproses file route...</p>
          </div>
        ) : parsed ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm font-medium">{file?.name}</p>
              <p className="text-xs text-muted-foreground">
                📍 {parsed.point_count.toLocaleString()} titik koordinat
                {"  |  "}📏 {(parsed.length_m / 1000).toFixed(2)} km
                {"  |  "}📐 {Math.round(parsed.length_m).toLocaleString()} m
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                Upload Route File (KML/KMZ)
              </p>
              <p className="text-xs text-muted-foreground">
                Drag & drop file KML/KMZ, atau klik untuk pilih file
              </p>
            </div>
          </div>
        )}
      </div>

      {parsed && (
        <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
          <div className="text-xs text-muted-foreground">
            <FileText className="mr-1 inline-block h-3 w-3" />
            {file?.name} — {(parsed.length_m / 1000).toFixed(2)} km, {parsed.point_count} titik
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleRemove}
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
