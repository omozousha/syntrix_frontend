# Syntrix Frontend

Frontend Next.js untuk integrasi ke backend Syntrix.

## Setup

1. Salin env:

```bash
cp .env.example .env.local
```

2. Pastikan nilainya:

```env
NEXT_PUBLIC_API_BASE_URL=https://syntrix-backend.vercel.app/api/v1
```

3. Jalankan development server:

```bash
npm run dev
```

4. Buka:

```text
http://localhost:3000
```

## Halaman Uji Integrasi

`app/page.tsx` saat ini sudah berisi alur uji koneksi backend:

- Login (`POST /auth/login`)
- Simpan token di state
- Load list POP (`GET /pops`)

## Akun Uji Operasional

- `admin.ops@syntrix.local`
- `ops.region@syntrix.local`

Gunakan password operasional terbaru dari tim backend.
