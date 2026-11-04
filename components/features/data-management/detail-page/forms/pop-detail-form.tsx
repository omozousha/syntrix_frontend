import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { DisplayField, Field, CoordinateField, SelectField } from "../fields";
import type { EditableForm, RelationLabels } from "../types";
import { POP_STATUS_OPTIONS, VALIDATION_STATUS_OPTIONS } from "../helpers";
import { useTranslate } from "@/lib/use-locale";

export function PopDetailForm({
  form,
  onChange,
  editing,
  relationLabels,
  relationLoading = false,
  popTypes = [],
}: {
  form: EditableForm;
  onChange: (next: EditableForm | ((prev: EditableForm) => EditableForm)) => void;
  editing: boolean;
  relationLabels: RelationLabels;
  relationLoading?: boolean;
  popTypes?: Array<{ id: string; pop_type_name: string; pop_type_code?: string | null }>;
}) {
  const { t } = useTranslate();
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-sm">{t("detailPage.pop.identityTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
          <Field label={t("detailPage.pop.name")} value={form.pop_name} onChange={(v) => onChange((p) => ({ ...p, pop_name: v }))} disabled={!editing} compact />
          <Field label={t("detailPage.pop.code")} value={form.pop_code} onChange={(v) => onChange((p) => ({ ...p, pop_code: v.toUpperCase() }))} disabled={!editing} compact />
          <DisplayField label={t("detailPage.pop.region")} value={relationLabels.region || "-"} loading={relationLoading} compact />
          {editing && popTypes.length > 0 ? (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t("detailPage.pop.typeLabel")}</label>
              <Combobox
                value={form.pop_type_id || "__none__"}
                onValueChange={(val: string) => {
                  const nextVal = val === "__none__" ? "" : val;
                  const matched = popTypes.find((p) => p.id === nextVal);
                  onChange((p) => ({
                    ...p,
                    pop_type_id: nextVal,
                    pop_type: matched?.pop_type_name || p.pop_type,
                  }));
                }}
                searchPlaceholder={t("detailPage.pop.typeSearch")}
                options={[
                  { value: "__none__", label: t("detailPage.pop.typePlaceholder") },
                  ...popTypes.map((pt) => ({
                    value: pt.id,
                    label: pt.pop_type_code ? `${pt.pop_type_name} (${pt.pop_type_code})` : pt.pop_type_name,
                  })),
                ]}
              />
            </div>
          ) : (
            <DisplayField label={t("detailPage.pop.typeLabel")} value={relationLabels.popType || form.pop_type || "-"} loading={relationLoading} compact />
          )}
          <Field label={t("detailPage.pop.activeDate")} type="date" value={form.tanggal_pop_aktif} onChange={(v) => onChange((p) => ({ ...p, tanggal_pop_aktif: v }))} disabled={!editing} compact />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-sm">{t("detailPage.pop.statusTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
          <SelectField
            label={t("detailPage.pop.statusPop")}
            value={form.status_pop}
            options={POP_STATUS_OPTIONS}
            onValueChange={(v) => onChange((p) => ({ ...p, status_pop: v }))}
            disabled={!editing}
            compact
          />
          <SelectField
            label={t("detailPage.pop.validationStatus")}
            value={form.validation_status}
            options={VALIDATION_STATUS_OPTIONS}
            onValueChange={(v) => onChange((p) => ({ ...p, validation_status: v }))}
            disabled={!editing}
            compact
          />
          <Field label={t("detailPage.pop.validationDate")} type="date" value={form.validation_date} onChange={(v) => onChange((p) => ({ ...p, validation_date: v }))} disabled={!editing} compact />
          <Field label={t("detailPage.pop.tenant")} value={form.tenant} onChange={(v) => onChange((p) => ({ ...p, tenant: v }))} disabled={!editing} compact />
          <Field label={t("detailPage.pop.plnCid")} value={form.pln_cid_number} onChange={(v) => onChange((p) => ({ ...p, pln_cid_number: v }))} disabled={!editing} compact />
          <Field label={t("detailPage.pop.plnPayment")} value={form.pln_payment_method} onChange={(v) => onChange((p) => ({ ...p, pln_payment_method: v }))} disabled={!editing} compact />
          <Field label={t("detailPage.pop.plnPhase")} value={form.pln_phase} onChange={(v) => onChange((p) => ({ ...p, pln_phase: v }))} disabled={!editing} compact />
          <Field label={t("detailPage.pop.plnWattage")} type="number" value={form.pln_wattage} onChange={(v) => onChange((p) => ({ ...p, pln_wattage: v }))} disabled={!editing} compact />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-sm">{t("detailPage.pop.legalTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
          <Field
            label={t("detailPage.pop.pbbNop")}
            value={form.pbb_nop || ""}
            onChange={(v) => onChange((p) => ({ ...p, pbb_nop: v }))}
            disabled={!editing}
            compact
          />
          <Field
            label={t("detailPage.pop.buildingStatus")}
            value={form.building_status || ""}
            onChange={(v) => onChange((p) => ({ ...p, building_status: v }))}
            disabled={!editing}
            compact
          />
          <Field
            label={t("detailPage.pop.leaseStart")}
            type="date"
            value={form.lease_start_date || ""}
            onChange={(v) => onChange((p) => ({ ...p, lease_start_date: v }))}
            disabled={!editing}
            compact
          />
          <Field
            label={t("detailPage.pop.leaseEnd")}
            type="date"
            value={form.lease_end_date || ""}
            onChange={(v) => onChange((p) => ({ ...p, lease_end_date: v }))}
            disabled={!editing}
            compact
          />
          <Field
            label={t("detailPage.pop.annualLeaseCost")}
            type="number"
            value={form.annual_lease_cost || ""}
            onChange={(v) => onChange((p) => ({ ...p, annual_lease_cost: v }))}
            disabled={!editing}
            compact
          />
          <Field
            label={t("detailPage.pop.landlordName")}
            value={form.landlord_name || ""}
            onChange={(v) => onChange((p) => ({ ...p, landlord_name: v }))}
            disabled={!editing}
            compact
          />
          <Field
            label={t("detailPage.pop.landlordContact")}
            value={form.landlord_contact || ""}
            onChange={(v) => onChange((p) => ({ ...p, landlord_contact: v }))}
            disabled={!editing}
            compact
          />
          <Field
            label={t("detailPage.pop.permitNumber")}
            value={form.permit_number || ""}
            onChange={(v) => onChange((p) => ({ ...p, permit_number: v }))}
            disabled={!editing}
            compact
          />
          <Field
            className="md:col-span-2 xl:col-span-3"
            label={t("detailPage.pop.legalNotes")}
            value={form.legal_notes || ""}
            onChange={(v) => onChange((p) => ({ ...p, legal_notes: v }))}
            disabled={!editing}
            compact
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-sm">{t("detailPage.pop.locationTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
          <Field className="md:col-span-2 xl:col-span-3" label={t("detailPage.pop.address")} value={form.address} onChange={(v) => onChange((p) => ({ ...p, address: v }))} disabled={!editing} compact />
          <DisplayField label={t("detailPage.pop.provinceDisplay")} value={relationLabels.province || form.province || "-"} loading={relationLoading} compact />
          <DisplayField label={t("detailPage.pop.cityDisplay")} value={relationLabels.city || form.city || "-"} loading={relationLoading} compact />
          <CoordinateField label={t("detailPage.pop.longitudeCoord")} value={form.longitude} onChange={(v) => onChange((p) => ({ ...p, longitude: v }))} disabled={!editing} compact kind="longitude" />
          <CoordinateField label={t("detailPage.pop.latitudeCoord")} value={form.latitude} onChange={(v) => onChange((p) => ({ ...p, latitude: v }))} disabled={!editing} compact kind="latitude" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-sm">{t("detailPage.pop.tagsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <Field label={t("detailPage.pop.tagsCsv")} value={form.tags} onChange={(v) => onChange((p) => ({ ...p, tags: v }))} disabled={!editing} compact />
        </CardContent>
      </Card>
    </div>
  );
}