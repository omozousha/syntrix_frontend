"use client";

import { GenericBulkImportPage } from "@/components/features/data-management/import/generic-bulk-import-page";
import { CUSTOMER_CONFIG } from "@/components/features/data-management/import/generic-bulk-import-config";

export default function CustomerImportPage() {
  return <GenericBulkImportPage config={CUSTOMER_CONFIG} />;
}
