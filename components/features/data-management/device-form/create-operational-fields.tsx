"use client";

import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  AutoFilledBadge,
  Field,
  FieldLabel,
} from "@/components/features/data-management/device-form/form-field-grid";
import { useTranslate, type TFn } from "@/lib/use-locale";

type CreateKindFlags = {
  isPop: boolean;
  isProject: boolean;
  isCustomer: boolean;
  isDevice: boolean;
};

export type CreateOperationalValues = {
  status_pop: string;
  project_status: string;
  customer_status: string;
  status: string;
  installation_date: string;
  validation_status: string;
  validation_date: string;
};

const POP_STATUS_OPTIONS = ["planning", "active", "inactive", "maintenance"];

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
  const { t } = useTranslate();
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
            tooltip={t("createForm.validationNewTip")}
          />
          <Input value="unvalidated" disabled />
        </div>
      ) : null}

      {flags.isPop ? (
        <>
          <div className="space-y-1.5">
            <FieldLabel label="Validation Status" tooltip={t("createForm.validationPopTip")} />
            <Combobox
              value={values.validation_status}
              onValueChange={(value) => onChange({ validation_status: value })}
              options={toOptions(VALIDATION_STATUS_OPTIONS)}
              placeholder={t("createForm.selectValidationStatus")}
              searchPlaceholder={t("createForm.searchValidationStatus")}
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
  const { t } = useTranslate();
  const state = getStatusState(flags, values, onChange, t);

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
        placeholder={t("createForm.selectStatus")}
        searchPlaceholder={t("createForm.searchStatus")}
      />
    </div>
  );
}

function getStatusState(
  flags: CreateKindFlags,
  values: CreateOperationalValues,
  onChange: (patch: Partial<CreateOperationalValues>) => void,
  t: TFn,
) {
  if (flags.isPop) {
    return {
      value: values.status_pop,
      tooltip: t("createForm.statusPopTip"),
      options: toOptions(POP_STATUS_OPTIONS),
      onValueChange: (value: string) => onChange({ status_pop: value }),
    };
  }

  if (flags.isProject) {
    return {
      value: values.project_status,
      tooltip: t("createForm.statusProjectTip"),
      options: toOptions(PROJECT_STATUS_OPTIONS),
      onValueChange: (value: string) => onChange({ project_status: value }),
    };
  }

  if (flags.isCustomer) {
    return {
      value: values.customer_status,
      tooltip: t("createForm.statusCustomerTip"),
      options: toOptions(CUSTOMER_STATUS_OPTIONS),
      onValueChange: (value: string) => onChange({ customer_status: value }),
    };
  }

  return {
    value: values.status,
    tooltip: t("createForm.statusDeviceTip"),
    options: toOptions(DEVICE_STATUS_OPTIONS),
    onValueChange: (value: string) => onChange({ status: value }),
  };
}

function toOptions(values: string[]): ComboboxOption[] {
  return values.map((value) => ({ value, label: value }));
}
