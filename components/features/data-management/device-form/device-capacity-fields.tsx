"use client";

import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  AutoFilledBadge,
  Field,
  FieldLabel,
} from "@/components/features/data-management/device-form/form-field-grid";

type SplitterProfileOption = {
  ratio_label: string;
  output_port_count?: number | null;
};

export type DeviceCapacityValues = {
  device_type_key: string;
  capacity_core: string;
  used_core: string;
  total_ports: string;
  used_ports: string;
  splitter_ratio: string;
};

function toOptions(options: ComboboxOption[]): ComboboxOption[] {
  return options;
}

export function DeviceCapacityFields({
  values,
  showCoreFields,
  showPortFields,
  showSplitterField,
  needsPortPresetSelector,
  splitterPortPresetOptions,
  splitterProfiles,
  onChange,
}: {
  values: DeviceCapacityValues;
  showCoreFields: boolean;
  showPortFields: boolean;
  showSplitterField: boolean;
  needsPortPresetSelector: boolean;
  splitterPortPresetOptions: number[];
  splitterProfiles: SplitterProfileOption[];
  onChange: (patch: Partial<DeviceCapacityValues>) => void;
}) {
  const isOdp = values.device_type_key === "ODP";

  return (
    <>
      {showCoreFields ? (
        <>
          <Field
            label="Capacity Core"
            type="number"
            value={values.capacity_core}
            onChange={(value) => onChange({ capacity_core: value })}
          />
          <Field
            label="Used Core"
            type="number"
            value={values.used_core}
            onChange={(value) => onChange({ used_core: value })}
          />
        </>
      ) : null}

      {showPortFields ? (
        <>
          {needsPortPresetSelector ? (
            <div className="space-y-1.5">
              <FieldLabel
                label={isOdp ? "Kapasitas ODP" : "Total Ports"}
                tooltip="Untuk splitter ratio 1:16 ke atas, pilih jumlah port aktual terpasang di lapangan."
              />
              <Combobox
                value={values.total_ports || "__none__"}
                onValueChange={(value) => onChange({ total_ports: value === "__none__" ? "" : value })}
                options={toOptions([
                  { value: "__none__", label: "Pilih total port" },
                  ...splitterPortPresetOptions.map((port) => ({ value: String(port), label: `${port} port` })),
                ])}
                placeholder="Pilih total port"
                searchPlaceholder="Cari total port..."
              />
            </div>
          ) : (
            <Field
              label={isOdp ? "Kapasitas ODP" : "Total Ports"}
              type="number"
              value={values.total_ports}
              onChange={(value) => onChange({ total_ports: value })}
            />
          )}
          <Field
            label={isOdp ? "Port Aktif" : "Used Ports"}
            type="number"
            value={values.used_ports}
            onChange={(value) => onChange({ used_ports: value })}
          />
        </>
      ) : null}

      {showSplitterField ? (
        <div className="space-y-1.5">
          <FieldLabel
            label={isOdp ? "Kapasitas Splitter" : "Splitter Ratio"}
            tooltip="Pilih rasio splitter dari master data."
            badge={<AutoFilledBadge label="Auto-fill" />}
          />
          <p className="text-xs text-muted-foreground">
            Pilihan splitter akan mengisi rekomendasi kapasitas port. Nilai kapasitas tetap bisa dikoreksi sesuai kondisi lapangan.
          </p>
          <Combobox
            value={values.splitter_ratio || "__none__"}
            onValueChange={(value) => {
              const ratioValue = value === "__none__" ? "" : value;
              const profile = splitterProfiles.find((item) => item.ratio_label === ratioValue) || null;
              const output = Number(profile?.output_port_count || 0);
              const autoTotal = Number.isFinite(output) && output > 0 ? (output >= 16 ? 8 : output) : 0;
              onChange({
                splitter_ratio: ratioValue,
                total_ports: autoTotal ? String(autoTotal) : values.total_ports,
              });
            }}
            options={toOptions([
              { value: "__none__", label: "Pilih splitter ratio" },
              ...splitterProfiles.map((item) => ({
                value: item.ratio_label,
                label: item.output_port_count ? `${item.ratio_label} (${item.output_port_count} port)` : item.ratio_label,
              })),
            ])}
            placeholder="Pilih splitter ratio"
            searchPlaceholder="Cari splitter ratio..."
          />
        </div>
      ) : null}
    </>
  );
}
