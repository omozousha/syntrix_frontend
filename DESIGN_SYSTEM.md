# Syntrix Design System — Visual & UI Guidelines

Dokumen ini mendefinisikan standar visual, token CSS, dan pola layout untuk seluruh frontend aplikasi **Syntrix**. Dokumen ini wajib dibaca dan diikuti oleh setiap agen kecerdasan buatan (AI) atau pengembang sebelum mendesain atau mengedit elemen visual apa pun untuk memastikan konsistensi antarmuka (UIPRO compliant).

---

## 1. Asas Utama (Nothing Design / Vanguard UI)
Desain Syntrix berpusat pada estetika minimalis, presisi teknis, dan keterbacaan tinggi dengan ciri khas:
- **Materialitas & Depth**: Penggunaan Double-Bezel border, backdrop-blur, dan `glass-inset`.
- **Informasi Padat**: Kombinasi label monospace kecil dan angka tabular.
- **Micro-feedback & Physics**: Transisi pegas (`cubic-bezier`) dan efek tekan (`active:scale`).

---

## 2. Token Tailwind & Utilitas Kustom

### Batas & Warna (Borders & Opacity)
Gunakan opacity border dan background secara konsisten:
- **Border Default**: `border-border/60` (Batas standar elemen, card, dan panel).
- **Border Bezel Luar**: `border-border/40` (Batas terluar pada kontainer Double-Bezel).
- **Border Subtle/Table**: `border-border/30` atau `border-border/50`.
- **Background Card & Container**:
  - `bg-muted/20` atau `bg-muted/10` (untuk area sekunder, sidebar tip, atau dashboard panel).
  - `bg-background` (untuk area kerja utama).
  - `bg-popover` (untuk dropdown/popover).
  - `bg-primary/10` (untuk item aktif/highlight).

### Efek Glass & Shadow
- **Glass Inset**: `.glass-inset` (Menambahkan inner shadow putih halus 50% opacity di light mode, 6% di dark mode).
  - Class: `glass-inset`
- **Shadow Tokens**:
  - `shadow-2xs` (Inner panels, metric card outer bezel, mini action bars).
  - `shadow-xs` (Card standar, dropdown menu, sidebar tip, popover).
  - `shadow-sm` (Interactive hover state).
  - `shadow-lg` (Dialog modal).

---

## 3. Komponen & Pola Visual Utama

### A. Pola Double-Bezel (Kontainer Dua Lapis)
Diterapkan pada dropdown utama, menu samping, dashboard top bar, dan list detail utama. Efek ini terdiri dari kontainer luar (`outer`) dengan border membulat lebar dan padding kecil, yang membungkus kontainer dalam (`inner`) dengan radius yang disesuaikan secara matematis.

**Pola Canonical:**
1. **Dropdown / Popover (Nav User):**
   - Outer: `rounded-2xl border border-border/40 bg-muted/10 p-1.5 shadow-xs dark:bg-white/[0.02]`
   - Inner: `rounded-[calc(1.25rem-0.25rem)] border border-border/60 bg-popover shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]`
2. **Dashboard CTA / Banner Card:**
   - Outer: `rounded-[2rem] border border-border/40 bg-muted/10 p-2 shadow-xs dark:bg-white/[0.02]`
   - Inner: `rounded-[calc(2rem-0.5rem)] border border-border/60 bg-background/80 glass-inset p-4 backdrop-blur-xl dark:bg-background/40`
3. **Metric Card (Nested Bezel):**
   - Outer: `rounded-[1.5rem] border border-border/40 bg-muted/10 p-1 shadow-2xs dark:bg-white/[0.01]`
   - Inner: `rounded-[calc(1.5rem-0.25rem)] border border-border/60 bg-card glass-inset p-4`

*Rumus Bezel Radius:* `inner-radius = outer-radius - padding`.

### B. Desain Card Standar
Seluruh card data utama, widget dashboard, dan form container harus mengikuti pola berikut:
```tsx
className="rounded-2xl border border-border/60 bg-card shadow-xs glass-inset"
```
**Interactive card hover:**
Untuk card yang dapat diklik, tambahkan efek scaling dan border highlight:
```tsx
className="rounded-2xl border border-border/60 bg-card shadow-xs glass-inset transition-all duration-300 hover:border-primary/45 hover:bg-muted/15 active:scale-[0.98]"
```

### C. Pola Tombol & Fisika Interaktif
- **Primary / Pill Button**: Gunakan radius penuh (`rounded-full`) dan kurva transisi pegas:
  ```tsx
  className="rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
  ```
- **Pill dismiss / micro action button** (seperti tombol mark-read):
  ```tsx
  className="h-5 rounded-full px-2 font-mono text-[9px] uppercase tracking-[0.1em] transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
  ```
- **Sidebar Nav Item**:
  ```tsx
  className="h-9 rounded-lg px-2.5 text-sm transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-sidebar-accent data-[active=true]:bg-primary/10 data-[active=true]:font-medium data-[active=true]:text-primary"
  ```
- **Global Button Physics** (`app/globals.css`): Seluruh tombol secara default mendapatkan efek tekan `translate-y-px` dan `scale(0.99)` saat aktif melalui CSS.

---

## 4. Tipografi & Tampilan Data

### Micro-Badge & Labels Monospace
Semua label kecil (status, kategori, antrean, tipe data, tanggal metadata) wajib menggunakan format monospace kapital dengan tracking lebar:
- **Eyebrow & Column Headers**: `font-mono text-[9px] uppercase tracking-[0.18em]` atau `tracking-[0.15em]`.
- **Status Badges & Info Tags**: `font-mono text-[9px] uppercase tracking-[0.12em]`.
- **Waktu & Filter Buttons**: `font-mono text-[10px] uppercase tracking-[0.12em]`.

### Angka Tabular (Tabular Numbers)
Setiap kali menampilkan data kuantitatif, metrik numerik, ID terformat, koordinat, persentase, tanggal, atau nilai statistik, wajib menggunakan utilitas `tabular-nums` untuk mencegah pergeseran layout:
```tsx
className="font-mono tabular-nums font-semibold"
```
*Catatan: `tabular-nums` telah diaktifkan secara global pada seluruh elemen `table` dan `[data-slot=table]` di `globals.css`.*

---

## 5. QA Visual Pre-flight Checklist
Sebelum menyerahkan pekerjaan revisi visual:
1. **Tidak Ada Flash Light Mode**: Pastikan tema sinkron sebelum hydration melalui inline script di `layout.tsx`.
2. **Kesesuaian Bezel**: Pastikan padding Double-Bezel disesuaikan secara proporsional.
3. **Scrollbar Standard**: Menggunakan komponen Radix UI `<ScrollArea>` dari Shadcn UI (`components/ui/scroll-area.tsx`) dengan rail `bg-transparent` dan thumb `bg-border/60 hover:bg-muted-foreground/50 rounded-full`. Hindari scrollbar native browser atau double scrolling container.
4. **Validasi Build**: Selalu jalankan `npx tsc --noEmit` dan `npm run check:consistency` sebelum menandai pekerjaan selesai.
