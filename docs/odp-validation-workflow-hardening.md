# ODP Validation Workflow Hardening

Dokumen ini merangkum penguatan lanjutan untuk workflow validasi ODP. Fokusnya adalah membuat proses validator, adminregion, dan superadmin lebih jelas, terukur, dan siap dipakai sebagai dasar aplikasi mobile validator.

## Tujuan

- Membuat lifecycle validasi ODP mudah dipahami di list, detail, request queue, dan notifikasi.
- Menstandarkan checklist dan evidence agar hasil validasi lapangan konsisten.
- Memastikan reject dan resubmit punya alur yang jelas tanpa membuat request ganda yang membingungkan.
- Membuat ODP Quality menjadi work queue operasional untuk validator dan adminregion.
- Menjaga data asset final tetap masuk hanya setelah approval sesuai role.

## Kondisi Saat Ini

- Role utama sudah berjalan: superadmin, adminregion, dan validator.
- Validator fokus pada ODP field workflow.
- Adminregion review hasil validator untuk region terkait.
- Superadmin melakukan approval final sebelum data masuk asset overview sebagai data valid.
- Evidence sudah mendukung thumbnail, preview, download, dan tampil di detail ODP.
- Request page sudah mendukung queue per role dan approve/reject.
- Detail ODP sudah memiliki informasi teknis, port, QR, histori validasi, attachment, dan status validasi.
- Trash, audit trail, dan request approval sudah mulai terhubung dengan flow create/update/delete.

## Gap Penting

### 1. Lifecycle ODP Belum Cukup Eksplisit

Status validasi sudah ada, tetapi perlu ditampilkan sebagai tahapan yang mudah dibaca oleh semua role.

Status yang disarankan:

- `Unvalidated`: ODP belum pernah divalidasi atau belum punya hasil final.
- `Draft Field Validation`: validator sedang mengisi form, belum submit.
- `Submitted by Validator`: validator sudah submit, menunggu review adminregion.
- `Rejected by Adminregion`: adminregion mengembalikan ke validator dengan note.
- `Pending Superadmin`: adminregion sudah approve, menunggu superadmin.
- `Rejected by Superadmin`: superadmin mengembalikan ke adminregion dengan note.
- `Validated`: superadmin approve final dan data menjadi asset valid.

Tampilan yang diperlukan:

- Badge status di list ODP.
- Timeline status di detail ODP.
- Status ringkas di request card.
- Notifikasi role tujuan saat status berubah.

### 2. Checklist Validasi Perlu Template Resmi

Checklist validasi perlu distandarkan agar validator tidak mengisi bebas tanpa acuan.

Checklist minimal yang disarankan:

- Fisik box ODP terlihat baik.
- Label ODP sesuai data sistem.
- QR code terpasang dan bisa discan.
- Koordinat lokasi sudah sesuai.
- Total port aktual sesuai data.
- Splitter ratio sesuai kondisi lapangan.
- Port/splitter terlihat jelas pada evidence.
- Kabel distribusi atau input ODP teridentifikasi.
- Kondisi sekitar lokasi dapat dikenali.
- Catatan temuan diisi jika ada perbedaan data.

Template form validasi ODP yang dibakukan:

- Tanggal Validasi.
- ID Inventory.
- Nama ODP Lama.
- Nama ODP Baru.
- POP.
- Alamat.
- Longitude.
- Latitude.
- Pemeriksaan awal:
  - Foto keseluruhan ODP sebelum pemeriksaan jarak dekat.
  - Foto keseluruhan ODP sebelum pemeriksaan jarak jauh dengan tiang.
  - Foto bagian dalam ODP sebelum pemeriksaan close up.
  - Foto tampak kanan dan kiri.
- Checklist kondisi:
  - Box ODP: Baik/Rusak/Keterangan + foto.
  - Label ODP: Baik/Rusak/Keterangan + foto.
  - Kebersihan ODP: Bersih/Kotor/Keterangan + foto.
  - Pigtail dan Adapter: Lengkap/Tidak lengkap/Keterangan + foto.
  - Kerapihan Kabel: Rapi/Tidak rapi/Keterangan + foto.
- Kapasitas dan okupansi port:
  - Tipe ODP dari master data: ODP PB, ODP CA, ODP US.
  - Jenis instalasi dari master data: Aerial, Pedestrial.
  - Kapasitas ODP dari master data Splitter Profiles.
  - Kapasitas splitter dari master data Splitter Profiles.
  - Jumlah port aktif.
  - Jumlah port kosong.
  - Jumlah port rusak.
- Port ODP:
  - Status port dan redaman per port mengikuti kapasitas ODP aktual, misalnya 8 atau 16 port.

Keputusan implementasi:

- Validator boleh mengusulkan perubahan nama ODP, tipe ODP, jenis instalasi, splitter ratio, kapasitas ODP, status port, dan redaman per port sesuai kondisi lapangan.
- Validator mengisi pemeriksaan awal dan checklist kondisi ODP sebagai snapshot request validasi, termasuk lampiran foto per item.
- Perubahan tersebut masuk ke snapshot request validasi, bukan langsung menulis ke asset utama.
- Setelah approval final superadmin, sistem menerapkan field asset utama yang relevan: nama ODP, tipe ODP, jenis instalasi, splitter ratio, total port, used port, dan status port.
- Redaman per port disimpan sebagai snapshot validasi terlebih dahulu sampai model database redaman final diputuskan.

Aturan checklist:

- Checklist disimpan sebagai snapshot pada request validasi.
- Checklist lama tetap bisa dilihat di histori.
- Checklist request baru tidak otomatis membawa temuan lama sebagai nilai aktif.
- Temuan validasi terakhir boleh tampil sebagai referensi read-only.
- Form validasi aktif menggunakan checklist kondisi format baru; checklist lama hanya menjadi ringkasan turunan untuk kompatibilitas API.
- Semua foto pemeriksaan awal, kondisi per item, dan keterangan wajib diisi sebelum submit; item bermasalah wajib memiliki keterangan.

### 3. Evidence Requirement Perlu Diperketat

Evidence validasi ODP sebaiknya memiliki kategori agar adminregion dan superadmin tahu foto mana yang sedang dicek.

Kategori evidence yang disarankan:

- Tampak depan ODP.
- Label atau QR ODP.
- Port atau splitter ODP.
- Kondisi kabel/input ODP.
- Lokasi sekitar atau bukti koordinat.
- Evidence tambahan.

Aturan evidence:

- Submit validasi minimal membutuhkan 3 evidence wajib: depan ODP, label/QR, port/splitter.
- Evidence request aktif harus hanya evidence submit terakhir, bukan evidence lama.
- Evidence lama tetap tampil di histori validasi.
- Preview dan download tersedia di detail ODP, histori, dan request review.

### 4. Before/After Validasi Perlu Ringkas

Adminregion dan superadmin perlu melihat perubahan aktual tanpa membaca semua field mentah.

Informasi review yang disarankan:

- Field yang berubah saja.
- Nilai sebelum dan sesudah.
- Checklist hasil submit.
- Evidence hasil submit.
- Note validator.
- Note reject sebelumnya jika request adalah resubmit.

Contoh tampilan:

| Field | Sebelum | Sesudah |
| --- | --- | --- |
| Latitude | -8.145000 | -8.145454 |
| Longitude | 108.450000 | 108.454522 |
| Splitter Ratio | - | 1:8 |
| Total Port | 0 | 8 |

### 5. Resubmit Setelah Reject Perlu Jelas

Reject harus menghasilkan alur revisi, bukan membuat user bingung apakah harus submit request baru.

Alur yang disarankan:

- Adminregion reject: status menjadi `Rejected by Adminregion`, note wajib, kembali ke validator.
- Validator buka ODP, melihat banner reject note.
- Form validasi mulai dari data asset terakhir, bukan dari temuan lama.
- Temuan/evidence terakhir tampil sebagai referensi.
- Validator submit ulang sebagai revisi.
- Superadmin reject: status menjadi `Rejected by Superadmin`, note wajib, kembali ke adminregion.
- Adminregion bisa review ulang, minta validator revisi, atau resubmit ke superadmin setelah perbaikan.

### 6. ODP Quality Harus Jadi Work Queue

ODP Quality sebaiknya bukan hanya laporan, tetapi daftar kerja harian.

Queue yang disarankan:

- ODP belum punya port.
- ODP belum tervalidasi.
- ODP pending adminregion.
- ODP pending superadmin.
- ODP rejected by adminregion.
- ODP rejected by superadmin.
- ODP evidence kurang.
- Port used tanpa customer/ONT.
- Port assigned tapi status belum used.
- Port down/maintenance.

Setiap item queue harus punya aksi cepat:

- Open ODP detail.
- Open field validation.
- Open request aktif.
- Open evidence/histori.

### 7. Mobile Validator UX Perlu Dipadatkan

Karena validator akan diarahkan ke aplikasi Android/mobile, halaman web validator perlu meniru pola mobile-first.

Perbaikan yang disarankan:

- Header status ODP sticky di atas.
- Tombol submit sticky di bawah pada mobile.
- Evidence uploader dibuat per kategori.
- Port list dibuat card ringkas dengan filter status.
- Checklist dibuat segmented atau checkbox besar.
- Reject note tampil sebagai alert di atas form.
- Histori validasi tampil sebagai collapsible.

### 8. Audit Trail Perlu Lebih Manusiawi

Audit trail saat ini perlu tetap sinkron, tetapi tampilannya harus mudah dibaca.

Format narasi yang disarankan:

- `Validator Jabar submit validasi ODP bali-odp-0905`
- `Adminregion Bali reject validasi ODP bali-odp-0905`
- `Superadmin approve validasi ODP bali-odp-0905`
- `Evidence validasi ditambahkan: 4 file`
- `Status ODP berubah dari pending_async ke validated`

## Rekomendasi Phase Implementasi

### Phase 1 - Status & Lifecycle Display

Tujuan: semua role langsung tahu posisi ODP dalam workflow.

- Tambahkan mapping label/status ODP yang konsisten.
- Tampilkan badge status di list ODP.
- Tampilkan timeline status di detail ODP.
- Tampilkan status dan role penanggung jawab di request card.
- Tampilkan reject note terakhir di detail ODP.
- Pastikan status list dan detail refresh setelah approve/reject/submit.

### Phase 2 - Checklist & Evidence Standard

Tujuan: hasil validasi lapangan konsisten dan bisa direview cepat.

- Definisikan checklist template ODP.
- Tambahkan kategori evidence.
- Terapkan minimal evidence sebelum submit.
- Pisahkan evidence aktif request dengan evidence histori.
- Tampilkan checklist dan evidence dalam review adminregion/superadmin.
- Tampilkan detail validasi terakhir sebagai referensi read-only.

### Phase 3 - Resubmit Workflow

Tujuan: reject tidak memutus alur kerja dan tidak membuat request ganda membingungkan.

- Tampilkan banner reject note untuk validator/adminregion.
- Tambahkan action `Resubmit` untuk request yang ditolak.
- Pastikan form memakai data asset terakhir sebagai default.
- Pastikan temuan lama hanya referensi, bukan field aktif.
- Catat resubmit di audit trail.
- Pastikan request aktif per ODP tetap terkontrol.

### Phase 4 - ODP Quality Work Queue

Tujuan: adminregion dan validator punya daftar kerja yang jelas.

- Tambahkan filter queue berdasarkan status workflow.
- Tambahkan queue evidence kurang.
- Tambahkan action cepat ke ODP detail, field validation, request aktif, dan histori.
- Tambahkan summary count per status.
- Pastikan region scope tetap terkunci untuk validator/adminregion.

### Phase 5 - Mobile UX Hardening

Tujuan: web flow siap menjadi referensi aplikasi Android.

- Rapikan layout field validation mobile.
- Buat submit bar sticky.
- Buat evidence uploader compact.
- Buat checklist mobile-friendly.
- Buat port card mudah discan.
- Uji viewport mobile untuk validator Bali/Jabar.

### Phase 6 - Audit Trail & UAT

Tujuan: semua perubahan tercatat, bisa diaudit, dan siap sign-off.

- Rapikan label audit trail untuk ODP workflow.
- Tambahkan UAT case untuk lifecycle status.
- Tambahkan UAT case untuk reject/resubmit.
- Tambahkan UAT case untuk evidence minimal.
- Tambahkan UAT case untuk ODP Quality queue.
- Update checklist setelah manual test.

## Rencana Redesign Form Validasi ODP - Adaptive UI

### Latar Belakang

Form validasi ODP sudah memuat seluruh kebutuhan teknis: identitas asset, pemeriksaan awal, checklist kondisi, port, redaman, evidence, histori, dan resubmit. Setelah semua kebutuhan tersebut digabung dalam satu halaman panjang, pengalaman mobile menjadi kurang efisien karena validator harus scroll jauh untuk berpindah antar area kerja.

Perubahan berikutnya perlu mengubah form validasi dari halaman panjang menjadi workspace berbasis section. Tujuannya bukan mengubah kontrak data, tetapi membuat pengisian lebih terstruktur, ringkas, dan mudah diaudit.

### Prinsip Desain

- **Adaptive UI**: layout menyesuaikan perangkat, bukan sekadar responsive grid.
- **Section-first workflow**: setiap kelompok kerja memiliki ruang sendiri, status kelengkapan sendiri, dan error sendiri.
- **Technical wording**: label memakai bahasa operasional yang lebih presisi agar cocok untuk validator, adminregion, dan superadmin.
- **No payload churn**: struktur payload submit tetap memakai `field_inspection`, `field_validation`, `device_ports`, dan `port_summary`.
- **Review parity**: urutan section di form validasi harus mudah dicocokkan dengan halaman request approval dan histori detail ODP.
- **Mobile-first execution**: validator mobile harus bisa berpindah section tanpa mencari field lewat scroll panjang.

### Struktur Section Baru

#### 1. Ringkasan ODP

Tujuan: memberi konteks sebelum validator mengisi data.

Konten:

- Status validasi asset.
- Status request aktif.
- Nama ODP dan inventory ID.
- Ringkasan port: total, used, idle, reserved, down.
- Catatan reject terakhir jika ada.
- Akses cepat ke detail validasi terakhir.

Catatan UI:

- Read-only.
- Desktop dapat menjadi summary panel.
- Mobile menjadi section pertama yang ringkas.

#### 2. Identitas & Kapasitas Aktual

Tujuan: menampung koreksi master data ODP yang ditemukan di lapangan.

Konten:

- Nama ODP baru.
- Tipe ODP.
- Jenis instalasi.
- Splitter ratio.
- Kapasitas ODP aktual.
- POP dan inventory ID sebagai referensi read-only.

Catatan UI:

- Semua field wajib memiliki required badge kecil.
- Progress section dapat berupa `5/5 lengkap`.
- Error section harus mengarah langsung ke field yang belum valid.

#### 3. Pemeriksaan Awal

Tujuan: mengumpulkan foto pembuka yang membuktikan konteks lapangan.

Konten:

- Foto keseluruhan ODP jarak dekat.
- Foto keseluruhan ODP jarak jauh dengan tiang.
- Foto bagian dalam ODP close up.
- Foto tampak kanan dan kiri.

Catatan UI:

- Uploader dibuat compact dengan status `Belum ada foto` atau nama file.
- Mobile sebaiknya menggunakan card uploader satu kolom.
- Desktop dapat memakai grid dua kolom.

#### 4. Checklist Kondisi

Tujuan: mencatat kondisi fisik dan teknis ODP.

Konten:

- Box ODP.
- Label ODP.
- Kebersihan ODP.
- Pigtail dan adapter.
- Kerapihan kabel.
- Kondisi, keterangan, dan foto per item.

Catatan UI:

- Section badge menampilkan ringkasan seperti `4/5 baik` dan `1 perlu perhatian`.
- Jika kondisi tidak baik, keterangan teknis wajib diisi.
- Error section harus menyebut item bermasalah.

#### 5. Port & Redaman

Tujuan: mencatat status port dan nilai redaman sesuai kapasitas aktual.

Konten:

- Filter status port.
- Status port per index.
- Customer/ONT jika ada.
- Redaman per port.
- Catatan port.

Catatan UI:

- Mobile memakai card list dengan filter.
- Desktop dapat memakai grid/card multi kolom.
- Section badge menampilkan `x/y redaman lengkap`.

#### 6. Review & Submit

Tujuan: memastikan validator melihat ringkasan teknis sebelum submit/resubmit.

Konten:

- Ringkasan identitas dan kapasitas.
- Ringkasan pemeriksaan awal.
- Ringkasan checklist kondisi.
- Ringkasan port dan redaman.
- Daftar field belum lengkap per section.
- Tombol `Submit Validasi` atau `Resubmit Validasi`.

Catatan UI:

- Tombol submit utama dipusatkan di section ini.
- Mobile boleh memiliki CTA ringkas, tetapi tidak boleh menutup konten aktif.
- Dialog validasi wajib menyebut section dan field yang bermasalah.

### Pola Adaptive UI

Desktop:

- Gunakan layout dua area: navigation/summary di kiri atau atas, content section di kanan.
- Section navigation boleh memakai tabs horizontal atau sidebar ringan.
- Summary status tetap terlihat tanpa memenuhi layar.

Tablet:

- Gunakan tabs horizontal scroll.
- Content tetap satu section aktif.
- Hindari nested card berlebihan.

Mobile:

- Gunakan segmented tabs horizontal sticky di atas content.
- Setiap tab menampilkan badge kecil: complete, warning, atau count.
- Hanya satu section aktif tampil, sehingga validator tidak scroll seluruh form.
- Error submit otomatis memindahkan user ke section yang bermasalah.

### Dampak Perubahan

#### Halaman Field Validation ODP

File utama:

- `app/(app)/field/odp/[id]/page.tsx`

Dampak:

- Perlu memecah form panjang menjadi section components.
- Perlu state `activeSection`.
- Perlu helper progress per section.
- Perlu helper error routing per section.
- Perlu review summary sebelum submit.
- Validasi submit tetap memakai data draft yang sama.

#### Halaman Request Approval

File utama:

- `app/(app)/validation-requests/page.tsx`

Dampak:

- Tidak perlu perubahan payload.
- Urutan review field validation sebaiknya disamakan dengan section baru.
- Label section di approval perlu mengikuti bahasa teknis yang sama.
- Evidence tetap dibedakan sebagai evidence untuk field validation, attachment untuk create/update/archive.

#### Halaman Detail ODP

File utama:

- `app/(app)/data-management/list/[slug]/[id]/page.tsx`

Dampak:

- Histori validasi sebaiknya memakai urutan section yang sama.
- Ringkasan port, checklist, dan evidence tetap membaca snapshot existing.
- Tidak perlu perubahan backend jika snapshot tidak berubah.

#### Notification dan Audit Trail

File utama:

- `components/nav-user.tsx`
- `app/(app)/audit-trail/page.tsx`

Dampak:

- Tidak perlu perubahan besar.
- Jika label section baru muncul di event/user message, wording perlu disamakan.
- Notification tetap fokus jenis request, status workflow, dan role reviewer.

#### Backend

File utama:

- `src/modules/validation/validation.controller.js`
- `src/modules/validation/validation.service.js`

Dampak:

- Tidak diperlukan perubahan jika payload tetap sama.
- Backend hanya perlu disentuh jika nanti ada field baru atau status baru.

### Todo Redesign Form Validasi ODP

- [x] Definisikan enum section form validasi: `summary`, `identity`, `initial_inspection`, `condition_check`, `ports`, `review_submit`.
- [x] Tambahkan state active section dan section navigation.
- [x] Buat progress helper untuk tiap section.
- [x] Buat error helper yang memetakan field wajib ke section.
- [x] Pecah `Ringkasan ODP` menjadi komponen read-only.
- [x] Pecah `Identitas & Kapasitas Aktual` menjadi komponen form.
- [x] Pecah `Pemeriksaan Awal` menjadi komponen uploader.
- [x] Pecah `Checklist Kondisi` menjadi komponen checklist teknis.
- [x] Pecah `Port & Redaman` menjadi komponen port editor.
- [x] Tambahkan `Review & Submit` dengan summary dan daftar blocking issue.
- [x] Ubah dialog validasi wajib agar menampilkan section dan field yang belum lengkap.
- [x] Pastikan error submit memindahkan user ke section bermasalah.
- [x] Pastikan mobile hanya menampilkan satu section aktif.
- [x] Pastikan desktop tetap efisien untuk review cepat.
- [x] Pastikan payload submit tidak berubah.
- [x] Samakan label section di halaman request approval.
- [x] Samakan label section di histori detail ODP.
- [x] Uji viewport mobile untuk validator.
- [x] Update checklist implementasi setelah manual test.

## Todo Checklist

### Phase 1 - Status & Lifecycle Display

- [x] Buat mapping status ODP workflow yang dipakai di list, detail, request, dan notification.
- [x] Tambahkan badge status di list ODP.
- [x] Tambahkan timeline status di detail ODP.
- [x] Tambahkan status penanggung jawab berikutnya di request card.
- [x] Sesuaikan notification inbox dengan jenis request, status workflow, dan role reviewer.
- [x] Tampilkan reject note terakhir di detail ODP.
- [x] Pastikan refresh state setelah submit, approve, reject, dan resubmit.

### Phase 2 - Checklist & Evidence Standard

- [x] Definisikan template checklist ODP resmi.
- [x] Tambahkan kategori evidence ODP untuk pemeriksaan awal dan checklist kondisi.
- [x] Tambahkan validasi minimal evidence sebelum submit.
- [x] Hapus checklist lama dari UI form validasi dan approval, gunakan checklist kondisi format baru.
- [x] Tambahkan validasi wajib foto pemeriksaan, kondisi, keterangan bermasalah, master data, dan redaman angka sebelum submit.
- [x] Pastikan evidence request aktif hanya evidence submit terakhir.
- [x] Pastikan evidence lama tetap tampil di histori validasi.
- [x] Tampilkan checklist snapshot di review adminregion/superadmin.
- [x] Tambahkan pemeriksaan awal dan checklist kondisi ODP lengkap dengan foto ke snapshot validasi.
- [x] Tampilkan pemeriksaan awal dan checklist kondisi di review adminregion/superadmin.
- [x] Tampilkan ringkasan checklist kondisi format baru di detail ODP.
- [x] Tampilkan snapshot field validasi dan redaman per port di histori detail ODP.
- [x] Gabungkan evidence foto validasi format baru ke mini gallery detail ODP.
- [x] Samakan port detail ODP dengan konteks form validasi: status aktual, status validasi, redaman terakhir, dan catatan.
- [x] Samakan histori form validasi dengan histori detail ODP: workflow status, field snapshot, evidence count, port/redaman, dan checklist.
- [x] Bedakan template review request untuk create asset, update asset, archive asset, dan validasi lapangan.
- [x] Tambahkan input nama ODP baru, tipe ODP, jenis instalasi, splitter ratio, kapasitas ODP, status port, dan redaman per port ke snapshot validasi.
- [x] Terapkan nama ODP, tipe ODP, jenis instalasi, splitter ratio, total port, used port, dan status port setelah approval final.
- [x] Tampilkan detail validasi terakhir sebagai referensi read-only.

### Phase 3 - Resubmit Workflow

- [x] Tampilkan banner reject note di field validation untuk validator.
- [x] Tampilkan banner reject note di request/adminregion review.
- [x] Tambahkan action resubmit validator setelah reject adminregion.
- [x] Tambahkan action resubmit adminregion setelah reject superadmin.
- [x] Bedakan konteks review request berdasarkan role dan tampilkan stage banner + CTA yang sesuai tahap approval.
- [x] Pastikan form validasi memakai data asset terakhir sebagai default.
- [x] Pastikan temuan/evidence lama tidak otomatis menjadi input aktif.
- [x] Catat semua resubmit di audit trail.

### Phase 4 - ODP Quality Work Queue

- [x] Tambahkan queue ODP pending adminregion.
- [x] Tambahkan queue ODP pending superadmin.
- [x] Tambahkan queue ODP rejected by adminregion.
- [x] Tambahkan queue ODP rejected by superadmin.
- [x] Tambahkan queue ODP evidence kurang.
- [x] Tambahkan filter queue berdasarkan status workflow.
- [x] Tambahkan action cepat ke ODP detail.
- [x] Tambahkan action cepat ke field validation.
- [x] Tambahkan action cepat ke request aktif.
- [x] Tambahkan summary count per queue.

### Phase 5 - Mobile UX Hardening

- [x] Buat status header ODP mobile-friendly.
- [x] Buat submit bar sticky di mobile.
- [x] Buat checklist mobile-friendly.
- [x] Buat evidence uploader per kategori.
- [x] Buat port card dengan filter status.
- [ ] Uji tampilan validator di viewport mobile.

### Phase 6 - Audit Trail & UAT

- [x] Rapikan label audit trail ODP workflow.
- [x] Tambahkan UAT lifecycle ODP.
- [x] Tambahkan UAT checklist/evidence minimal.
- [x] Tambahkan UAT reject/resubmit.
- [x] Tambahkan UAT ODP Quality work queue.
- [x] Update dokumen checklist setelah manual test.
- [x] Catat hasil sign-off user.

## Catatan Keputusan

- Validator tetap fokus ODP terlebih dahulu.
- Akses validator ke semua device sebaiknya read-only jika nanti dibutuhkan, tetapi bukan prioritas workflow validasi saat ini.
- Data final asset tetap hanya berubah setelah approval sesuai chain.
- Evidence hasil validasi terbaru harus menjadi fokus review; evidence lama tetap menjadi histori.
- Semua reject wajib punya note yang cukup jelas.
