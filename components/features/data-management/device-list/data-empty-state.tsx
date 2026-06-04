"use client";

import { OperationalState } from "@/components/operational-ui";

export function DataEmptyState({
  title,
  description,
  variant,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  variant?: "error" | "loading" | "empty";
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <OperationalState
      title={title}
      description={description}
      variant={variant}
      actionLabel={actionLabel}
      onAction={onAction}
    />
  );
}
