# Syntrix Design System — Visual & UI Guidelines

Dokumen ini mendefinisikan standar visual, token CSS, pola layout, interaksi, dan tampilan data untuk seluruh frontend aplikasi **Syntrix**. Wajib dibaca dan diikuti oleh setiap agen AI atau pengembang sebelum mendesain, membangun, atau mengedit UI apa pun.

**Revisi 2026-11-26 (Web Interface Guidelines Alignment).** Standar lama dipengaruhi prinsip landing-page anti-slop (micro-label uppercase, Double-Bezel, ambient orb, transisi serba) — semuanya dihapus. Standar baru berorientasi **aplikasi operasional internal** dan bersumber dari [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines). Identitas Vanguard tetap dipertahankan pada token, tipografi, dan fisika interaksi.

**Sumber referensi:**
- [vercel-labs/web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines) — sumber utama untuk interaksi, animasi, layout, konten, form, performa.
- [WAI-ARIA Authoring Patterns](https://www.w3.org/WAI/ARIA/apg/patterns/) — untuk kompleksitas interaksi (dialog, combobox, tab, dll.).
- Shadcn UI + Radix UI — komponen dasar yang dipakai seluruh halaman.

---

## 1. Asas Utama (Vanguard UI)

Desain Syntrix berpusat pada estetika minimalis, presisi teknis, dan keterbacaan tinggi untuk operator yang bekerja berjam-jam di dalam aplikasi.

- **Kedalaman lewat langkah warna**, bukan lapisan kartu bertingkat: `bg-background` → `bg-muted/10` → `bg-card` → `bg-primary/10` untuk aksen.
- **Zero dead space**: full-width container, grid adaptif 12-kolom (`lg:grid-cols-12`), tanpa `max-w-*` artifisial pada halaman utama.
- **Micro-feedback fisika**: transisi properti spesifik (bukan `transition-all`), fokus ring instan, efek tekan `active:translate-y-px`.
- **State lengkap**: setiap area yang memuat data punya 4 state — loading, empty, error, full.
- **URL adalah state**: filter, tab, pagination, panel terbuka tercermin di URL agar bisa di-share dan Back/Forward bekerja.

### Larangan Keras (dilarang di seluruh kode Syntrix baru)

| Pola | Contoh dilarang | Alasan |
|---|---|---|
| `transition: all` | `transition-all duration-300` | Memicu animasi properti tak perlu, menyebabkan jank |
| Animasi `width`/`height`/`top`/`left` | `animate-[width_200ms]` | Memicu reflow, bukan compositor-friendly |
| Card di dalam Card | outer `rounded-2xl p-2` membungkus inner `rounded-[calc(2rem-0.5rem)]` | Slop visual, tidak menambah hierarki |
| Micro-badge uppercase-tracked | `font-mono text-[9px] uppercase tracking-[0.12em]` | Identik dengan output AI |
| Ambient glow orb | `blur-3xl rounded-full bg-primary/15 animate-ambient-float` | Default generated |
| Emoji sebagai ikon | `<span>🔒</span>` | Ganti `lucide-react` |
| Eyebrow di atas heading | `<span>OUR SERVICES</span><h2>What we do</h2>` | Slop landing page |
| Gradient ungu-biru | `bg-gradient-to-br from-purple-500 to-blue-500` | Tanda AI-generated |
| Middle-dot meta string | `A · B · C` | Ganti `—` atau baris |
| Animasi dekoratif loop >5s tanpa kontrol pause | `animate-pulse` di mana-mana | WAI WCAG 2.2 |
| `Date.now()` / `Math.random()` di render | — | Harus deterministik |
| Placeholder menggantikan label | `<input placeholder="Email">` tanpa `<label>` | Aksesibilitas |

---

## 2. Token Tailwind & Utilitas Kustom

### Batas & Warna (Borders & Opacity)
- **Border Default**: `border-border/60` (Batas standar elemen, card, dan panel).
- **Border Subtle**: `border-border/40` (Kontainer sekunder, sidebar tip).
- **Border Hairline**: `border-border/30` (Pemisah baris, tabel, pembatas vertikal).
- **Background Card & Container**:
  - `bg-muted/20` atau `bg-muted/10` (area sekunder, sidebar tip, dashboard panel).
  - `bg-background` (area kerja utama).
  - `bg-popover` (dropdown/popover).
  - `bg-primary/10` (item aktif/highlight).
  - `bg-destructive/10` (baris error).

### Efek Shadow
- `shadow-2xs` (inner panel, metric card, mini action bar).
- `shadow-xs` (card standar, dropdown, sidebar tip, popover).
- `shadow-sm` (interactive hover state).
- `shadow-lg` (dialog modal).
- Satu bayangan per permukaan. Tidak ada nested shadow. Semi-transparent border meningkatkan kejelasan tepi — kombinasi border + shadow dianjurkan.

### Fokus & Status
- **Focus Ring Instan** (wajib di setiap elemen interaktif):
  ```tsx
  className="focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring"
  ```
  Gunakan `:focus-visible`, bukan `:focus`, agar pointer user tidak terganggu. Tambahkan `:focus-within` untuk grup kontrol (mis. input + tombol lampiran).
- **Disabled** (tiga kanal):
  ```tsx
  className="disabled:opacity-50 disabled:cursor-not-allowed"
  // + attribute: disabled={...}
  ```
- **Aria-invalid** untuk error state input:
  ```tsx
  className="aria-invalid:border-destructive aria-invalid:ring-destructive/20"
  ```

### Motion
- **Transisi Spesifik**:
  ```tsx
  // ✅ Benar
  className="transition-[color,background-color,border-color,box-shadow,transform]"
  // ❌ Salah
  className="transition-all"
  ```
- **Compositor-friendly**: Prioritaskan `transform` dan `opacity`. Hindari animasi `width`/`height`/`top`/`left`.
- **Durasi standar**: `duration-150` untuk toggle state, `duration-200` untuk hover/focus, `duration-300` untuk panel/card.
- **Easing**: `ease-[cubic-bezier(0.32,0.72,0,1)]` (pegas Syntrix) untuk transisi fisika, `ease-out` untuk masuk, `ease-in` untuk keluar.
- **Reduced Motion** (wajib):
  ```tsx
  className="motion-reduce:transform-none motion-reduce:animate-none"
  ```
  `globals.css` sudah punya media query global untuk `prefers-reduced-motion`.
- **Loop dekoratif**: Dilarang loop ambient >5 detik tanpa tombol pause. Loop hanya untuk loader/spinner.
- **Never `transition: all`**: Selalu daftar properti yang dianimasikan.

---

## 3. Komponen & Pola Visual Utama

### A. Pola Card Standar (Single-Level)
```tsx
className="rounded-2xl border border-border/60 bg-card shadow-xs"
```
**Interactive card hover:**
```tsx
className="rounded-2xl border border-border/60 bg-card shadow-xs transition-[color,background-color,border-color,box-shadow,transform] duration-200 hover:border-primary/45 hover:bg-muted/15 focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none"
```
**Dilarang:** Membungkus Card di dalam Card (double-bezel). Untuk hierarki, gunakan langkah warna (`bg-muted/10` wrapper, `bg-card` item).

### B. Pola Tombol & Fisika Interaktif
- **Primary Button**:
  ```tsx
  className="h-10 rounded-full transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none"
  ```
- **Ghost Button**:
  ```tsx
  className="h-10 rounded-full text-muted-foreground transition-[color,background-color] duration-200 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none"
  ```
- **Micro Action Button** (pill inline):
  ```tsx
  className="h-5 rounded-full px-2 text-xs font-medium transition-[color,background-color] duration-200 focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
  ```
- **Sidebar Nav Item**:
  ```tsx
  className="h-9 rounded-lg px-2.5 text-sm transition-colors duration-200 ease-out hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring/50 data-[active=true]:bg-primary/10 data-[active=true]:font-medium data-[active=true]:text-primary"
  ```
- **Global Button Physics** (`app/globals.css`): seluruh tombol mendapat `translate-y-px` saat aktif.
- **Loading Button**: tampilkan spinner + **pertahankan label asli**. Jangan ganti label menjadi "Loading". Tambahkan `disabled` selama in-flight.
- **Minimum loading duration**: tampilkan spinner minimal 300 ms untuk menghindari flicker pada respons cepat.

### C. Layout Responsif & Efisiensi Ruang (Zero Dead Space)
- **No Unnecessary Max-Width**: Dilarang memasang `max-w-4xl` / `max-w-5xl` pada halaman utama jika menyebabkan dead space di desktop.
- **Adaptive Multi-Column Grid**: gunakan `grid-cols-1 lg:grid-cols-12` untuk membagi panel ringkasan dan panel utama.
- **Dense Data Grid**: field form dan metadata dalam sub-grid responsif (`sm:grid-cols-2 xl:grid-cols-3`).
- **Container tunggal, centered, capped**: maksimal `max-w-[1440px]` di level aplikasi. Pada 1920px, gutter membesar — grid tetap.
- **Safe areas**: di mobile, gunakan variabel `env(safe-area-inset-*)`.

---

## 4. Tipografi & Tampilan Data

### Label & Kategori
Gunakan **sentence case**. **Tanpa `uppercase` dan tanpa `tracking-*`** untuk teks fungsional:
```tsx
// ✅ Benar
<span className="text-sm font-medium text-muted-foreground">Ops console</span>
<span className="font-mono text-sm tabular-nums text-muted-foreground">01</span>

// ❌ Salah
<span className="font-mono text-[9px] uppercase tracking-[0.12em]">SECURE</span>
```

### Wordmark & Branding
Hanya wordmark (nama produk/brand) yang boleh `uppercase` atau tracking lebar. Contoh legal: `SYNTRIX`.

### Angka Tabular (Tabular Numbers)
Setiap metrik numerik, ID terformat, koordinat, persentase, tanggal, atau statistik:
```tsx
className="font-mono tabular-nums font-semibold"
```
`tabular-nums` aktif global pada `table` dan `[data-slot=table]`.

### Kapan Mono Digunakan
`font-mono` hanya untuk: (a) angka/angka moneter, (b) kode/identifier teknis (commit hash, request ID, path), (c) jam/tanggal pada baris data. **Bukan** untuk label dekoratif.

### Unit & Simbol
- Gunakan **non-breaking space** antara angka dan unit: `10&nbsp;MB`, `⌘&nbsp;K`.
- Ellipsis karakter `…` bukan tiga titik `...`.
- Curly quotes `“ ”` bukan straight quotes.
- Angka pakai numeral, bukan kata: "8 deployments", bukan "eight deployments".

---

## 5. Interaksi & State

### Loading
- **Skeleton mirrors final content** untuk menghindari layout shift.
- Tambahkan **delay ~150–300 ms** sebelum menampilkan spinner; minimum visible time ~300–500 ms.
- Untuk data table/list, tampilkan skeleton yang bentuknya sama dengan baris data.
- Tombol loading: spinner + **label asli tetap tampil**, `disabled` selama in-flight.

### Empty & Error States
- Setiap list/table wajib punya state kosong dengan satu CTA yang mengisi data.
- Error inline di dekat field; setelah submit, **fokus ke error pertama**.
- Pesan error menjelaskan **cara memperbaiki**, bukan hanya menyatakan gagal.

### Optimistic Update
- Untuk aksi tulis (approve, reject, toggle status), perbarui UI segera; rekonsiliasi saat respons server.
- Pada gagal, tampilkan error dan **rollback atau sediakan Undo**.

### Konfirmasi Destruktif
- Aksi delete/permanen wajib konfirmasi dialog **atau** sediakan Undo dengan window aman.

### URL sebagai State
- Filter, tab, pagination, panel terbuka → tercermin di URL (mis. `?region=jabar&tab=odp&page=2`).
- Share, refresh, dan Back/Forward harus bekerja.

### Form
- Setiap kontrol punya `<label>` terasosiasi.
- `autocomplete` dan `name` bermakna untuk autofill.
- `type` dan `inputMode` sesuai (email, numeric, tel, url).
- Placeholder berakhir dengan `…` dan menunjukkan contoh nilai.
- Jangan blok paste di `<input>` / `<textarea>`.
- Jangan pre-disable tombol submit; biarkan submit untuk memunculkan validasi.
- `spellcheck={false}` untuk email, kode, username.
- Enter pada satu kontrol submit; pada form multi-kontrol, Enter pada kontrol terakhir yang submit.
- Textarea: `⌘/Ctrl+Enter` submit, Enter menambah baris baru.

### Tooltip
- Inline help lebih diutamakan; tooltip hanya sebagai pilihan terakhir.
- Delay hover pertama dalam grup; peer berikutnya tanpa delay.

### Link & Navigasi
- Gunakan `<a>` / `<Link>` untuk navigasi agar Cmd/Ctrl+Click dan middle-click bekerja. Jangan `<button>` / `<div>`.
- Tambahkan `scroll-margin-top` pada heading untuk deep-link.
- `prefetch` untuk link internal Next.js pada viewport.

### Deep-link Everything
- Setiap `useState` yang mengubah tampilan signifikan (tab, filter, expand) → tercermin di URL.

### Aksesibilitas
- Ikon-only button wajib `aria-label` deskriptif.
- `aria-hidden="true"` untuk dekorasi.
- Semantik native (`button`, `a`, `label`, `table`) sebelum `aria-*`.
- Hierarki heading `<h1>`–`<h6>` tanpa lompat.
- Skip link "Lewati ke konten".
- `lang="id"` di `<html>`; konten brand dibungkus `translate="no"`.
- Kontras: APCA Lc 60 untuk teks body; 3:1 untuk ikon/ring/border.
- Jangan bergantung pada warna saja — sediakan label teks untuk status.

### Locale-aware
- Format tanggal, waktu, angka, mata uang mengikuti locale aktif (`Intl.DateTimeFormat`, `Intl.NumberFormat`).
- Shortcut keyboard menghormati layout non-QWERTY.

---

## 6. Interaksi Keyboard & Input

- **Keyboard bekerja di mana-mana.** Semua alur bisa dioperasikan via keyboard mengikuti WAI-ARIA Patterns.
- **Focus management**: dialog, drawer, combobox memakai focus trap + return focus saat ditutup.
- **Hit target**: kontrol < 24px diperluas ke ≥ 24px; mobile minimal 44px.
- **Input mobile size**: `<input>` font size ≥ 16px di mobile untuk mencegah iOS auto-zoom. Atau set `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />`.
- **Hydration-safe inputs**: input tidak kehilangan fokus atau nilai setelah hydration.
- **Jangan blok paste** di input apa pun.
- **Ellipsis untuk state loading**: "Menyimpan…", "Memproses…", "Menghasilkan…".
- **Prevent double-tap zoom**: `touch-action: manipulation` di kontrol.
- **Tap highlight** mengikuti design: `webkit-tap-highlight-color`.
- **Overscroll behavior**: `overscroll-behavior: contain` di modal/drawer.
- **Scroll position persist** saat Back/Forward.
- **Autofocus**: desktop dengan satu input utama boleh autofocus. Mobile: hindari karena menyebabkan layout shift.
- **Tidak ada dead zone**: jika terlihat interaktif, harusnya interaktif.
- **Gestur punya alternatif**: setiap drag/swipe/pinch juga berfungsi via tap/click + keyboard.

---

## 7. Animasi

- **Hormati `prefers-reduced-motion`** — wajib punya varian reduced-motion.
- **Implementasi**: CSS > Web Animations API > library JS (mis. motion). Hindari animasi main-thread JS bila bisa.
- **Compositor-friendly**: prioritas `transform`, `opacity`. Hindari properti yang memicu reflow/repaint.
- **Necessity check**: animasi hanya bila memperjelas sebab-akibat atau menambah delight yang disengaja.
- **Easing sesuai subjek**: pilih easing berdasarkan apa yang berubah (ukuran, jarak, trigger).
- **Interruptible**: animasi bisa dibatalkan oleh input pengguna.
- **Input-driven**: hindari autoplay kecuali muted non-esensial. Motion >5 detik punya kontrol pause/stop/hide.
- **Correct transform origin**: jangkar gerakan ke tempat "fisik" dimulai.
- **Cross-browser SVG transforms**: terapkan transformasi CSS pada pembungkus `<g>` dan set `transform-box: fill-box; transform-origin: center;`.

---

## 8. Performa

- **Device/browser matrix**: uji iOS Low Power Mode & macOS Safari.
- **Ukur dengan andal**: matikan ekstensi yang menambah overhead.
- **Lacak re-render**: minimalkan & percepat. Gunakan React DevTools atau React Scan.
- **Minimalkan kerja layout**: batch read/write; hindari reflow/repaint.
- **Budget latensi**: POST/PATCH/DELETE selesai < 500 ms.
- **Biaya keystroke**: pilih uncontrolled inputs; controlled loop harus murah.
- **Daftar besar**: virtualisasi (mis. `virtua`) atau `content-visibility: auto`.
- **Preload cerdas**: preload hanya gambar above-the-fold; lazy-load sisanya.
- **Tanpa CLS karena gambar**: set dimensi eksplisit & cadangkan ruang.
- **Preconnect ke origin** untuk aset/CDN.
- **Preload font** untuk teks kritis.
- **Subset font**: kirim hanya glyph yang dipakai.
- **Jangan pakai main thread untuk kerja berat**: pindahkan ke Web Workers.
- **Video > animated GIF**: `<video autoplay muted loop playsinline>` untuk loop animasi.
- **Safari video-as-image**: untuk loop non-esensial, tambahkan sumber MP4 ke `<picture>`, gate dengan `prefers-reduced-motion`.

---

## 9. QA Visual Pre-flight Checklist

Sebelum menyerahkan pekerjaan revisi visual:

1. **Tidak Ada Flash Light Mode**: Tema tersinkron sebelum hydration.
2. **Tidak Ada Double-Bezel**: Tidak ada Card di dalam Card.
3. **Tidak Ada `transition-all`**: Cari dengan `grep -rn "transition-all" app/ components/`. Semua properti spesifik.
4. **Tidak Ada Micro-Badge Uppercase-Tracked**: Cari `uppercase tracking-`. Hanya wordmark yang boleh.
5. **Focus Ring Instan**: Setiap `<button>`, `<a>`, `<input>`, `<select>`, `<textarea>` punya `focus-visible:ring-*`.
6. **Disabled Tiga Kanal**: `opacity-50` + `cursor-not-allowed` + atribut `disabled`.
7. **Reduced Motion**: Setiap `transform` atau `animate-*` punya `motion-reduce:*`.
8. **Scrollbar Standard**: Radix `<ScrollArea>` dengan rail `bg-transparent`, thumb `bg-border/60 hover:bg-muted-foreground/50 rounded-full`.
9. **Pemanfaatan Ruang & Grid (Zero Dead Space)**: Kontainer `w-full`, `lg:grid-cols-12` / `xl:grid-cols-3`, tanpa area kosong di layar lebar.
10. **URL sebagai State**: Filter, tab, pagination di URL.
11. **Loading State Lengkap**: Skeleton yang mirror konten akhir, delay 150–300 ms, minimum visible 300–500 ms.
12. **Empty & Error State**: Setiap list punya empty state dengan CTA; error inline dekat field.
13. **Aksesibilitas**: Ikon-only button ada `aria-label`; dekorasi `aria-hidden`; heading hierarki; skip link.
14. **Locale-aware**: Format tanggal/waktu/angka via `Intl`.
15. **Unit & Simbol**: Non-breaking space antara angka & unit; ellipsis `…`; curly quotes.
16. **Validasi Build**: `npx tsc --noEmit` dan `npm run check:consistency` lulus.

### Audit dengan Alat Eksternal (Opsional)

```bash
# Hallmark sloplint — auditor generik anti-slop
node ~/.claude/skills/hallmark/scripts/sloplint.mjs <file-or-dir> --genre modern-minimal
```

Sloplint dirancang untuk landing page. Gunakan sebagai **sinyal tambahan**, bukan standar wajib. Jika ada temuan yang jelas bertentangan dengan identitas Vanguard Syntrix (mis. micro-badge), dokumentasikan alasan di komentar `/* Vanguard: <gate> · alasan */` di file terkait.
