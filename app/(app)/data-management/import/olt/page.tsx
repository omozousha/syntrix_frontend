"use client";

import { GenericBulkImportPage } from "@/components/features/data-management/import/generic-bulk-import-page";
import { OLT_CONFIG } from "@/components/features/data-management/import/generic-bulk-import-config";

export default function OltImportPage() {
  return <GenericBulkImportPage config={OLT_CONFIG} />;
}
