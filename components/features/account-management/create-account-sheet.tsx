import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AccountPasswordField } from "./account-password-field";

export type CreateAccountFormState = {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
  role_name: string;
  default_region_id: string;
};

export function CreateAccountSheet({
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
  form: CreateAccountFormState;
  roleOptions: ComboboxOption[];
  regionOptions: ComboboxOption[];
  roleDisabled: boolean;
  showPassword: boolean;
  showConfirmPassword: boolean;
  onOpenChange: (open: boolean) => void;
  onFormChange: (form: CreateAccountFormState) => void;
  onShowPasswordChange: (visible: boolean) => void;
  onShowConfirmPasswordChange: (visible: boolean) => void;
  onSubmit: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Create Account</SheetTitle>
          <SheetDescription>Akun baru wajib verifikasi email sebelum bisa aktif digunakan.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="create_full_name">Full Name</Label>
            <Input
              id="create_full_name"
              value={form.full_name}
              onChange={(event) => onFormChange({ ...form, full_name: event.target.value })}
              placeholder="Nama lengkap"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create_email">Email</Label>
            <Input
              id="create_email"
              type="email"
              value={form.email}
              onChange={(event) => onFormChange({ ...form, email: event.target.value })}
              placeholder="user@syntrix.local"
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

          <AccountPasswordField
            id="create_password"
            label="Password"
            value={form.password}
            visible={showPassword}
            onVisibleChange={onShowPasswordChange}
            onChange={(value) => onFormChange({ ...form, password: value })}
            placeholder="Minimal 8 karakter"
          />

          <AccountPasswordField
            id="create_confirm_password"
            label="Confirm Password"
            value={form.confirm_password}
            visible={showConfirmPassword}
            onVisibleChange={onShowConfirmPasswordChange}
            onChange={(value) => onFormChange({ ...form, confirm_password: value })}
            placeholder="Ulangi password"
          />
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving ? "Membuat..." : "Create Account"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
