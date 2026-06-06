"use client";

import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  AutoFilledBadge,
  Field,
  FieldLabel,
} from "@/components/features/data-management/device-form/form-field-grid";

type CreateKindFlags = {
  isPop: boolean;
  isRoute: boolean;
  isProject: boolean;
  isCustomer: boolean;
  isDevice: boolean;
};

export type CreateOperationalValues = {
  status_pop: string;
  route_status: string;
  project_status: string;
  customer_status: string;
  status: string;
  installation_date: string;
  validation_status: string;
  validation_date: string;
};

const POP_STATUS_OPTIONS = ["planning", "active", "inactive", "maintenance"];
const ROUTE_STATUS_OPTIONS = ["planning", "active", "maintenance", "closed"];
const PROJECT_STATUS_OPTIONS = ["planning", "running", "done", "hold", "cancelled"];
const CUSTOMER_STATUS_OPTIONS = ["prospect", "active", "suspend", "inactive", "terminated"];
const DEVICE_STATUS_OPTIONS = ["draft", "installed", "active", "inactive", "maintenance", "retired"];
const VALIDATION_STATUS_OPTIONS = ["unvalidated", "valid", "warning", "invalid"];

export function CreateOperationalFields({
  flags,
  values,
  hasCustomerAutoFill,
  onChange,
}: {
  flags: CreateKindFlags;
  values: CreateOperationalValues;
  hasCustomerAutoFill: boolean;
  onChange: (patch: Partial<CreateOperationalValues>) => void;
}) {
  return (
    <>
      <StatusField
        flags={flags}
        values={values}
        hasCustomerAutoFill={hasCustomerAutoFill}
        onChange={onChange}
      />

      {flags.isDevice || flags.isCustomer ? (
        <Field
          label="Installation Date"
          type="date"
          value={values.installation_date}
          onChange={(value) => onChange({ installation_date: value })}
          badge={hasCustomerAutoFill ? <AutoFilledBadge /> : null}
        />
      ) : null}

      {flags.isDevice ? (
        <div className="space-y-1.5">
          <FieldLabel
            label="Validation Status"
            tooltip="Device baru selalu dimulai sebagai unvalidated. Status validasi berubah otomatis setelah workflow validator disetujui."
          />
          <Input value="unvalidated" disabled />
        </div>
      ) : null}

      {flags.isPop ? (
        <>
          <div className="space-y-1.5">
            <FieldLabel label="Validation Status" tooltip="Status hasil validasi lapangan/meja. Jika bukan unvalidated, sebaiknya isi Validation Date." />
            <Combobox
              value={values.validation_status}
              onValueChange={(value) => onChange({ validation_status: value })}
              options={toOptions(VALIDATION_STATUS_OPTIONS)}
              placeholder="Pilih status validasi"
              searchPlaceholder="Cari status validasi..."
            />
          </div>

          <Field
            label="Validation Date"
            type="date"
            value={values.validation_date}
            onChange={(value) => onChange({ validation_date: value })}
          />
        </>
      ) : null}
    </>
  );
}

function StatusField({
  flags,
  values,
  hasCustomerAutoFill,
  onChange,
}: {
  flags: CreateKindFlags;
  values: CreateOperationalValues;
  hasCustomerAutoFill: boolean;
  onChange: (patch: Partial<CreateOperationalValues>) => void;
}) {
  const state = getStatusState(flags, values, onChange);

  return (
    <div className="space-y-1.5">
      <FieldLabel
        label="Status"
        badge={hasCustomerAutoFill ? <AutoFilledBadge /> : null}
        tooltip={state.tooltip}
      />
      <Combobox
        value={state.value}
        onValueChange={state.onValueChange}
        options={state.options}
        placeholder="Pilih status"
        searchPlaceholder="Cari status..."
      />
    </div>
  );
}

function getStatusState(
  flags: CreateKindFlags,
  values: CreateOperationalValues,
  onChange: (patch: Partial<CreateOperationalValues>) => void,
) {
  if (flags.isPop) {
    return {
      value: values.status_pop,
      tooltip: "Status operasional POP.",
      options: toOptions(POP_STATUS_OPTIONS),
      onValueChange: (value: string) => onChange({ status_pop: value }),
    };
  }

  if (flags.isRoute) {
    return {
      value: values.route_status,
      tooltip: "Status progress route.",
      options: toOptions(ROUTE_STATUS_OPTIONS),
      onValueChange: (value: string) => onChange({ route_status: value }),
    };
  }

  if (flags.isProject) {
    return {
      value: values.project_status,
      tooltip: "Status progress project.",
      options: toOptions(PROJECT_STATUS_OPTIONS),
      onValueChange: (value: string) => onChange({ project_status: value }),
    };
  }

  if (flags.isCustomer) {
    return {
      value: values.customer_status,
      tooltip: "Status layanan customer.",
      options: toOptions(CUSTOMER_STATUS_OPTIONS),
      onValueChange: (value: string) => onChange({ customer_status: value }),
    };
  }

  return {
    value: values.status,
    tooltip: "Status lifecycle perangkat.",
    options: toOptions(DEVICE_STATUS_OPTIONS),
    onValueChange: (value: string) => onChange({ status: value }),
  };
}

function toOptions(values: string[]): ComboboxOption[] {
  return values.map((value) => ({ value, label: value }));
}
