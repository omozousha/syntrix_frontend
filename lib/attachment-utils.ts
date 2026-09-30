import { API_BASE_URL, apiFetch } from "@/lib/api";

type AttachmentResolveData = {
  id: string;
  attachment_id?: string | null;
  storage_file_id?: string | null;
  original_name?: string | null;
  mime_type?: string | null;
};

const resolveCache = new Map<string, AttachmentResolveData | null>();

export async function resolveAttachment(identifier: string, token: string) {
  const key = String(identifier || "").trim();
  if (!key) return null;
  if (resolveCache.has(key)) return resolveCache.get(key) || null;
  // Backend /attachments/resolve/:identifier matches id, attachment_id, or storage_file_id in one lookup.
  // (The list endpoint GET /attachments does not exist, so filter-query fallbacks used to 404.)
  try {
    const res = await apiFetch<{ data?: AttachmentResolveData }>(
      `/attachments/resolve/${encodeURIComponent(key)}`,
      { token },
    );
    const row = res.data?.id ? res.data : null;
    resolveCache.set(key, row);
    return row;
  } catch {
    resolveCache.set(key, null);
    return null;
  }
}

export async function fetchAttachmentBlob(
  identifier: string,
  token: string,
  mode: "preview" | "download" = "preview",
) {
  const resolved = await resolveAttachment(identifier, token);
  const id = String(resolved?.id || "").trim();
  if (!id) {
    throw new Error("Attachment tidak ditemukan atau belum sinkron.");
  }
  const response = await fetch(`${API_BASE_URL}/attachments/${id}/${mode}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Attachment ${mode} gagal (${response.status})`);
  }
  const blob = await response.blob();
  return {
    blob,
    filename: resolved?.original_name || id,
  };
}

export async function downloadAttachmentFile(identifier: string, token: string) {
  const { blob, filename } = await fetchAttachmentBlob(identifier, token, "download");
  const cleanFilename = blob.type === "image/webp" && filename && !filename.toLowerCase().endsWith(".webp")
    ? filename.replace(/\.[^/.]+$/, "") + ".webp"
    : filename || "attachment.webp";
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = cleanFilename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
