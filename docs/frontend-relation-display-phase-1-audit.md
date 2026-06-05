# Frontend Relation Display Phase 1 Audit

Tanggal: 5 Juni 2026

## Scope

Audit ini adalah baseline awal untuk menghilangkan relation display flash, yaitu kondisi ketika UI menampilkan ID relasi mentah sebelum berubah menjadi label manusiawi.

Area yang discan:

- `syntrix_frontend/app`
- `syntrix_frontend/components`
- `syntrix_frontend/lib`
- `syntrix_frontend/hooks`
- `syntrix_app/src` jika folder app tersedia di workspace yang sama

Command:

```txt
npm run audit:relation-display
```

Script:

```txt
scripts/audit-relation-display.mjs
```

## Field Relasi Yang Diaudit

- `region_id`
- `pop_id`
- `tenant_id`
- `device_type_id`
- `brand_id`
- `model_id`
- `manufacturer_id`
- `service_type_id`
- `project_id`
- `customer_id`

## Rule Display

User-facing UI tidak boleh menjadikan ID relasi teknis sebagai fallback label.

Tidak boleh:

```tsx
value={relationLabels.region || valueOf(item.region_id, "-")}
value={regionMap.get(row.region_id) || row.region_id}
{row.region_id ? regionNameMap.get(row.region_id) || row.region_id : "-"}
```

Boleh:

```tsx
value={display.regionLabel}
value={getRegionLabel(item, references)}
value={relationLabels.region || "Data tidak tersedia"}
```

Pengecualian yang boleh memakai ID:

- Field bisnis yang memang bernama `Inventory ID`.
- Field bisnis yang memang bernama `CID`.
- Field teknis di form state, select value, API payload, query param, route param, dan mutation body.
- Debug/developer-only output yang tidak tampil sebagai label operasional.

## Fallback Copy Standard

- Loading: `Memuat...`
- Missing/unknown: `Data tidak tersedia`
- Optional empty: `-`
- Access denied: `Tidak tersedia untuk scope akun ini`

## Baseline Findings

Audit pertama menemukan kandidat di frontend dan Syntrix-One. Tidak semua kandidat adalah bug, karena script sengaja dibuat konservatif untuk Phase 1 dan masih menangkap beberapa data-flow/form value.

Kandidat valid prioritas tinggi:

- `components/features/data-management/device-detail/device-operational-summary.tsx`
  - Region fallback ke `item.region_id`.
  - POP fallback ke `item.pop_id`.
- `app/(app)/data-management/list/[slug]/[id]/page.tsx`
  - Detail device masih melakukan fetch relasi per ID.
  - Beberapa display field masih fallback ke `region_id`, `pop_id`, dan `project_id`.
- `app/(app)/data-management/as-built-documents/page.tsx`
  - Region table fallback ke `row.region_id`.
- `app/(app)/validation-requests/page.tsx`
  - Beberapa ringkasan request masih fallback ke `region_id`, `pop_id`, dan `project_id`.
- `components/features/account-management/account-table.tsx`
  - Region akun fallback ke `default_region_id`.
- `components/features/data-management/device-detail/odp-validation-history-sections.tsx`
  - POP history fallback ke `validation.pop_id`.
- `syntrix_app/src/components/validation-form.tsx`
  - POP loading/form context masih bisa fallback ke `device.pop_id`.

Kandidat yang perlu diklasifikasi ulang sebelum refactor:

- Form select value seperti `value={values.pop_id || "__none__"}`.
- Query param seperti `region_id`.
- Payload submit/update seperti `tenant_id`, `brand_id`, `model_id`.
- Field `customer_id` yang sebenarnya bukan label, tetapi relasi port/customer.
- `customer_number || customer_id` yang perlu dicek apakah `customer_id` adalah legacy business ID atau UUID.

## Phase 1 Implementation Status

- [x] Audit script tersedia.
- [x] Script bisa menscan frontend dan Syntrix-One.
- [x] Baseline temuan terdokumentasi.
- [x] Rule display user-facing terdokumentasi.
- [x] Fallback copy standar ditentukan.
- [ ] Semua temuan valid sudah dimigrasikan ke resolver/adapter.
- [ ] False-positive checker sudah diperkecil setelah migrasi awal.

## Next Step

Langkah berikutnya yang paling aman:

1. Implement `relation-labels.ts`.
2. Migrasi `DeviceOperationalSummary` sebagai target pertama.
3. Migrasi detail ODP field display di `data-management/list/[slug]/[id]`.
4. Setelah itu baru migrasi request approval dan validation history.
