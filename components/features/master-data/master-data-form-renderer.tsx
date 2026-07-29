"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { FieldDef, FieldType } from "@/lib/master-data-form-config";
import type { ReactNode } from "react";

export type LookupOptions = {
  manufacturers: { id: string; label: string }[];
  brands: { id: string; label: string }[];
  provinces: { id: string; label: string }[];
  assetTypes: { id: string; label: string }[];
};

type RenderMasterDataFieldsProps = {
  fields: FieldDef[];
  form: Record<string, string>;
  setForm: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  fieldErrors: Record<string, string>;
  setFieldError: (field: string, msg: string) => void;
  clearFieldError: (field: string) => void;
  lookups: LookupOptions;
  onBlur?: (field: FieldDef, value: string) => void;
  isEdit?: boolean;
};

const LOOKUP_MAP: Record<string, keyof LookupOptions> = {
  manufacturers: "manufacturers",
  brands: "brands",
  provinces: "provinces",
  assetTypes: "assetTypes",
};

const SWATCHES = Array.from(
  new Set([
    "#EF4444", "#F97316", "#F59E0B", "#EAB308", "#84CC16", "#22C55E", "#10B981", "#14B8A6",
    "#06B6D4", "#0EA5E9", "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7", "#D946EF", "#EC4899",
    "#F43F5E", "#DC2626", "#EA580C", "#CA8A04", "#65A30D", "#16A34A", "#059669", "#0D9488",
    "#0891B2", "#0284C7", "#2563EB", "#4F46E5", "#7C3AED", "#9333EA", "#C026D3", "#DB2777",
    "#E11D48", "#374151", "#4B5563", "#6B7280", "#9CA3AF", "#64748B", "#1F2937", "#111827",
  ]),
);

function normalizeHexColor(value: string) {
  const text = (value || "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(text)) return text.toUpperCase();
  if (/^[0-9A-Fa-f]{6}$/.test(text)) return `#${text.toUpperCase()}`;
  return "";
}

function renderTextInput(field: FieldDef, value: string, onChange: (v: string) => void, error: string | undefined) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      className={`h-9 text-sm ${error ? "border-destructive" : ""}`}
    />
  );
}

function renderNumberInput(field: FieldDef, value: string, onChange: (v: string) => void, error: string | undefined) {
  return (
    <Input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      min={field.validate?.toString().includes("< 0") ? 0 : undefined}
      className={`h-9 text-sm ${error ? "border-destructive" : ""}`}
    />
  );
}

function renderCombobox(
  field: FieldDef,
  value: string,
  onChange: (v: string) => void,
  error: string | undefined,
  lookups: LookupOptions,
) {
  let options = field.options || [];
  if (field.lookupType) {
    const items = lookups[LOOKUP_MAP[field.lookupType]] || [];
    options = [{ value: "__none", label: "-" }, ...items.map((item) => ({ value: item.id, label: item.label }))];
  }
  return (
    <Combobox
      value={value}
      onValueChange={(v) => onChange(v === "__none" ? "" : v)}
      placeholder={field.placeholder || "Pilih..."}
      searchPlaceholder="Cari..."
      options={options}
      className={`h-9 text-sm ${error ? "border-destructive" : ""}`}
    />
  );
}

function renderReadonlyInput(field: FieldDef, value: string) {
  return <Input value={value || "Otomatis"} disabled className="h-9 text-sm text-muted-foreground" />;
}

function renderColorInput(field: FieldDef, value: string, onChange: (v: string) => void) {
  const normalized = normalizeHexColor(value) || "#0EA5E9";
  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-24 justify-start gap-2 px-2">
            <span className="size-4 rounded border" style={{ backgroundColor: normalized }} />
            <span className="text-xs">{normalized}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-3" align="start">
          <div className="space-y-1.5">
            <Label className="text-xs">Color Picker</Label>
            <Input
              type="color"
              value={normalized}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
              className="h-10 w-full cursor-pointer p-1"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Quick Colors</Label>
            <div className="grid grid-cols-8 gap-1">
              {SWATCHES.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="size-6 rounded border"
                  style={{ backgroundColor: color }}
                  onClick={() => onChange(color)}
                  aria-label={`Pilih ${color}`}
                />
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="h-9 text-sm font-mono"
      />
    </div>
  );
}

function renderCheckboxGroup(field: FieldDef, form: Record<string, string>, onChange: (v: string) => void) {
  const allowedKeys = parseJsonStringArray(form[field.key]);
  const toggle = (key: string) => {
    const next = allowedKeys.includes(key) ? allowedKeys.filter((k) => k !== key) : [...allowedKeys, key];
    onChange(JSON.stringify(next));
  };
  return (
    <div className="flex flex-wrap gap-4">
      {(field.options || []).map((opt) => (
        <label key={opt.value} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allowedKeys.includes(opt.value)}
            onChange={() => toggle(opt.value)}
            className="size-4 cursor-pointer rounded border-input bg-background text-primary"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

function parseJsonStringArray(value: string | undefined | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

const FIELD_RENDERERS: Partial<Record<FieldType, (field: FieldDef, value: string, onChange: (v: string) => void, form: Record<string, string>, lookups: LookupOptions) => ReactNode>> = {
  text: (f, v, onChange) => renderTextInput(f, v, onChange, undefined),
  number: (f, v, onChange) => renderNumberInput(f, v, onChange, undefined),
  combobox: (f, v, onChange, _form, lookups) => renderCombobox(f, v, onChange, undefined, lookups),
  readonly: (_f, v) => renderReadonlyInput(_f, v),
  color: (f, v, onChange) => renderColorInput(f, v, onChange),
  "checkbox-group": (f, _v, onChange, form) => renderCheckboxGroup(f, form, onChange),
};

export function MasterDataFormField(props: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  lookups: LookupOptions;
  form: Record<string, string>;
}) {
  const { field, value, onChange, error, lookups, form: formState } = props;
  const renderer = FIELD_RENDERERS[field.type];
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {field.label}
        {field.required ? " *" : ""}
      </Label>
      {renderer ? renderer(field, value, onChange, formState, lookups) : null}
      {field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function MasterDataFormFields(props: RenderMasterDataFieldsProps) {
  const { fields, form, setForm, fieldErrors, setFieldError, clearFieldError, lookups, onBlur, isEdit } = props;
  const setValue = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="grid gap-3">
      {fields.map((field) => {
        const value = form[field.key] || "";
        const error = fieldErrors[field.key];
        const handleChange = (rawValue: string) => {
          const transformed = field.transform ? field.transform(rawValue) : rawValue;
          setValue(field.key, transformed);
          clearFieldError(field.key);
        };
        const handleBlur = () => {
          if (field.validate) {
            const err = field.validate(value, form);
            if (err) {
              setFieldError(field.key, err);
              return;
            }
          }
          if (onBlur) onBlur(field, value);
        };

        if (field.type === "checkbox-group") {
          return (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-sm font-medium">{field.label}</Label>
              {field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}
              {renderCheckboxGroup(field, form, (v) => { setValue(field.key, v); clearFieldError(field.key); })}
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </div>
          );
        }

        return (
          <div key={field.key} className="space-y-1.5" onBlur={handleBlur}>
            <Label className="text-sm font-medium">
              {field.label}
              {field.required ? " *" : ""}
            </Label>
            {field.type === "text" ? renderTextInput(field, value, handleChange, error) : null}
            {field.type === "number" ? renderNumberInput(field, value, handleChange, error) : null}
            {field.type === "combobox" ? renderCombobox(field, value, handleChange, error, lookups) : null}
            {field.type === "readonly" ? renderReadonlyInput(field, value) : null}
            {field.type === "color" ? renderColorInput(field, value, handleChange) : null}
            {field.helpText ? (
              <p className="text-xs text-muted-foreground">{field.helpText}</p>
            ) : null}
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
