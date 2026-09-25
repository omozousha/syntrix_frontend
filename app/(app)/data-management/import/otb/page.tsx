"use client";

import { GenericBulkImportPage } from "@/components/features/data-management/import/generic-bulk-import-page";
import { OTB_CONFIG } from "@/components/features/data-management/import/generic-bulk-import-config";

export default function OtbImportPage() {
  return <GenericBulkImportPage config={OTB_CONFIG} />;
}
