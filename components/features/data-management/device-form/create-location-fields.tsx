"use client";

import type { ReactNode } from "react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  CoordinateField,
  Field,
  FieldLabel,
} from "@/components/features/data-management/device-form/form-field-grid";

type ProvinceOption = {
  id: string;
  province_name: string;
};

type CityOption = {
  id: string;
  city_name: string;
  province_id?: string | null;
};

export type CreateLocationValues = {
  address: string;
  province: string;
  province_id: string;
  city: string;
  city_id: string;
  longitude: string;
  latitude: string;
};

export function CreateLocationFields({
  values,
  provinces,
  cities,
  sectionSpanClass,
  showCoordinates,
  badge,
  onChange,
}: {
  values: CreateLocationValues;
  provinces: ProvinceOption[];
  cities: CityOption[];
  sectionSpanClass: string;
  showCoordinates: boolean;
  badge?: ReactNode;
  onChange: (patch: Partial<CreateLocationValues>) => void;
}) {
  const provinceOptions: ComboboxOption[] = [
    { value: "__none__", label: "Pilih provinsi" },
    ...provinces.map((item) => ({
      value: item.id,
      label: item.province_name,
    })),
  ];

  const cityOptions: ComboboxOption[] = [
    { value: "__none__", label: "Pilih kota/kabupaten" },
    ...cities
      .filter((item) => !values.province_id || item.province_id === values.province_id)
      .map((item) => ({
        value: item.id,
        label: item.city_name,
      })),
  ];

  return (
    <>
      <Field
        label="Address"
        value={values.address}
        onChange={(value) => onChange({ address: value })}
        containerClassName={sectionSpanClass}
        badge={badge}
      />
      <div className="space-y-1.5">
        <FieldLabel label="Province (Master)" tooltip="Pilih provinsi dari master data." badge={badge} />
        <Combobox
          value={values.province_id || "__none__"}
          onValueChange={(value) => {
            if (value === "__none__") {
              onChange({ province_id: "", province: "", city_id: "", city: "" });
              return;
            }
            const selected = provinces.find((item) => item.id === value);
            onChange({
              province_id: value,
              province: selected?.province_name || values.province,
              city_id: "",
              city: "",
            });
          }}
          options={provinceOptions}
          placeholder="Pilih provinsi"
          searchPlaceholder="Cari provinsi..."
        />
      </div>
      <div className="space-y-1.5">
        <FieldLabel label="City/Kabupaten (Master)" tooltip="Pilih kota/kabupaten berdasarkan provinsi." badge={badge} />
        <Combobox
          key={`city-${values.province_id || "none"}`}
          value={values.city_id || "__none__"}
          onValueChange={(value) => {
            if (value === "__none__") {
              onChange({ city_id: "", city: "" });
              return;
            }
            const selected = cities.find((item) => item.id === value);
            onChange({
              city_id: value,
              city: selected?.city_name || values.city,
            });
          }}
          disabled={!values.province_id}
          options={cityOptions}
          placeholder="Pilih kota/kabupaten"
          searchPlaceholder="Cari kota/kabupaten..."
        />
      </div>
      {showCoordinates ? (
        <>
          <CoordinateField
            label="Longitude"
            value={values.longitude}
            onChange={(value) => onChange({ longitude: value })}
            kind="longitude"
            badge={badge}
          />
          <CoordinateField
            label="Latitude"
            value={values.latitude}
            onChange={(value) => onChange({ latitude: value })}
            kind="latitude"
            badge={badge}
          />
        </>
      ) : null}
    </>
  );
}
