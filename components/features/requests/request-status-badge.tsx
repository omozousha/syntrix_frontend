"use client";

import { Badge } from "@/components/ui/badge";
import { mapValidationStatus } from "@/lib/validation-status";
import { useTranslate } from "@/lib/use-locale";

export function RequestStatusBadge({
  status,
  className = "",
}: {
  status?: string | null;
  className?: string;
}) {
  const { t } = useTranslate();
  const mapped = mapValidationStatus(status, t);

  return (
    <Badge variant="outline" className={`${mapped.className} ${className}`.trim()}>
      {mapped.label}
    </Badge>
  );
}
