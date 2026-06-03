export function normalizePopName(value: string | null | undefined) {
  const text = normalizeSpacing(value);
  if (!text) return "";

  return text
    .toLocaleLowerCase("id-ID")
    .replace(/(^|\s)(\S)/g, (match, prefix: string, letter: string) => `${prefix}${letter.toLocaleUpperCase("id-ID")}`);
}

export function normalizeDeviceName(value: string | null | undefined) {
  return normalizeSpacing(value).toLocaleUpperCase("id-ID");
}

function normalizeSpacing(value: string | null | undefined) {
  return String(value || "").trim().replace(/\s+/g, " ");
}
