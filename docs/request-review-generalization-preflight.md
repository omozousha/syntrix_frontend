# Request Review Generalization Preflight

Gunakan preflight ini sebelum menjalankan UAT request approval. Tujuannya memastikan backend, frontend, dan database sudah berada di versi yang mendukung request umum untuk device, POP, route, dan project.

## Deployment Check

- [ ] Backend production sudah berisi commit `68f7727` atau commit lebih baru.
- [ ] Frontend production sudah berisi commit `c55bf5f` atau commit lebih baru.
- [ ] Route `/requests` bisa dibuka setelah login.
- [ ] Menu lama `/validation-requests` masih redirect ke `/requests`.

## Database Migration Check

Jalankan query berikut di database target setelah migration `20260507_generalize_validation_requests_entity.sql`.

```sql
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.validation_requests'::regclass
  and conname = 'validation_requests_entity_type_check';
```

Expected:

- Query mengembalikan 1 row.
- `definition` berisi `device`, `pop`, `route`, dan `project`.

```sql
select conname, confrelid::regclass as referenced_table
from pg_constraint
where conrelid = 'public.validation_requests'::regclass
  and contype = 'f'
  and conname = 'validation_requests_entity_id_fkey';
```

Expected:

- Query mengembalikan 0 row.
- Ini memastikan `entity_id` tidak lagi terkunci hanya ke `public.devices`, sehingga request untuk POP/route/project bisa disimpan.

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'validation_requests'
  and indexname = 'uq_validation_requests_active_entity';
```

Expected:

- Query mengembalikan 1 row.
- Index tetap menjaga hanya ada satu request aktif untuk entity yang sama.

## Smoke Test Setelah Preflight

- [ ] Login adminregion, create ODP baru, pastikan muncul pesan request approval.
- [ ] Login superadmin, pastikan request `Create Device` muncul di `/requests`.
- [ ] Login adminregion, create POP baru, pastikan tidak langsung masuk list utama.
- [ ] Login superadmin, pastikan request `Create POP` muncul di `/requests`.
