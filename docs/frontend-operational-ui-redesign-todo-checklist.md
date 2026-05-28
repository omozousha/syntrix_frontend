# Frontend Operational UI Redesign Todo Checklist

## Tujuan

Merapihkan pengalaman Syntrix Frontend setelah refresh header dan sidebar agar seluruh area kerja terasa konsisten, compact, mudah discan, dan cocok untuk operasional superadmin, adminregion, validator redirect, director, dan owner.

Redesign ini fokus pada tampilan dan alur kerja frontend. Backend hanya disentuh jika UI membutuhkan data yang belum tersedia atau butuh aggregate/status baru.

## Prinsip Desain

- Pertahankan URL, primary nav label, form field name, logo, dan legal copy.
- Gunakan pola komponen shadcn UI yang sudah ada.
- Buat layout lebih compact tanpa mengurangi keterbacaan.
- Prioritaskan informasi operasional: status, region, POP, device name, validation status, last update, dan action berikutnya.
- Hindari card terlalu besar untuk data yang seharusnya bisa discan cepat.
- Semua table/list harus punya loading, empty, error, search, filter, dan status badge yang konsisten.
- Mobile dan desktop harus sama-sama usable.

## Scope Redesign

1. Asset Overview / Dashboard Cards
2. Data Management List
3. Detail Device / Detail ODP
4. Approval / Request Inbox
5. Account Management
6. Notification Center
7. Empty / Error / Loading State Global

## Todo Implementasi

### 1. Asset Overview / Dashboard Cards

- [x] Audit current summary card, region card, tab overview, dan data quality section.
- [x] Kecilkan ukuran KPI card agar lebih padat dan seimbang.
- [x] Pisahkan KPI utama dan data pendukung.
- [x] Gunakan label yang lebih operasional seperti `Total Asset`, `POP`, `Need Validation`, `Ongoing`, `Valid`, dan `Last Update`.
- [x] Tampilkan last update dengan format yang konsisten.
- [x] Pastikan dashboard superadmin tetap bisa melihat semua region.
- [x] Pastikan dashboard adminregion tetap fokus pada region terkait.
- [x] Review apakah chart diperlukan untuk trend validasi tanpa membebani halaman.
- [x] Tambahkan empty state jika region atau data asset belum tersedia.

### 2. Data Management List

- [x] Audit list untuk ODP, ODC, OLT, ONT, customer, POP, pole, route, dan project.
- [x] Samakan pola header list: title, description singkat, primary action, search, filter, dan status.
- [x] Buat filter bar yang compact dan konsisten.
- [x] Pastikan filter POP tetap tersedia untuk kategori yang relevan.
- [x] Pastikan search tidak membuat layout berubah.
- [x] Rapihkan badge status device dan validation status.
- [x] Buat table/list mobile yang readable.
- [x] Tambahkan empty state saat filter tidak menemukan data.
- [x] Tambahkan error state saat request gagal.
- [x] Pastikan device category dinamis tetap aman saat kategori baru ditambahkan.

### 3. Detail Device / Detail ODP

- [x] Audit detail ODP dan detail kategori device lain.
- [x] Buat top summary lebih ringkas: device name, inventory ID, type, region, POP, validation status.
- [x] Tampilkan installation date jika tersedia.
- [x] Rapihkan section lokasi: address, province/city jika ada, longitude, latitude.
- [x] Rapihkan section capacity dan network.
- [x] Untuk ODP, desain ulang port grid agar responsive dan mudah dibaca.
- [x] Jika port used, tampilkan CID customer.
- [x] Pastikan hasil validasi validator tidak mengubah detail ODP/device sebelum approval final superadmin.
- [x] Pisahkan evidence validasi pending dari gallery image attachment resmi device.
- [x] Pastikan ODP Operations hanya memakai snapshot port dari validasi final/approved.
- [x] Pastikan QR download tetap memakai format label yang sudah disepakati.
- [x] Pastikan tombol reminder validasi tetap role-aware dan region-aware.
- [x] Gallery/historical validation tetap ringan dan tidak memuat gambar berlebihan.
- [x] Pastikan history menampilkan validator name jika tersedia.

### 4. Approval / Request Inbox

- [x] Audit request list untuk adminregion dan superadmin.
- [x] Buat status visual yang jelas untuk `pending`, `ongoing`, `approved`, `rejected`, dan `needs revision`.
- [x] Tampilkan actor terakhir dan waktu perubahan terakhir.
- [x] Pisahkan request yang butuh action user saat ini dari history.
- [x] Rapihkan detail request agar before/after data mudah dibandingkan.
- [x] Field validation membandingkan data asset existing/current dengan hasil validator, bukan snapshot usulan yang sama.
- [x] Tampilkan Nama ODP Lama dan Nama ODP Baru di pembanding validasi.
- [x] Pastikan CTA approve/reject/resubmit jelas dan tidak saling bersaing.
- [x] Tambahkan response dialog yang konsisten untuk sukses, gagal, dan validation error.
- [x] Pastikan audit trail wording tetap human-readable.

### 5. Account Management

- [x] Audit account list dan create account form.
- [x] Rapihkan role badge, region badge, email verification status, dan active status.
- [x] Pastikan superadmin bisa membuat superadmin, adminregion, dan validator sesuai aturan.
- [x] Buat filter role dan region lebih compact.
- [x] Tampilkan status email verification dengan jelas.
- [x] Pastikan error redirect verification tetap memakai ResponseDialog.
- [x] Rapihkan action account seperti disable, reset password, atau resend verification jika tersedia.
- [x] Pastikan data sensitif tidak tampil berlebihan.

### 6. Notification Center

- [x] Audit notification inbox web dan pola push notification yang terhubung ke Syntrix-One.
- [x] Buat grouping unread/read.
- [x] Tambahkan badge berdasarkan notification type.
- [x] Tampilkan region, device name, request status, dan waktu.
- [x] Pastikan reminder validasi menampilkan nama device, bukan device ID mentah.
- [x] Pastikan CUSTOMER dan ONT tetap dikecualikan dari notification task validasi.
- [x] Buat empty state saat belum ada notifikasi.
- [x] Buat action mark as read atau archive jika endpoint sudah tersedia.
- [x] Siapkan ruang UI untuk Broadcast Announcement / Event Notification.

### 7. Empty / Error / Loading State Global

- [x] Inventaris semua halaman yang masih blank saat loading atau error.
- [x] Buat reusable loading state untuk page, card, table, dan form.
- [x] Buat reusable empty state untuk data kosong.
- [x] Buat reusable error state untuk request gagal.
- [x] Pastikan semua state memakai bahasa yang konsisten.
- [x] Pastikan state tidak membuat layout shift besar.
- [x] Pastikan retry action tersedia untuk error request yang bisa diulang.
- [x] Pastikan loading state tidak memakai animasi berat.

## Checklist Teknis

- [x] Tidak mengubah URL structure.
- [x] Tidak mengubah primary nav label tanpa approval.
- [x] Tidak mengubah form field name tanpa approval.
- [x] Tidak mengubah logo treatment tanpa approval.
- [x] Tidak mengubah legal copy tanpa approval.
- [x] Tidak menambah endpoint backend kecuali benar-benar dibutuhkan.
- [x] Tidak mengubah payload API yang sudah berjalan.
- [x] Semua komponen baru mengikuti pattern existing shadcn UI.
- [x] Tidak ada nested card yang tidak perlu.
- [x] Tidak ada text overlap di viewport mobile.
- [x] Tidak ada global scroll lock.
- [x] Tidak ada layout shift besar saat loading.

## Urutan Eksekusi Disarankan

1. Asset Overview / Dashboard Cards.
2. Data Management List.
3. Detail Device / Detail ODP.
4. Approval / Request Inbox.
5. Account Management.
6. Notification Center.
7. Empty / Error / Loading State Global pass.

## Kriteria Selesai

- [x] `npm run lint` berhasil.
- [x] `npm run build` berhasil.
- [x] `git diff --check` berhasil.
- [x] Dashboard, data management, detail ODP, request inbox, account management, dan notification center sudah dicek manual.
- [x] Role superadmin dan adminregion tetap mendapatkan akses yang sesuai.
- [x] Validator web tetap mengikuti kebijakan redirect ke Syntrix-One.
- [x] Backend tetap clean jika tidak ada perubahan API.
