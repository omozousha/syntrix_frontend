import { GenericBulkImportPage } from "@/components/features/data-management/import/generic-bulk-import-page";
import { CUSTOMER_CONFIG } from "@/components/features/data-management/import/generic-bulk-import-config";

export const metadata = {
  title: "Impor Massal Customer",
  description: "Impor massal data Customer via CSV atau Excel",
};

export default function CustomerImportPage() {
  return <GenericBulkImportPage config={CUSTOMER_CONFIG} />;
}
