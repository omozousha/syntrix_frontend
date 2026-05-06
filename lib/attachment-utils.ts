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
  try {
    const result = await apiFetch<{ data: AttachmentResolveData }>(
      `/attachments/resolve/${encodeURIComponent(key)}`,
      { token },
    );
    resolveCache.set(key, result.data || null);
    return result.data || null;
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
  const id = resolved?.id || String(identifier || "").trim();
  if (!id) throw new Error("Attachment identifier kosong.");
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
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename || "attachment";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
