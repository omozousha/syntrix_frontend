import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      <div className="space-y-1.5">
        <Label htmlFor="search_user">Search</Label>
        <Input
          id="search_user"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="Cari nama, email, atau user code..."
        />
      </div>

      <div className="space-y-1.5">
        <Label>Region</Label>
        <Combobox
          value={filterRegion}
          onValueChange={onFilterRegionChange}
          placeholder="Semua region"
          searchPlaceholder="Cari region..."
          options={regionOptions}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Role</Label>
        <Combobox
          value={filterRole}
          onValueChange={onFilterRoleChange}
          placeholder="Semua role"
          searchPlaceholder="Cari role..."
          options={roleOptions}
          disabled={roleDisabled}
        />
      </div>

      <div className="flex items-end">
        <Button type="button" variant="outline" className="w-full" onClick={onReset}>
          Reset Filter
        </Button>
      </div>
    </div>
  );
}
