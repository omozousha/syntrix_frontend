import { GenericBulkImportPage } from "@/components/features/data-management/import/generic-bulk-import-page";
import { OTB_CONFIG } from "@/components/features/data-management/import/generic-bulk-import-config";

export const metadata = {
  title: "Impor Massal OTB",
  description: "Impor massal data OTB via CSV atau Excel",
};

export default function OtbImportPage() {
  return <GenericBulkImportPage config={OTB_CONFIG} />;
}
