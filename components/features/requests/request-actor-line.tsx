"use client";

import { useTranslate } from "@/lib/use-locale";

export function RequestActorLine({
  label,
  value,
}: {
  label?: string;
  value: string;
}) {
  const { t } = useTranslate();
  const resolvedLabel = label ?? t("requestActor.submittedBy");
  return (
    <div className="rounded-md border bg-muted/20 px-2 py-1.5">
      <p className="text-[10px] uppercase leading-4 text-muted-foreground">{resolvedLabel}</p>
      <p className="break-words text-sm leading-5">{value || "-"}</p>
    </div>
  );
}
