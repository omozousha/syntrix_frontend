import { GenericBulkImportPage } from "@/components/features/data-management/import/generic-bulk-import-page";
import { ODC_CONFIG } from "@/components/features/data-management/import/generic-bulk-import-config";

export const metadata = {
  title: "Impor Massal ODC",
  description: "Impor massal data ODC via CSV atau Excel",
};

export default function OdcImportPage() {
  return <GenericBulkImportPage config={ODC_CONFIG} />;
}
