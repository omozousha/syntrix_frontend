import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslate } from "@/lib/use-locale";

export function AccountFilterBar({
  searchTerm,
  filterRegion,
  filterRole,
  regionOptions,
  roleOptions,
  roleDisabled,
  onSearchTermChange,
  onFilterRegionChange,
  onFilterRoleChange,
  onReset,
}: {
  searchTerm: string;
  filterRegion: string;
  filterRole: string;
  regionOptions: ComboboxOption[];
  roleOptions: ComboboxOption[];
  roleDisabled: boolean;
  onSearchTermChange: (value: string) => void;
  onFilterRegionChange: (value: string) => void;
  onFilterRoleChange: (value: string) => void;
  onReset: () => void;
}) {
  const { t } = useTranslate();
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      <div className="space-y-1.5">
        <Label htmlFor="search_user" className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{t("accountFilter.search")}</Label>
        <Input
          id="search_user"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder={t("accountFilter.searchPlaceholder")}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Region</Label>
        <Combobox
          value={filterRegion}
          onValueChange={onFilterRegionChange}
          placeholder={t("accountFilter.allRegions")}
          searchPlaceholder={t("accountFilter.searchRegion")}
          options={regionOptions}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Role</Label>
        <Combobox
          value={filterRole}
          onValueChange={onFilterRoleChange}
          placeholder={t("accountFilter.allRoles")}
          searchPlaceholder={t("accountFilter.searchRole")}
          options={roleOptions}
          disabled={roleDisabled}
        />
      </div>

      <div className="flex items-end">
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
          onClick={onReset}
        >
          {t("accountFilter.reset")}
        </Button>
      </div>
    </div>
  );
}
