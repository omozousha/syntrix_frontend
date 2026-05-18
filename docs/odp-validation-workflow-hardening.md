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
- [x] Uji tampilan validator di viewport mobile.

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

## Rencana Role-Based Dashboard

### Latar Belakang

Dashboard saat ini sudah mulai berubah menjadi pusat kerja berbasis role. Setelah dikaji ulang, arah dashboard utama perlu dikembalikan ke fondasi Syntrix sebagai **asset inventory console**: informasi Region, POP, dan Device harus menjadi konteks default sebelum user masuk ke KPI workflow.

Tujuan dashboard baru bukan hanya menampilkan angka, tetapi menjawab dua pertanyaan utama:

- **Bagaimana kondisi region, POP, dan device yang saya kelola?**
- **Apa pekerjaan operasional yang perlu saya tindaklanjuti sekarang?**

### Prinsip Desain Dashboard

- **Role-aware**: konten dashboard berbeda untuk superadmin, adminregion, dan validator.
- **Asset context first**: tab default dashboard menampilkan Region, POP, dan Device.
- **Action-first**: setiap insight penting punya CTA langsung ke halaman kerja terkait.
- **Operational density**: informasi padat, mudah discan, tidak memakai hero marketing atau chart dekoratif.
- **Useful charts only**: chart dipakai untuk komposisi, distribusi, dan tren ringkas yang membantu keputusan.
- **Exception-driven KPI**: pending, rejected, evidence issue, SLA risk, dan data mismatch ditempatkan di tab KPI/Workflow.
- **Mobile-aware**: validator dan adminregion harus tetap nyaman melihat queue di layar kecil.
- **Consistent with shadcn UI**: gunakan Card, Badge, Button, Alert, ScrollArea, Skeleton, dan komponen existing.
- **No over-fetching**: mulai dari endpoint existing jika cukup; endpoint baru dibuat hanya untuk summary yang memang tidak tersedia.

### Struktur Tab Dashboard Baru

Tab default:

- `Overview`: ringkasan Region, POP, dan Device.

Tab pendukung:

- `Region`: health region, jumlah POP/device per region, region dengan issue terbanyak.
- `POP`: total POP, status POP, POP dengan device terbanyak, POP tanpa device/ODP jika ada.
- `Device`: komposisi device type, status device, ODP validation distribution, port utilization.
- `KPI & Workflow`: approval queue, ODP Quality, rejected request, evidence issue, audit activity.

Catatan:

- Jika role hanya punya satu region, tab `Region` fokus ke detail region tersebut.
- Jika role superadmin punya semua region, tab `Region` menjadi perbandingan antar region.
- Untuk validator, tab disederhanakan menjadi `Overview`, `POP`, dan `KPI & Workflow` agar fokus pada region/POP/ODP lapangan.
- KPI tetap penting, tetapi bukan tab default agar dashboard tidak terasa hanya seperti halaman request approval.

### Chart Yang Disarankan

Chart wajib tahap berikutnya:

- **Device Type Donut**: komposisi ODP, OLT, ONT, ODC, OTB, cable, pole, route.
- **Device Status Bar**: active, draft, archived, inactive, atau status lain yang tersedia.
- **POP Distribution Bar**: jumlah POP per region atau jumlah device per POP.
- **ODP Validation Donut**: validated, unvalidated, pending adminregion, pending superadmin, rejected.
- **Port Utilization Bar**: used, idle, reserved, down, maintenance.

Chart opsional setelah data stabil:

- **Region Health Matrix**: region vs issue count.
- **Approval Funnel**: submitted, adminregion review, superadmin review, rejected, final approved.
- **Activity Sparkline**: submit/approve/reject per hari jika backend menyediakan time-series.

Aturan chart:

- Chart harus compact dan tidak mengambil ruang lebih besar dari work queue.
- Chart wajib punya angka total dan legend yang bisa dibaca tanpa hover.
- Mobile memakai stacked card, bukan chart lebar yang memicu horizontal scroll.
- Warna chart mengikuti fungsi: green validated/healthy, amber pending/warning, red rejected/problem, blue review/info.

### Dashboard Superadmin

Fokus: visibility semua region, POP/device coverage, approval final, governance, dan audit.

Konten utama:

- Region overview: jumlah region aktif, POP total, device total, ODP total.
- Device composition chart.
- Region distribution chart untuk POP/device.
- Approval queue final: pending superadmin, create device, validation, update, delete/archive.
- Operational risk: ODP evidence kurang, ODP belum valid, request rejected, port issue.
- SLA risk: request menunggu terlalu lama.
- Region health: ringkasan validasi dan issue per region.
- Recent critical activity: approve, reject, delete, restore, update master data.
- Audit watch: aktivitas sensitif yang perlu dipantau.

CTA utama:

- Review Pending Requests.
- Open ODP Quality.
- Open Audit Trail.
- Open Trash.

### Dashboard Adminregion

Fokus: kesehatan region sendiri, coverage POP/device, kualitas ODP, dan tindak lanjut request.

Konten utama:

- Region scope summary: region aktif, total POP, total device, total ODP.
- POP health: POP aktif, POP tanpa device/ODP jika data tersedia, POP dengan device terbanyak.
- Device composition dan device status untuk region aktif.
- ODP validation chart untuk region aktif.
- My region queue: pending adminregion, rejected superadmin, resubmission validator.
- Field issues: evidence kurang, koordinat kosong, port mismatch, redaman belum lengkap.
- Validator activity: submission terbaru dari validator region.
- Top problem ODP: ODP dengan issue paling banyak.
- Quick actions: request aktif, list ODP, field validation, ODP Quality.

CTA utama:

- Review Validator Submission.
- Open Rejected by Superadmin.
- Check ODP Quality.
- Open ODP List.

### Dashboard Validator

Fokus: konteks region lapangan, daftar ODP, dan status submit validasi.

Catatan: saat ini validator belum diberi menu dashboard. Rekomendasi perubahan adalah menambahkan dashboard khusus validator dengan tampilan mobile-first.

Konten utama:

- Region assignment: region yang menjadi scope validator.
- POP coverage di region tersebut.
- ODP queue per POP.
- ODP validation chart mobile-friendly.
- Tugas hari ini: ODP belum tervalidasi, rejected adminregion, evidence kurang.
- Resume validation: lanjutkan validasi terakhir.
- Rejected validation: daftar catatan reject yang harus diperbaiki.
- Submission status: submitted, pending review, approved, rejected.
- Region ODP queue: ODP sesuai scope region.
- Mobile readiness: jumlah ODP siap submit dan belum lengkap.

CTA utama:

- Mulai Validasi ODP.
- Lanjutkan Draft.
- Perbaiki Rejected.
- Scan QR atau Open Field ODP.

### Struktur Layout Yang Disarankan

Desktop:

- Role summary bar di bagian atas.
- Tabs utama: Overview, Region, POP, Device, KPI & Workflow.
- Overview default menampilkan cards Region/POP/Device dan chart komposisi ringkas.
- Work queue ditaruh pada tab KPI & Workflow atau panel kanan yang lebih kecil.
- Recent activity compact di bawah atau kanan.

Tablet:

- KPI strip tetap 2 kolom.
- Work queue satu kolom.
- Activity dan risk panel menjadi section terpisah.

Mobile:

- Role summary singkat.
- Tabs menggunakan grid/scroll segmented yang tidak memicu horizontal page scroll.
- Overview default berisi cards Region/POP/Device satu kolom.
- Chart dibuat compact dan bisa dibaca tanpa hover.
- Queue cards masuk setelah context asset atau tab KPI.
- Recent activity collapsible.

### Dampak Perubahan

#### Frontend

File utama:

- `app/(app)/dashboard/page.tsx`
- `components/app-shell.tsx`
- `components/app-sidebar.tsx`
- `components/sidebar-smart-tip.tsx`

Dampak:

- Dashboard perlu mendeteksi role dan render template berbeda.
- Validator perlu diberi akses menu dashboard jika dashboard validator dibuat.
- Smart tip sidebar perlu menambahkan konteks dashboard.
- Komponen dashboard sebaiknya dipisah per role agar tidak membuat satu file terlalu panjang.

Komponen yang disarankan:

- `components/dashboard/role-dashboard-shell.tsx`
- `components/dashboard/superadmin-dashboard.tsx`
- `components/dashboard/adminregion-dashboard.tsx`
- `components/dashboard/validator-dashboard.tsx`
- `components/dashboard/dashboard-metric-card.tsx`
- `components/dashboard/dashboard-work-queue.tsx`
- `components/dashboard/dashboard-activity-feed.tsx`
- `components/dashboard/dashboard-chart-card.tsx`
- `components/dashboard/dashboard-tabs.tsx`

#### Backend

File yang perlu dicek:

- endpoint existing `/dashboard/summary`
- endpoint list region
- endpoint list POP
- endpoint list device
- endpoint list device ports
- endpoint request validation
- endpoint ODP quality
- endpoint audit trail

Dampak:

- Tahap awal bisa memakai endpoint existing untuk mock/derived UI.
- Jika data tidak cukup, tambahkan endpoint summary role-based:
  - `/dashboard/superadmin`
  - `/dashboard/adminregion`
  - `/dashboard/validator`
- Endpoint baru harus respect region scope dan role permission.

#### UX dan Data Contract

Dampak:

- Dashboard tidak boleh mengubah data.
- Dashboard hanya read-only summary dan quick navigation.
- Semua CTA harus menuju halaman yang sudah punya permission guard.
- Count Region/POP/Device harus konsisten dengan halaman sumber.
- Queue count harus konsisten dengan halaman request/ODP Quality.

### Todo Role-Based Dashboard

- [x] Audit data yang tersedia dari endpoint existing untuk dashboard.
- [x] Tentukan apakah endpoint `/dashboard/summary` cukup atau perlu endpoint role-based baru.
- [x] Definisikan normalized role dashboard: `superadmin`, `adminregion`, `validator`.
- [x] Tambahkan akses dashboard untuk validator jika dashboard validator disetujui.
- [x] Buat struktur komponen dashboard per role.
- [x] Buat shared metric card yang compact dan konsisten dengan shadcn UI.
- [x] Buat shared work queue card/list untuk pending, rejected, dan issue.
- [x] Buat dashboard superadmin: approval final, risk, region health, audit watch.
- [x] Buat dashboard adminregion: regional queue, validation progress, field issue, validator activity.
- [x] Buat dashboard validator: today task, rejected validation, resume validation, submission status.
- [x] Tambahkan empty state untuk role yang belum punya data.
- [x] Tambahkan loading skeleton per section.
- [x] Tambahkan error state jika summary endpoint gagal.
- [x] Tambahkan CTA yang menuju request, ODP Quality, List ODP, Field ODP, Audit Trail, dan Trash sesuai role.
- [x] Update smart tip sidebar untuk konteks dashboard.
- [x] Pastikan layout desktop tidak terlalu kosong dan mobile tidak scroll horizontal.
- [x] Jalankan lint file dashboard terkait.
- [x] Jalankan build atau catat blocker build jika masih ada error lama di halaman lain.

### Todo Revisi Dashboard Region POP Device

- [x] Ubah default dashboard dari workflow queue menjadi tab `Overview` berbasis Region, POP, dan Device.
- [x] Tambahkan tabs dashboard: `Overview`, `Region`, `POP`, `Device`, `KPI & Workflow`.
- [x] Audit endpoint list region, POP, device, dan device ports untuk kebutuhan chart.
- [x] Buat helper agregasi region summary: total region, POP per region, device per region, ODP per region.
- [x] Buat helper agregasi POP summary: total POP, status POP, device per POP, POP tanpa device jika data cukup.
- [x] Buat helper agregasi device summary: total device, komposisi device type, status device, ODP validation distribution.
- [x] Buat helper agregasi port utilization: used, idle, reserved, down, maintenance.
- [x] Buat komponen chart reusable berbasis CSS/SVG ringan tanpa dependency baru jika memungkinkan.
- [x] Tambahkan Device Type Donut chart.
- [x] Tambahkan Device Status Bar chart.
- [x] Tambahkan POP Distribution Bar chart.
- [x] Tambahkan ODP Validation Donut chart.
- [x] Tambahkan Port Utilization Bar chart.
- [x] Pindahkan approval queue, ODP Quality, rejected request, evidence issue, dan audit activity ke tab `KPI & Workflow`.
- [x] Sesuaikan dashboard superadmin agar default menonjolkan seluruh region, POP, dan device.
- [x] Sesuaikan dashboard adminregion agar default menonjolkan region aktif, POP coverage, dan device/ODP health.
- [x] Sesuaikan dashboard validator agar default menonjolkan region assignment, POP/ODP coverage, dan ODP yang perlu divalidasi.
- [x] Sederhanakan tabs validator menjadi `Overview`, `POP`, dan `KPI & Workflow`.
- [x] Redesign overview validator agar fokus pada region scope, POP coverage, ODP queue, rejected validation, dan POP by ODP.
- [x] Pastikan semua chart punya legend, total, empty state, dan mobile layout yang tidak horizontal scroll.
- [x] Update smart tip sidebar untuk menjelaskan tab dashboard baru.
- [x] Jalankan lint dashboard setelah revisi.
- [x] Jalankan build setelah revisi.

### Todo Terakhir - UAT Dashboard

- [x] Tab default dashboard adalah `Overview`, bukan queue workflow.
- [x] Overview menampilkan informasi Region, POP, dan Device yang berguna.
- [x] Chart Device Type Donut tampil dan totalnya sesuai data device.
- [x] Chart Device Status Bar tampil dan totalnya sesuai data device.
- [x] Chart POP Distribution tampil sesuai scope role.
- [x] Chart ODP Validation tampil sesuai scope role.
- [x] Chart Port Utilization tampil sesuai data port.
- [x] Superadmin melihat queue approval final dan bisa membuka request terkait.
- [x] Superadmin melihat indikator risk untuk ODP issue dan audit activity.
- [x] Uji role superadmin.
- [x] Adminregion hanya melihat data/queue sesuai region scope.
- [x] Adminregion bisa membuka pending adminregion dan rejected superadmin dari dashboard.
- [x] Uji role adminregion.
- [x] Validator melihat queue validasi ODP sesuai scope region.
- [x] Validator bisa membuka field validation dari dashboard.
- [x] Uji role validator.
- [x] Validator hanya melihat tabs `Overview`, `POP`, dan `KPI & Workflow`.
- [x] Overview validator menampilkan region scope, POP coverage, ODP queue, rejected validation, dan POP by ODP.
- [x] Dashboard validator nyaman di viewport mobile.
- [x] Semua CTA menghormati permission role.
- [x] Count dashboard konsisten dengan halaman sumber.
- [x] Loading state tidak membuat layout lompat berlebihan.
- [x] Empty state jelas dan tetap memberi aksi yang relevan.
- [x] Tidak ada horizontal scroll di mobile.
- [x] Smart tip sidebar berubah sesuai konteks dashboard.

### Keputusan Awal Yang Disarankan

- Revisi berikutnya dimulai dari struktur tabs dan tab default `Overview`.
- Fokus default dashboard adalah **Region, POP, Device**.
- KPI workflow tetap dipertahankan, tetapi dipindah ke tab `KPI & Workflow`.
- Adminregion menjadi role pertama untuk UAT karena region scope paling mudah diverifikasi.
- Dashboard tahap berikutnya boleh memakai data existing dan derived count dari frontend, tetapi summary final sebaiknya punya endpoint backend khusus agar konsisten dan cepat.
