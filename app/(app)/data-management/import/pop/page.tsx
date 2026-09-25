import { GenericBulkImportPage } from "@/components/features/data-management/import/generic-bulk-import-page";
import { POP_CONFIG } from "@/components/features/data-management/import/generic-bulk-import-config";

export const metadata = {
  title: "Impor Massal POP",
  description: "Impor massal data POP via CSV atau Excel",
};

export default function PopImportPage() {
  return <GenericBulkImportPage config={POP_CONFIG} />;
}
