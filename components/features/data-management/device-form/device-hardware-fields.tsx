"use client";

import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Field, FieldLabel } from "@/components/features/data-management/device-form/form-field-grid";

type ManufacturerOption = {
  id: string;
  manufacturer_name: string;
  manufacturer_code?: string | null;
};

type BrandOption = {
  id: string;
  brand_name: string;
  brand_code?: string | null;
  manufacturer_id?: string | null;
};

type AssetModelOption = {
  id: string;
  model_name: string;
  model_code?: string | null;
  brand_id?: string | null;
  manufacturer_id?: string | null;
};

export type DeviceHardwareValues = {
  manufacturer_id: string;
  brand_id: string;
  model_id: string;
  serial_number: string;
};

export function DeviceHardwareFields({
  values,
  manufacturers,
  brands,
  assetModels,
  onChange,
}: {
  values: DeviceHardwareValues;
  manufacturers: ManufacturerOption[];
  brands: BrandOption[];
  assetModels: AssetModelOption[];
  onChange: (patch: Partial<DeviceHardwareValues>) => void;
}) {
  const manufacturerOptions: ComboboxOption[] = [
    { value: "__none__", label: "Pilih manufacturer" },
    ...manufacturers.map((item) => ({
      value: item.id,
      label: item.manufacturer_name || item.manufacturer_code || item.id,
    })),
  ];

  const brandOptions: ComboboxOption[] = [
    { value: "__none__", label: "Pilih brand" },
    ...brands
      .filter((item) => !values.manufacturer_id || !item.manufacturer_id || item.manufacturer_id === values.manufacturer_id)
      .map((item) => ({
        value: item.id,
        label: item.brand_name || item.brand_code || item.id,
      })),
  ];

  const modelOptions: ComboboxOption[] = [
    { value: "__none__", label: "Pilih model" },
    ...assetModels
      .filter((item) => !values.brand_id || !item.brand_id || item.brand_id === values.brand_id)
      .filter((item) => !values.manufacturer_id || !item.manufacturer_id || item.manufacturer_id === values.manufacturer_id)
      .map((item) => ({
        value: item.id,
        label: item.model_name || item.model_code || item.id,
      })),
  ];

  return (
    <>
      <div className="space-y-1.5">
        <FieldLabel label="Manufacturer" tooltip="Pilih manufacturer dari master data." />
        <Combobox
          value={values.manufacturer_id || "__none__"}
          onValueChange={(value) => {
            if (value === "__none__") {
              onChange({ manufacturer_id: "", brand_id: "", model_id: "" });
              return;
            }
            onChange({ manufacturer_id: value, brand_id: "", model_id: "" });
          }}
          options={manufacturerOptions}
          placeholder="Pilih manufacturer"
          searchPlaceholder="Cari manufacturer..."
        />
      </div>
      <div className="space-y-1.5">
        <FieldLabel label="Brand" tooltip="Pilih brand dari master data (opsional filter by manufacturer)." />
        <Combobox
          value={values.brand_id || "__none__"}
          onValueChange={(value) => {
            if (value === "__none__") {
              onChange({ brand_id: "", model_id: "" });
              return;
            }
            onChange({ brand_id: value, model_id: "" });
          }}
          options={brandOptions}
          placeholder="Pilih brand"
          searchPlaceholder="Cari brand..."
        />
      </div>
      <div className="space-y-1.5">
        <FieldLabel label="Model" tooltip="Pilih model dari master data (opsional filter by brand/manufacturer)." />
        <Combobox
          value={values.model_id || "__none__"}
          onValueChange={(value) => onChange({ model_id: value === "__none__" ? "" : value })}
          options={modelOptions}
          placeholder="Pilih model"
          searchPlaceholder="Cari model..."
        />
      </div>
      <Field
        label="Serial Number"
        value={values.serial_number}
        onChange={(value) => onChange({ serial_number: value })}
        placeholder="Nomor serial perangkat"
      />
    </>
  );
}
