# Syntrix Design System — Visual & UI Guidelines

Dokumen ini mendefinisikan standar visual, token CSS, dan pola layout untuk seluruh frontend aplikasi **Syntrix**. Dokumen ini wajib dibaca dan diikuti oleh setiap agen kecerdasan buatan (AI) atau pengembang sebelum mendesain atau mengedit elemen visual apa pun.

**Revisi 2026-11-26 (Anti-Slop Alignment):** Pola-pola yang sebelumnya menghasilkan markup terlihat *machine-made* (Double-Bezel bertingkat, micro-badge `uppercase tracking-*`, `transition-all`, `glass-inset` + backdrop-blur berlapis, ambient orb) telah dihapus dari standar. Untuk halaman yang dibuat sebelum revisi ini, migrasikan bertahap mengikuti checklist §5. Skill Hallmark (`.claude/skills/hallmark`) boleh dipakai sebagai auditor tanpa perlu pengecualian.

---

## 1. Asas Utama (Vanguard UI · Anti-Slop)
Desain Syntrix berpusat pada estetika minimalis, presisi teknis, dan keterbacaan tinggi dengan ciri khas:
- **Materialitas & Depth**: Kedalaman berasal dari *langkah kecerahan permukaan* (`bg-background` → `bg-muted/10` → `bg-card`) dan *hairline border* (`border-border/60`), bukan dari lapisan kartu bertingkat.
- **Informasi Padat & Responsif**: Penggunaan full-width container (`w-full`), grid adaptif 12-kolom (`lg:grid-cols-12`), dan pemanfaatan ruang kosong secara efisien tanpa *dead space* atau constraint lebar artifisial (`max-w-*` yang tidak perlu).
- **Micro-feedback & Physics**: Transisi properti spesifik (bukan `transition-all`), fokus ring instan, efek tekan `active:translate-y-px`.
- **Deterministik**: Konten harus terlihat tanpa scripting. Animasi wajib punya fallback `prefers-reduced-motion`.

### Larangan Keras (Floor)
Pola berikut **tidak boleh** muncul di kode Syntrix baru:

| Pola | Contoh dilarang | Alasan |
|---|---|---|
| Card-in-card | `rounded-2xl ... p-2` membungkus `rounded-[calc(2rem-0.5rem)]` | Terlihat seperti markup AI |
| Micro-badge uppercase-tracked | `font-mono text-[9px] uppercase tracking-[0.15em]` | Identik dengan output AI |
| `transition-all` | `transition-all duration-300` | Memicu animasi tak perlu |
| Ambient glow orb | `blur-3xl rounded-full bg-primary/15 animate-ambient-float` | Default generated |
| Glass blur berlapis | `backdrop-blur-md` di dalam card yang sudah blur | Redundan |
| Emoji sebagai ikon | `<span>🔒</span>` | Ganti `lucide-react` |
| Eyebrow di atas heading | `<span>OUR SERVICES</span><h2>What we do</h2>` | Ciri khas AI landing page |
| Middle-dot meta string | `A · B · C` | Ganti `—` atau baris |

---

## 2. Token Tailwind & Utilitas Kustom

### Batas & Warna (Borders & Opacity)
Gunakan opacity border dan background secara konsisten:
- **Border Default**: `border-border/60` (Batas standar elemen, card, dan panel).
- **Border Subtle**: `border-border/40` (Kontainer sekunder, sidebar tip).
- **Border Hairline**: `border-border/30` (Pemisah baris, tabel, pembatas vertikal).
- **Background Card & Container**:
  - `bg-muted/20` atau `bg-muted/10` (area sekunder, sidebar tip, dashboard panel).
  - `bg-background` (area kerja utama).
  - `bg-popover` (dropdown/popover).
  - `bg-primary/10` (item aktif/highlight).

### Efek Shadow
- **Shadow Tokens**:
  - `shadow-2xs` (inner panel, metric card, mini action bar).
  - `shadow-xs` (card standar, dropdown, sidebar tip, popover).
  - `shadow-sm` (interactive hover state).
  - `shadow-lg` (dialog modal).
- **Kedalaman**: Satu bayangan per permukaan. Tidak ada nested shadow.

### Fokus, Status & Motion
- **Focus Ring** (wajib di setiap elemen interaktif, muncul instan):
  ```tsx
  className="focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring"
  ```
- **Disabled** (tiga kanal — opacity, cursor, atribut native):
  ```tsx
  className="disabled:opacity-50 disabled:cursor-not-allowed"
  // + attribute: disabled={...}
  ```
- **Transisi Spesifik** (ganti `transition-all`):
  ```tsx
  // ✅ Benar
  className="transition-[color,background-color,border-color,box-shadow,transform]"
  // ❌ Salah
  className="transition-all"
  ```
- **Reduced Motion** (wajib di setiap animasi `transform`):
  ```tsx
  className="motion-reduce:transform-none motion-reduce:animate-none"
  ```
- **Durasi standar**: `duration-200` untuk state kecil (hover, focus), `duration-300` untuk card/panel.

---

## 3. Komponen & Pola Visual Utama

### A. Pola Card Standar (Single-Level)
Seluruh card data utama, widget dashboard, dan form container:
```tsx
className="rounded-2xl border border-border/60 bg-card shadow-xs"
```
**Interactive card hover:**
```tsx
className="rounded-2xl border border-border/60 bg-card shadow-xs transition-[color,background-color,border-color,box-shadow,transform] duration-200 hover:border-primary/45 hover:bg-muted/15 focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none"
```
**Dilarang:** Membungkus Card di dalam Card (double-bezel). Gunakan **satu** level containment. Untuk membedakan hierarki, pakai langkah warna (`bg-muted/10` untuk wrapper, `bg-card` untuk item).

### B. Pola Tombol & Fisika Interaktif
- **Primary Button**:
  ```tsx
  className="h-10 rounded-full transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none"
  ```
- **Ghost Button**:
  ```tsx
  className="h-10 rounded-full text-muted-foreground transition-[color,background-color] duration-200 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none"
  ```
- **Micro Action Button** (pill kecil untuk status/tindakan inline):
  ```tsx
  className="h-5 rounded-full px-2 text-xs font-medium transition-[color,background-color] duration-200 focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
  ```
- **Sidebar Nav Item**:
  ```tsx
  className="h-9 rounded-lg px-2.5 text-sm transition-colors duration-200 ease-out hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring/50 data-[active=true]:bg-primary/10 data-[active=true]:font-medium data-[active=true]:text-primary"
  ```
- **Global Button Physics** (`app/globals.css`): Seluruh tombol mendapat efek tekan `translate-y-px` saat aktif melalui CSS. Ganti `scale(0.99)` dengan `translate-y-px` untuk menghindari animasi ganda.

### C. Layout Responsif & Efisiensi Ruang (Zero Dead Space)
Setiap halaman dan komponen wajib memanfaatkan ruang layar secara maksimal dan responsif:
- **No Unnecessary Max-Width**: Dilarang memasang constraint `max-w-4xl` atau `max-w-5xl` pada halaman utama jika menyebabkan *dead space* di layar lebar.
- **Adaptive Multi-Column Grid**: Gunakan sistem grid 12-kolom (`grid-cols-1 lg:grid-cols-12`) untuk membagi area kerja menjadi panel ringkasan/profil (mis. 4 kolom) dan panel form/detail utama (mis. 8 kolom).
- **Dense Data Grid**: Field form dan metadata wajib disusun dalam sub-grid responsif (`sm:grid-cols-2 xl:grid-cols-3`) agar sejajar dan padat informasi.

---

## 4. Tipografi & Tampilan Data

### Label, Kategori, Status
Gunakan kalimat biasa (sentence case), **tanpa `uppercase` dan tanpa `tracking-*`** untuk teks fungsional:
```tsx
// ✅ Benar
<span className="text-sm font-medium text-muted-foreground">Ops console</span>
<span className="text-sm font-medium text-foreground">Secure</span>
<span className="font-mono text-sm tabular-nums text-muted-foreground">01</span>

// ❌ Salah — slop
<span className="font-mono text-[9px] uppercase tracking-[0.12em]">SECURE</span>
<span className="font-mono text-[9px] uppercase tracking-[0.15em]">OPS CONSOLE</span>
```

### Wordmark & Branding
Hanya **wordmark** (nama produk/brand) yang boleh memakai `uppercase` atau tracking lebar. Contoh legal: `SYNTRIX`, `Nhost`.

### Angka Tabular (Tabular Numbers)
Setiap kali menampilkan data kuantitatif, metrik numerik, ID terformat, koordinat, persentase, tanggal, atau nilai statistik, wajib menggunakan utilitas `tabular-nums`:
```tsx
className="font-mono tabular-nums font-semibold"
```
`tabular-nums` telah aktif global pada elemen `table` dan `[data-slot=table]` di `globals.css`.

### Kapan Mono Digunakan
`font-mono` hanya untuk: (a) angka/angka moneter, (b) kode/identifier teknis (commit hash, request ID), (c) jam/tanggal pada baris data. **Bukan** untuk label dekoratif.

---

## 5. QA Visual Pre-flight Checklist

Sebelum menyerahkan pekerjaan revisi visual:

1. **Tidak Ada Flash Light Mode**: Tema tersinkron sebelum hydration melalui inline script di `layout.tsx`.
2. **Tidak Ada Double-Bezel**: Tidak ada Card di dalam Card. Ganti dengan langkah warna atau hairline border.
3. **Tidak Ada `transition-all`**: Cari dengan `grep -rn "transition-all" app/ components/`. Semua sudah diganti properti spesifik.
4. **Tidak Ada Micro-Badge Uppercase-Tracked**: Cari `uppercase tracking-`. Hanya wordmark yang boleh.
5. **Focus Ring Instan**: Setiap `<button>`, `<a>`, `<input>`, `<select>`, `<textarea>` punya `focus-visible:ring-*`.
6. **Disabled Tiga Kanal**: `opacity-50` + `cursor-not-allowed` + atribut `disabled`.
7. **Reduced Motion**: Setiap `transform` atau `animate-*` punya `motion-reduce:*`.
8. **Scrollbar Standard**: Menggunakan Radix `<ScrollArea>` (`components/ui/scroll-area.tsx`) dengan rail `bg-transparent` dan thumb `bg-border/60 hover:bg-muted-foreground/50 rounded-full`.
9. **Pemanfaatan Ruang & Grid (Zero Dead Space)**: Kontainer `w-full`, memanfaatkan `lg:grid-cols-12` / `xl:grid-cols-3`, tanpa area kosong di layar lebar.
10. **Validasi Build**: `npx tsc --noEmit` dan `npm run check:consistency` lulus.

### Audit dengan Hallmark (Opsional)
Untuk audit mandiri terhadap halaman:
```bash
node ~/.claude/skills/hallmark/scripts/sloplint.mjs <file-or-dir> --genre modern-minimal
```
Target: `0 FAIL, 0 REFLEX, 0 WARN` per file. Jika ada sisa, dokumentasikan di komentar `/* Hallmark · waive <gate> · ... */` di `app/globals.css`.
