# Syntrix Frontend Update Log

## Version

- App: Syntrix Frontend
- Version: 0.1.0
- Platform focus: Web admin, adminregion, validator redirect, dan asset management
- Update date: 25 Mei 2026

## Ringkasan

Update versi ini mematangkan Syntrix Frontend sebagai pusat administrasi asset, user, dashboard role, approval, dan data management. Web tetap menjadi tempat admin dan adminregion bekerja, sementara flow validasi lapangan validator diarahkan ke Syntrix-One.

## Perubahan Utama

- Mendesain ulang login page dengan tampilan Syntrix yang lebih modern dan konsisten.
- Menambahkan dialog proses login dan logout dengan background blur.
- Mengosongkan default email pada halaman login.
- Menyesuaikan metadata dan layout global aplikasi.
- Menyesuaikan tema light dan dark mode di `globals.css` agar lebih kontras dan konsisten dengan shadcn UI.
- Membuat smart tips sebagai komponen terpisah dengan motion dan konten yang berubah sesuai halaman.
- Mendesain ulang dashboard role dengan fokus region, POP, device, dan KPI pendukung.
- Menghapus tab region untuk role adminregion.
- Mendesain ulang dashboard validator agar lebih berguna untuk konteks POP dan region.
- Mengubah menu maps untuk role terkait menjadi coming soon page.
- Memastikan layout utama dan view mobile lebih responsive.

## Account Management

- Superadmin dapat membuat akun superadmin.
- Form create account memakai redirect verification URL produksi.
- Error redirect verification ditampilkan lewat dialog response.
- Role option disesuaikan untuk kebutuhan superadmin, adminregion, dan validator.
- Link verifikasi email diarahkan ke domain produksi jika environment sudah benar.

## Data Management

- Form create customer disesuaikan dengan field operasional terbaru.
- Customer Number ditampilkan sebagai CID.
- CID divalidasi number only, tepat 8 digit.
- Service Type dibuat sebagai combobox dan terintegrasi dengan master data.
- Customer memiliki field POP, region, status, installation date, address, province, city/kabupaten, longitude, dan latitude.
- Form create customer memakai dialog response untuk sukses dan gagal.
- Form create ONT menghapus total port dan used port.
- ONT dapat memiliki customer reference optional.
- Customer reference pada ONT difilter sesuai POP yang dipilih.
- Saat customer reference dipilih, field POP, address, province, city, longitude, dan latitude dapat terisi otomatis.
- Auto fill diberi penjelasan agar user tidak bingung.
- Device list memiliki filter POP untuk kategori device yang relevan.
- Pole, customer, route, dan project ikut memiliki filter POP.
- Filter dibuat lebih aman untuk kategori device dinamis yang ditambahkan nanti.

## ODP dan Validasi

- Detail ODP dapat edit POP untuk role yang berhak.
- Detail ODP menampilkan installation date.
- Form create ODP memakai dialog interaktif jika required field belum terisi.
- Field validasi customer dan ONT difilter sesuai POP terkait.
- Jika port dipilih idle, field customer dan ONT otomatis dikosongkan.
- Jika customer atau ONT dipilih di form validasi, data terkait dapat auto fill sesuai relasi POP.
- Redaman pada form validasi tidak lagi wajib diisi.
- Nama ODP lama dan nama ODP baru dipisahkan secara logika: ODP lama read-only, ODP baru optional.

## Notification dan Workflow

- Integrasi FCM backend disiapkan agar event dari web dapat menghasilkan push notification ke Syntrix-One.
- Adminregion create device yang melewati approval superadmin dapat menghasilkan task validasi untuk validator region terkait.
- Superadmin create device langsung dapat menghasilkan notifikasi task validasi ke validator region device.
- Notifikasi dikirim berdasarkan region terkait, bukan global.
- Notifikasi menampilkan nama device jika tersedia.
- Device CUSTOMER dan ONT dikecualikan dari notifikasi task validasi.
- Broadcast Announcement / Event Notification sudah disiapkan dalam dokumen rencana terpisah.

## UI dan Komponen

- ResponseDialog dibuat reusable dan diterapkan ke halaman yang membutuhkan response sukses atau gagal.
- Smart tip dipisahkan sebagai komponen.
- Scroll to top mobile ditambahkan untuk halaman panjang.
- Top-level dashboard dan form mengikuti pola komponen shadcn UI.
- Tab, combobox, dialog, card, dan form field dibuat lebih konsisten.

## Checklist Uji

- [ ] Login web berhasil untuk role admin dan adminregion.
- [ ] Validator web diarahkan sesuai kebijakan akses Syntrix-One.
- [ ] Create account superadmin berhasil.
- [ ] Email verification redirect memakai domain produksi.
- [ ] Create customer berhasil dengan CID 8 digit.
- [ ] Service type customer mengambil data master.
- [ ] Create ODP menampilkan dialog jika required field belum lengkap.
- [ ] Detail ODP menampilkan installation date.
- [ ] Filter POP berjalan di list device terkait.
- [ ] Create device dari superadmin memicu notifikasi validator region terkait.
- [ ] Device CUSTOMER dan ONT tidak memicu notifikasi validasi.
- [ ] Dashboard role tetap responsive di mobile dan desktop.

