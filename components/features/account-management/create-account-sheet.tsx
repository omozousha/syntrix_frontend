"use client";

import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AccountPasswordField } from "./account-password-field";
import { useTranslate } from "@/lib/use-locale";

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
  const { t } = useTranslate();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("createAccount.title")}</SheetTitle>
          <SheetDescription>{t("createAccount.description")}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="create_full_name" className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{t("accountForm.fullName")}</Label>
            <Input
              id="create_full_name"
              value={form.full_name}
              onChange={(event) => onFormChange({ ...form, full_name: event.target.value })}
              placeholder={t("createAccount.fullNamePlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create_email" className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Email</Label>
            <Input
              id="create_email"
              type="email"
              value={form.email}
              onChange={(event) => onFormChange({ ...form, email: event.target.value })}
              placeholder={t("createAccount.emailPlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Role</Label>
            <Combobox
              value={form.role_name}
              onValueChange={(value) => onFormChange({ ...form, role_name: value })}
              options={roleOptions}
              placeholder={t("createAccount.selectRole")}
              searchPlaceholder={t("createAccount.searchRole")}
              disabled={roleDisabled}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Default Region</Label>
            <Combobox
              value={form.default_region_id}
              onValueChange={(value) => onFormChange({ ...form, default_region_id: value })}
              options={regionOptions}
              placeholder={t("createAccount.selectRegion")}
              searchPlaceholder={t("createAccount.searchRegion")}
            />
            <p className="text-xs text-muted-foreground">
              {t("createAccount.regionHelp")}
            </p>
          </div>

          <AccountPasswordField
            id="create_password"
            label={t("accountForm.password")}
            value={form.password}
            visible={showPassword}
            onVisibleChange={onShowPasswordChange}
            onChange={(value) => onFormChange({ ...form, password: value })}
            placeholder={t("createAccount.passwordPlaceholder")}
          />

          <AccountPasswordField
            id="create_confirm_password"
            label={t("accountForm.confirmPassword")}
            value={form.confirm_password}
            visible={showConfirmPassword}
            onVisibleChange={onShowConfirmPasswordChange}
            onChange={(value) => onFormChange({ ...form, confirm_password: value })}
            placeholder={t("createAccount.confirmPlaceholder")}
          />
        </div>

        <SheetFooter className="gap-2 sm:space-x-0">
          <Button
            variant="outline"
            className="rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            onClick={() => onOpenChange(false)}
          >
            {t("accountForm.cancel")}
          </Button>
          <Button
            className="rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            onClick={onSubmit}
            disabled={saving}
          >
            {saving ? t("createAccount.creating") : t("createAccount.submit")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
