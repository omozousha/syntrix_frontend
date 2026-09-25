import { GenericBulkImportPage } from "@/components/features/data-management/import/generic-bulk-import-page";
import { OLT_CONFIG } from "@/components/features/data-management/import/generic-bulk-import-config";

export const metadata = {
  title: "Impor Massal OLT",
  description: "Impor massal data OLT via CSV atau Excel",
};

export default function OltImportPage() {
  return <GenericBulkImportPage config={OLT_CONFIG} />;
}
