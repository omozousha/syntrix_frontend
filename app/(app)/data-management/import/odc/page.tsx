"use client";

import { GenericBulkImportPage } from "@/components/features/data-management/import/generic-bulk-import-page";
import { ODC_CONFIG } from "@/components/features/data-management/import/generic-bulk-import-config";

export default function OdcImportPage() {
  return <GenericBulkImportPage config={ODC_CONFIG} />;
}
