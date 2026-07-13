"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Boxes,
  Building2,
  Cable,
  CircleDot,
  FolderPlus,
  HardDrive,
  LibraryBig,
  MapPinned,
  Monitor,
  Network,
  Plus,
  RadioTower,
  Router as RouterIcon,
  Server,
  Sparkles,
  Split,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useSession } from "@/components/session-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiFetch, type PaginatedResponse } from "@/lib/api";

type DeviceTypeRow = {
  id: string;
  device_type_key: string;
  device_type_name?: string | null;
  icon_name?: string | null;
  is_active?: boolean;
  sort_order?: number;
};
const DEVICE_ICON_MAP: Record<string, LucideIcon> = {
  Box,
  Boxes,
  Cable,
  CircleDot,
  HardDrive,
  Monitor,
  Network,
  RadioTower,
  Router: RouterIcon,
  Server,
  Split,
  OLT: Server,
  SWITCH: Network,
  ROUTER: RouterIcon,
  ONT: Monitor,
  OTB: Box,
  JC: Split,
  ODC: Boxes,
  ODP: RadioTower,
  CABLE: Cable,
};
const FALLBACK_DEVICE_TYPES = [
  { key: "OLT", label: "OLT", iconName: "Server" },
  { key: "SWITCH", label: "Switch", iconName: "Network" },
  { key: "ROUTER", label: "Router", iconName: "Router" },
  { key: "ONT", label: "ONT", iconName: "Monitor" },
  { key: "OTB", label: "OTB", iconName: "Box" },
  { key: "JC", label: "JC", iconName: "Split" },
  { key: "ODC", label: "ODC", iconName: "Boxes" },
  { key: "ODP", label: "ODP", iconName: "RadioTower" },
  { key: "CABLE", label: "Cable", iconName: "Cable" },
];

function getDeviceIcon(iconName?: string | null, deviceTypeKey?: string | null) {
  return DEVICE_ICON_MAP[iconName || ""] || DEVICE_ICON_MAP[deviceTypeKey || ""] || HardDrive;
}

type AddDataMenuProps = {
  canCreatePop?: boolean;
  canCreateDevice?: boolean;
  canManageMaster?: boolean;
};

export function AddDataMenu({
  canCreatePop = true,
  canCreateDevice = true,
  canManageMaster = false,
}: AddDataMenuProps) {
  const { token } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deviceTypes, setDeviceTypes] = useState<DeviceTypeRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadDeviceTypes() {
      try {
        const result = await apiFetch<PaginatedResponse<DeviceTypeRow>>("/deviceTypes?page=1&limit=200&is_active=true", { token });
        if (cancelled) return;
        const rows = (result.data || [])
          .filter((item) => item.device_type_key)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        setDeviceTypes(rows);
      } catch {
        if (!cancelled) setDeviceTypes([]);
      }
    }

    void loadDeviceTypes();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const hasAnyAction = useMemo(
    () => canCreatePop || canCreateDevice || canManageMaster,
    [canCreateDevice, canCreatePop, canManageMaster],
  );

  if (!hasAnyAction) return null;

  function go(path: string) {
    setOpen(false);
    router.push(path);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button type="button" className="gap-2">
          <Plus className="size-4" />
          Add
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-2">
        <div className="mb-1 flex items-center justify-between px-1">
          <DropdownMenuLabel className="px-0">Add to data</DropdownMenuLabel>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>

        {canCreatePop ? (
          <DropdownMenuItem className="items-start gap-3 py-2" onSelect={() => go("/data-management/create?kind=pop")}>
            <FolderPlus className="mt-0.5 size-4 text-muted-foreground" />
            <div className="space-y-0.5">
              <p className="text-sm font-medium">POP</p>
              <p className="text-xs text-muted-foreground">Create Point of Presence data.</p>
            </div>
          </DropdownMenuItem>
        ) : null}

        {canCreateDevice ? (
          <DropdownMenuItem className="items-start gap-3 py-2" onSelect={() => go("/data-management/create?kind=project")}>
            <Sparkles className="mt-0.5 size-4 text-muted-foreground" />
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Project</p>
              <p className="text-xs text-muted-foreground">Create delivery project for topology rollout.</p>
            </div>
          </DropdownMenuItem>
        ) : null}

        {canCreatePop ? (
          <DropdownMenuItem className="items-start gap-3 py-2" onSelect={() => go("/data-management/create?kind=customer")}>
            <UserRound className="mt-0.5 size-4 text-muted-foreground" />
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Customer</p>
              <p className="text-xs text-muted-foreground">Create customer and service location data.</p>
            </div>
          </DropdownMenuItem>
        ) : null}

        {canCreateDevice ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="items-start gap-3 py-2">
              <RouterIcon className="mt-0.5 size-4 text-muted-foreground" />
              <div className="space-y-0.5 text-left">
                <p className="text-sm font-medium">Device</p>
                <p className="text-xs text-muted-foreground">Choose device type to create.</p>
              </div>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              {(deviceTypes.length
                ? deviceTypes.map((item) => ({
                    key: item.device_type_key,
                    label: item.device_type_name || item.device_type_key,
                    iconName: item.icon_name,
                  }))
                : FALLBACK_DEVICE_TYPES)
                .map((type) => {
                  const DeviceIcon = getDeviceIcon(type.iconName, type.key);
                  return (
                  <DropdownMenuItem
                    key={type.key}
                    className="gap-2"
                    onSelect={() => {
                      if (type.key === "ODP") {
                        go("/data-management/list/odp?triggerCreate=true");
                      } else {
                        go(`/data-management/create?kind=device&type=${encodeURIComponent(type.key)}`);
                      }
                    }}
                  >
                  <DeviceIcon className="size-4 text-muted-foreground" />
                  {type.label}
                </DropdownMenuItem>
                  );
                })}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : null}

        {canManageMaster ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="items-start gap-3 py-2" onSelect={() => go("/master-data")}>
              <LibraryBig className="mt-0.5 size-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Master Data</p>
                <p className="text-xs text-muted-foreground">Kelola data referensi reusable.</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem className="items-start gap-3 py-2" onSelect={() => go("/data-management/list/master-device-types")}>
              <Boxes className="mt-0.5 size-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Device Types</p>
                <p className="text-xs text-muted-foreground">Atur referensi tipe perangkat.</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem className="items-start gap-3 py-2" onSelect={() => go("/data-management/list/master-manufacturers")}>
              <Building2 className="mt-0.5 size-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Manufacturers & Brands</p>
                <p className="text-xs text-muted-foreground">Standardize vendor references.</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem className="items-start gap-3 py-2" onSelect={() => go("/data-management/list/master-tenants")}>
              <Building2 className="mt-0.5 size-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Tenants</p>
                <p className="text-xs text-muted-foreground">Kelola referensi tenant perangkat.</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem className="items-start gap-3 py-2" onSelect={() => go("/data-management/list/master-provinces")}>
              <MapPinned className="mt-0.5 size-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Provinces & Cities</p>
                <p className="text-xs text-muted-foreground">Location references for POP data.</p>
              </div>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
