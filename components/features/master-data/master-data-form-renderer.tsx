"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SimpleDropdown } from "@/components/ui/simple-dropdown";
import { Textarea } from "@/components/ui/textarea";
import type { FieldDef, FieldType } from "@/lib/master-data-form-config";
import type { ReactNode } from "react";
import { useMemo } from "react";

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
    <SimpleDropdown
      value={value}
      onValueChange={(v) => onChange(v === "__none" ? "" : v)}
      placeholder={field.placeholder || "Pilih..."}
      options={options}
      className={error ? "border-destructive" : ""}
    />
  );
}

function renderReadonlyInput(field: FieldDef, value: string) {
  return <Input value={value || "Otomatis"} disabled className="h-9 text-sm text-muted-foreground" />;
}

function renderTextareaInput(field: FieldDef, value: string, onChange: (v: string) => void, error: string | undefined) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      className={`min-h-[120px] w-full font-mono text-xs ${error ? "border-destructive" : ""}`}
    />
  );
}

function renderColorInput(field: FieldDef, value: string, onChange: (v: string) => void) {
  const normalized = normalizeHexColor(value) || "#0EA5E9";
  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm">
            <span className="size-4 rounded border" style={{ backgroundColor: normalized }} />
            <span className="font-mono">{normalized}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-3" align="start">
          <div className="space-y-1.5">
            <Label className="text-xs">Color Picker</Label>
            <input
              type="color"
              value={normalized}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
              className="h-10 w-full cursor-pointer rounded border p-1"
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

export function MasterDataFormFields(props: RenderMasterDataFieldsProps) {
  const { fields, form, setForm, fieldErrors, setFieldError, clearFieldError, lookups, onBlur, isEdit } = props;
  const setValue = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const sections = useMemo(() => {
    const map = new Map<string, FieldDef[]>();
    for (const field of fields) {
      const section = field.section || "";
      if (!map.has(section)) map.set(section, []);
      map.get(section)!.push(field);
    }
    return Array.from(map.entries());
  }, [fields]);

  return (
    <div className="space-y-5">
      {sections.map(([sectionName, sectionFields]) => {
        const hasGrid = sectionFields.some((f) => f.cols === 2);
        return (
          <div key={sectionName || "fields"}>
            {sectionName && (
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {sectionName}
              </h4>
            )}
            <div className={`grid ${hasGrid ? "grid-cols-2 gap-x-4 gap-y-3" : "grid-cols-1 gap-3"}`}>
              {sectionFields.map((field) => {
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

                return (
                  <div
                    key={field.key}
                    className={`space-y-1.5 ${field.cols === 2 ? "col-span-1" : field.cols === 1 ? "col-span-2" : hasGrid ? "col-span-2" : ""}`}
                    onBlur={field.type !== "checkbox-group" ? handleBlur : undefined}
                  >
                    <Label className="text-sm font-medium">
                      {field.label}
                      {field.required && <span className="ml-0.5 text-destructive">*</span>}
                    </Label>
                    {field.type === "text" ? renderTextInput(field, value, handleChange, error) : null}
                    {field.type === "number" ? renderNumberInput(field, value, handleChange, error) : null}
                    {field.type === "combobox" ? renderCombobox(field, value, handleChange, error, lookups) : null}
                    {field.type === "readonly" ? renderReadonlyInput(field, value) : null}
                    {field.type === "color" ? renderColorInput(field, value, handleChange) : null}
                    {field.type === "textarea" ? renderTextareaInput(field, value, handleChange, error) : null}
                    {field.type === "checkbox-group" ? (
                      <div className="space-y-2">
                        {field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}
                        {renderCheckboxGroup(field, form, (v) => { setValue(field.key, v); clearFieldError(field.key); })}
                      </div>
                    ) : null}
                    {field.helpText && field.type !== "checkbox-group" ? (
                      <p className="text-xs text-muted-foreground">{field.helpText}</p>
                    ) : null}
                    {error ? <p className="text-xs text-destructive">{error}</p> : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
