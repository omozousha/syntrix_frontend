"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type UsageCheckData = {
  total: number;
  by_type: Record<string, { count: number; sample: Array<{ id: string; label: string }> }>;
};

type MasterDataDeleteDialogProps = {
  deleteTarget: unknown;
  usageCheck: UsageCheckData | null;
  usageLoading: boolean;
  actionLoading: boolean;
  isSoftDeleteResource: boolean;
  categoryLabel: string;
  onClose: () => void;
  onSubmitDelete: () => void;
  onForceDelete: () => void;
};

export function MasterDataUsageCheckDialog({
  usageCheck,
  onForceDelete,
  onClose,
}: {
  usageCheck: UsageCheckData | null;
  onForceDelete: () => void;
  onClose: () => void;
}) {
  return (
    <AlertDialog open={usageCheck !== null && usageCheck.total > 0} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Data Masih Digunakan</AlertDialogTitle>
          <AlertDialogDescription>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
              <p className="font-medium text-amber-800">
                {usageCheck?.total} data masih menggunakan referensi ini
              </p>
              {usageCheck?.by_type ? Object.entries(usageCheck.by_type).map(([table, info]) => (
                <div key={table} className="mt-2">
                  <p className="text-amber-700 font-medium">
                    {table.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}: {info.count}
                  </p>
                  {info.sample.length > 0 && (
                    <ul className="list-disc ml-4 text-amber-600">
                      {info.sample.map((item: { id: string; label: string }) => (
                        <li key={item.id}>{item.label}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )) : null}
              <p className="mt-2 text-amber-700">Hapus tetap bisa dilakukan, namun data yang merujuk mungkin rusak atau kehilangan referensi.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={() => void onForceDelete()}>
            Tetap Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function MasterDataDeleteConfirmDialog({
  deleteTarget,
  isSoftDeleteResource,
  categoryLabel,
  actionLoading,
  usageLoading,
  onSubmitDelete,
  onClose,
}: MasterDataDeleteDialogProps) {
  return (
    <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isSoftDeleteResource ? "Arsipkan" : "Hapus"} {categoryLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            {isSoftDeleteResource
              ? "Data akan dipindahkan ke arsip (soft delete) dan tidak tampil di list utama."
              : "Aksi ini tidak bisa dibatalkan. Data yang dipilih akan dihapus permanen."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={actionLoading || usageLoading}>Batal</AlertDialogCancel>
          <AlertDialogAction disabled={actionLoading || usageLoading} onClick={() => void onSubmitDelete()}>
            {actionLoading ? (isSoftDeleteResource ? "Mengarsipkan..." : "Menghapus...") : usageLoading ? "Memeriksa referensi..." : (isSoftDeleteResource ? "Arsipkan" : "Hapus")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
