import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AccountPasswordField } from "./account-password-field";

export type EditAccountFormState = {
  full_name: string;
  role_name: string;
  default_region_id: string;
  is_active: "true" | "false";
  new_password: string;
  confirm_password: string;
};

export function EditAccountSheet({
  open,
  saving,
  form,
  roleOptions,
  regionOptions,
  roleDisabled,
  showPassword,
  showConfirmPassword,
  onOpenChange,
  onFormChange,
  onShowPasswordChange,
  onShowConfirmPasswordChange,
  onSubmit,
}: {
  open: boolean;
  saving: boolean;
  form: EditAccountFormState;
  roleOptions: ComboboxOption[];
  regionOptions: ComboboxOption[];
  roleDisabled: boolean;
  showPassword: boolean;
  showConfirmPassword: boolean;
  onOpenChange: (open: boolean) => void;
  onFormChange: (form: EditAccountFormState) => void;
  onShowPasswordChange: (visible: boolean) => void;
  onShowConfirmPasswordChange: (visible: boolean) => void;
  onSubmit: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit Account</SheetTitle>
          <SheetDescription>Ubah profil, role, region, dan status aktif akun.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="user_full_name">Full Name</Label>
            <Input
              id="user_full_name"
              value={form.full_name}
              onChange={(event) => onFormChange({ ...form, full_name: event.target.value })}
              placeholder="Nama lengkap"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <Combobox
              value={form.role_name}
              onValueChange={(value) => onFormChange({ ...form, role_name: value })}
              options={roleOptions}
              placeholder="Pilih role"
              searchPlaceholder="Cari role..."
              disabled={roleDisabled}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Default Region</Label>
            <Combobox
              value={form.default_region_id}
              onValueChange={(value) => onFormChange({ ...form, default_region_id: value })}
              options={regionOptions}
              placeholder="Pilih region"
              searchPlaceholder="Cari region..."
            />
            <p className="text-xs text-muted-foreground">
              Daftar region diambil dari Master Data Regions. Adminregion hanya melihat region yang menjadi scope-nya.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Status Aktif</Label>
            <Combobox
              value={form.is_active}
              onValueChange={(value) => onFormChange({ ...form, is_active: value as EditAccountFormState["is_active"] })}
              options={[
                { value: "true", label: "Aktif" },
                { value: "false", label: "Nonaktif" },
              ]}
              placeholder="Pilih status"
              searchPlaceholder="Cari status..."
            />
          </div>

          <AccountPasswordField
            id="new_password"
            label="Password Baru"
            value={form.new_password}
            visible={showPassword}
            onVisibleChange={onShowPasswordChange}
            onChange={(value) => onFormChange({ ...form, new_password: value })}
            placeholder="Kosongkan jika tidak diganti"
          />

          <AccountPasswordField
            id="confirm_password"
            label="Konfirmasi Password"
            value={form.confirm_password}
            visible={showConfirmPassword}
            onVisibleChange={onShowConfirmPasswordChange}
            onChange={(value) => onFormChange({ ...form, confirm_password: value })}
            placeholder="Ulangi password baru"
          />

          <p className="text-xs text-muted-foreground">
            Password user lain tidak bisa ditampilkan. Ganti password hanya tersedia untuk akun yang sedang login.
          </p>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
