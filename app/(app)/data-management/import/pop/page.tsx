"use client";

import { GenericBulkImportPage } from "@/components/features/data-management/import/generic-bulk-import-page";
import { POP_CONFIG } from "@/components/features/data-management/import/generic-bulk-import-config";

export default function PopImportPage() {
  return <GenericBulkImportPage config={POP_CONFIG} />;
}
