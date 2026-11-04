import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { DisplayField, Field, SelectField } from "../fields";
import type { EditableForm, PopLookupOption, ProjectLookupOption, RelationLabels } from "../types";
import { CUSTOMER_STATUS_OPTIONS } from "../helpers";
import { useTranslate } from "@/lib/use-locale";

export function CustomerDetailEditForm({
  form,
  onChange,
  editing,
  popOptions,
  projectOptions,
  relationLabels,
  relationLoading = false,
}: {
  form: EditableForm;
  onChange: React.Dispatch<React.SetStateAction<EditableForm>>;
  editing: boolean;
  popOptions: PopLookupOption[];
  projectOptions: ProjectLookupOption[];
  relationLabels: RelationLabels;
  relationLoading?: boolean;
}) {
  const { t } = useTranslate();
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-sm">{t("detailPage.customer.identityTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
          <Field
            label={t("detailPage.customer.name")}
            value={form.customer_name || ""}
            onChange={(v) => onChange((p) => ({ ...p, customer_name: v }))}
            disabled={!editing}
            compact
          />
          <Field
            label={t("detailPage.customer.cid")}
            value={form.customer_number || ""}
            onChange={(v) => onChange((p) => ({ ...p, customer_number: v }))}
            disabled={!editing}
            compact
          />
          <SelectField
            label={t("detailPage.customer.status")}
            value={form.status || "active"}
            options={CUSTOMER_STATUS_OPTIONS}
            onValueChange={(v) => onChange((p) => ({ ...p, status: v }))}
            disabled={!editing}
            compact
          />
          <Field
            label={t("detailPage.customer.serviceType")}
            value={form.service_type || ""}
            onChange={(v) => onChange((p) => ({ ...p, service_type: v }))}
            disabled={!editing}
            compact
          />
          {editing ? (
            <div className="space-y-1">
              <Label>{t("detailPage.customer.popGateway")}</Label>
              <Combobox
                value={form.pop_id || ""}
                onValueChange={(v) => onChange((p) => ({ ...p, pop_id: v }))}
                options={popOptions.map((pop) => ({
                  value: pop.id,
                  label: `${pop.pop_name || "POP"} (${pop.pop_code || pop.id})`,
                }))}
                placeholder={t("detailPage.customer.popPlaceholder")}
                searchPlaceholder={t("detailPage.customer.popSearch")}
                triggerClassName="h-8 text-xs"
              />
            </div>
          ) : (
            <DisplayField label={t("detailPage.customer.popLabel")} value={relationLabels.pop || "-"} loading={relationLoading} compact />
          )}
          {editing ? (
            <div className="space-y-1">
              <Label>{t("detailPage.customer.projectLabel")}</Label>
              <Combobox
                value={form.project_id || ""}
                onValueChange={(v) => onChange((p) => ({ ...p, project_id: v }))}
                options={projectOptions.map((proj) => ({
                  value: proj.id,
                  label: `${proj.project_name || "Project"} (${proj.project_code || proj.id})`,
                }))}
                placeholder={t("detailPage.customer.projectPlaceholder")}
                searchPlaceholder={t("detailPage.customer.projectSearch")}
                triggerClassName="h-8 text-xs"
              />
            </div>
          ) : (
            <DisplayField label={t("detailPage.customer.projectLabel")} value={relationLabels.project || "-"} loading={relationLoading} compact />
          )}
          <Field
            label={t("detailPage.customer.installationDate")}
            type="date"
            value={form.installation_date || ""}
            onChange={(v) => onChange((p) => ({ ...p, installation_date: v }))}
            disabled={!editing}
            compact
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-sm">{t("detailPage.customer.contactTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
          <Field
            label={t("detailPage.customer.picName")}
            value={form.contact_name || ""}
            onChange={(v) => onChange((p) => ({ ...p, contact_name: v }))}
            disabled={!editing}
            compact
          />
          <Field
            label={t("detailPage.customer.phone")}
            value={form.contact_phone || ""}
            onChange={(v) => onChange((p) => ({ ...p, contact_phone: v }))}
            disabled={!editing}
            compact
          />
          <Field
            label={t("detailPage.customer.email")}
            type="email"
            value={form.email || ""}
            onChange={(v) => onChange((p) => ({ ...p, email: v }))}
            disabled={!editing}
            compact
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-sm">{t("detailPage.customer.locationTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 px-3 pb-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
          <Field
            label={t("detailPage.customer.address")}
            value={form.address || ""}
            onChange={(v) => onChange((p) => ({ ...p, address: v }))}
            disabled={!editing}
            className="md:col-span-2 xl:col-span-3"
            compact
          />
          <Field
            label={t("detailPage.customer.city")}
            value={form.city || ""}
            onChange={(v) => onChange((p) => ({ ...p, city: v }))}
            disabled={!editing}
            compact
          />
          <Field
            label={t("detailPage.customer.province")}
            value={form.province || ""}
            onChange={(v) => onChange((p) => ({ ...p, province: v }))}
            disabled={!editing}
            compact
          />
          <Field
            label={t("detailPage.customer.latitude")}
            value={form.latitude || ""}
            onChange={(v) => onChange((p) => ({ ...p, latitude: v }))}
            disabled={!editing}
            compact
          />
          <Field
            label={t("detailPage.customer.longitude")}
            value={form.longitude || ""}
            onChange={(v) => onChange((p) => ({ ...p, longitude: v }))}
            disabled={!editing}
            compact
          />
          <Field
            label={t("detailPage.customer.tagsCsv")}
            value={form.tags || ""}
            onChange={(v) => onChange((p) => ({ ...p, tags: v }))}
            disabled={!editing}
            compact
          />
        </CardContent>
      </Card>
    </div>
  );
}