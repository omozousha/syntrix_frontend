import { API_BASE_URL, apiFetch } from "@/lib/api";
import type { PaginatedResponse } from "@/lib/api";

type AttachmentResolveData = {
  id: string;
  attachment_id?: string | null;
  storage_file_id?: string | null;
  original_name?: string | null;
  mime_type?: string | null;
};

const resolveCache = new Map<string, AttachmentResolveData | null>();

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function resolveAttachment(identifier: string, token: string) {
  const key = String(identifier || "").trim();
  if (!key) return null;
  if (resolveCache.has(key)) return resolveCache.get(key) || null;
  // Prefer frontend-side safe resolution to avoid backend cast errors on old deployments.
  // 1) UUID identifier: try PK
  if (isUuidLike(key)) {
    try {
      const byPk = await apiFetch<{ data: AttachmentResolveData }>(`/attachments/${encodeURIComponent(key)}`, { token });
      if (byPk.data?.id) {
        resolveCache.set(key, byPk.data);
        return byPk.data;
      }
    } catch {
      // continue
    }
    try {
      const byStorage = await apiFetch<PaginatedResponse<AttachmentResolveData>>(
        `/attachments?page=1&limit=1&storage_file_id=${encodeURIComponent(key)}`,
        { token },
      );
      const row = byStorage.data?.[0] || null;
      resolveCache.set(key, row);
      return row;
    } catch {
      // continue
    }
  }

  // 2) ATT code (or any non-uuid): query by attachment_id only
  try {
    const byCode = await apiFetch<PaginatedResponse<AttachmentResolveData>>(
      `/attachments?page=1&limit=1&attachment_id=${encodeURIComponent(key)}`,
      { token },
    );
    const row = byCode.data?.[0] || null;
    resolveCache.set(key, row);
    return row;
  } catch {
    // continue to broad fallback
  }

  // 3) Broad fallback for older backends that do not support field filters.
  // Keep scope small to avoid heavy requests.
  try {
    const unfiltered = await apiFetch<PaginatedResponse<AttachmentResolveData>>("/attachments?page=1&limit=200", {
      token,
    });
    const row =
      (unfiltered.data || []).find((item) =>
        item
        && (String(item.id || "") === key
          || String(item.attachment_id || "") === key
          || String(item.storage_file_id || "") === key),
      ) || null;
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
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename || "attachment";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
