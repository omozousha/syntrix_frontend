# Rencana Multi-step Form Validasi ODP

## Latar Belakang

Form validasi ODP saat ini sudah memuat kebutuhan teknis yang lengkap, tetapi alurnya masih terasa seperti satu workspace panjang. Untuk validator lapangan, pola ini kurang ideal karena user perlu berpindah jauh antar area: identitas, foto evidence, checklist kondisi, port, dan review submit.

Perubahan berikutnya adalah mengubah UI form validasi menjadi **Multi-step Form** agar validator dapat melakukan validasi secara bertahap sesuai instruksi aplikasi dan alur kerja sistem. Fokus perubahan ini adalah UX dan struktur presentasi form, bukan mengubah kontrak payload validasi yang sudah berjalan.

## Tujuan

- Membuat validator mengisi form sesuai urutan kerja yang jelas.
- Mengurangi scroll panjang, terutama pada mobile device.
- Membuat instruksi tiap step lebih teknis, ringkas, dan profesional.
- Menampilkan progress validasi yang mudah dibaca.
- Mengarahkan user otomatis ke step bermasalah saat field wajib belum lengkap.
- Menjaga payload validasi tetap kompatibel dengan request approval, detail ODP, histori, dan mini gallery.

## Struktur Step Baru

### 1. Identitas

Tujuan: memastikan data teknis ODP yang sedang divalidasi sesuai kondisi lapangan.

Konten utama:

- Informasi ringkas ODP saat ini: nama, inventory ID, status validasi, request status, region, POP.
- Tanggal validasi.
- Nama ODP baru bila ada koreksi.
- Tipe ODP.
- Jenis instalasi.
- Kapasitas splitter.
- Kapasitas ODP aktual.
- Alert reject note jika request sebelumnya ditolak.
- Referensi validasi terakhir secara ringkas.

Perilaku:

- Step ini menjadi awal proses karena perubahan identitas memengaruhi port dan review.
- Jika kapasitas ODP berubah, step port harus menyesuaikan jumlah port aktual.
- Field wajib yang gagal harus ditampilkan sebagai list teknis.

### 2. Foto Awal

Tujuan: mengumpulkan evidence visual awal sebelum pemeriksaan detail.

Konten utama:

- Foto keseluruhan ODP jarak dekat.
- Foto keseluruhan ODP jarak jauh dengan tiang/konteks lokasi.
- Foto bagian dalam ODP close-up.
- Preview thumbnail.
- Upload/remove evidence.

Perilaku:

- Tiap slot foto punya instruksi singkat tentang sudut pengambilan.
- Progress step berbasis jumlah foto wajib yang sudah terisi.
- Jika foto belum lengkap, review harus menandai step ini belum siap submit.

### 3. Kondisi

Tujuan: mencatat kondisi fisik dan teknis ODP secara konsisten.

Konten utama:

- Box ODP.
- Label ODP.
- Kebersihan ODP.
- Splitter.
- Kabel distribusi/input.
- Keterangan jika kondisi bermasalah.
- Foto pendukung per item kondisi.

Perilaku:

- Item kondisi memakai pilihan status yang jelas seperti `baik`, `warning`, `rusak`, atau format existing yang sudah dipakai.
- Jika item tidak baik, keterangan wajib diisi.
- Evidence kondisi mengikuti item terkait.
- Progress step menunjukkan jumlah item baik/bermasalah dan issue aktif.

### 4. Port

Tujuan: mencatat status port dan hasil redaman sesuai kapasitas ODP aktual.

Konten utama:

- Filter status port.
- Card port per index.
- Status port: idle, used, reserved, down, maintenance.
- Customer reference.
- ONT reference.
- Redaman port.
- Catatan port.
- Info auto-fill relasi customer/ONT berdasarkan POP yang sama.

Perilaku:

- Port list mengikuti kapasitas aktual dari step Identitas.
- Jika status port `idle`, customer dan ONT otomatis dikosongkan.
- Customer/ONT hanya menampilkan data sesuai POP terkait.
- Redaman wajib sesuai aturan validasi existing.
- Step port harus compact dan mobile-first, tidak membuat horizontal scroll.

### 5. Review

Tujuan: memberi ringkasan akhir sebelum submit request validasi.

Konten utama:

- Ringkasan progress semua step.
- Daftar field wajib yang belum lengkap per step.
- Ringkasan perubahan identitas.
- Ringkasan evidence foto awal.
- Ringkasan checklist kondisi.
- Ringkasan port: total, used, idle, reserved, down.
- Finding note.
- Submit/resubmit button.

Perilaku:

- Submit hanya aktif jika semua field wajib valid.
- Jika submit gagal, user diarahkan ke step pertama yang bermasalah.
- Response dialog memakai `ResponseDialog`.
- Review wording harus sama dengan request approval dan histori detail ODP.

## Prinsip UI

- Gunakan komponen shadcn UI dan komponen existing.
- Step navigation harus jelas dan bisa dipakai di desktop maupun mobile.
- Desktop boleh memakai stepper horizontal atau sidebar compact.
- Mobile memakai stepper horizontal-scroll safe atau segmented step list yang tidak menyebabkan page horizontal scroll.
- Hanya satu step aktif tampil sebagai content utama.
- Header ODP tetap ringkas dan sticky bila diperlukan.
- Submit action tetap mudah dijangkau di mobile.
- Hindari card bersarang dan layout yang terlalu panjang.
- Semua text instruksi harus teknis, pendek, dan tidak seperti landing page.

## Rekomendasi Layout

### Desktop

- Header ringkas ODP di atas.
- Stepper horizontal di bawah header.
- Content step aktif dalam satu area.
- Panel review/progress kecil bisa berada di kanan hanya jika tidak membuat layout penuh sesak.

### Mobile

- Header ringkas ODP.
- Stepper compact dengan label pendek:
  - `Identitas`
  - `Foto`
  - `Kondisi`
  - `Port`
  - `Review`
- Content satu kolom.
- Tombol lanjut/kembali berada di bawah step.
- Tombol submit hanya muncul di step Review.
- Scroll to top tetap aktif jika halaman panjang.

## Dampak Frontend

Halaman utama:

- `app/(app)/field/odp/[id]/page.tsx`

Area yang perlu disesuaikan:

- Enum/state section form validasi.
- Step navigation.
- Progress helper per step.
- Error routing helper per step.
- Dialog field wajib.
- Submit/resubmit flow.
- Evidence upload grouping.
- Port editor grouping.
- Mobile sticky behavior.
- ResponseDialog untuk warning/success.

Halaman terkait:

- `app/(app)/validation-requests/page.tsx`
  - Review request harus tetap membaca snapshot dengan urutan yang sejalan.
- `app/(app)/data-management/list/[slug]/[id]/page.tsx`
  - Histori validasi dan mini gallery tetap memakai mapping evidence yang sama.
- `components/nav-user.tsx`
  - Notifikasi tidak perlu berubah kecuali wording step baru masuk ke message.

## Dampak Backend

Tidak ada perubahan backend yang direncanakan pada tahap awal.

Backend hanya perlu diubah jika ditemukan kebutuhan baru berikut:

- Payload snapshot membutuhkan field step metadata baru.
- Evidence perlu kategori tambahan yang belum ada.
- Status validasi membutuhkan state baru.
- Port attenuation perlu dipersist lebih detail dari snapshot existing.

Untuk tahap ini, data tetap memakai struktur existing:

- `payload_snapshot.field_inspection`
- `payload_snapshot.field_validation`
- `payload_snapshot.device_ports`
- `payload_snapshot.port_summary`
- `evidence_attachments`
- `checklist` legacy compatibility bila masih diperlukan oleh API.

## Todo Frontend

- [ ] Audit struktur current form validation dan mapping section existing ke 5 step baru.
- [ ] Definisikan enum step: `identity`, `initial_photos`, `condition`, `ports`, `review`.
- [ ] Ganti navigation section lama menjadi stepper multi-step.
- [ ] Buat helper label step dan deskripsi step.
- [ ] Buat helper progress per step.
- [ ] Buat helper status step: `ready`, `incomplete`, `issue`, `done`.
- [ ] Pindahkan ringkasan ODP ke header compact yang selalu terlihat.
- [ ] Susun step Identitas dengan field teknis ODP dan reject note.
- [ ] Susun step Foto Awal dengan upload slot, preview, dan progress evidence.
- [ ] Susun step Kondisi dengan item checklist, keterangan, dan foto per item.
- [ ] Susun step Port dengan filter port, relasi customer/ONT, redaman, dan catatan.
- [ ] Susun step Review dengan summary semua step dan finding note.
- [ ] Tambahkan tombol `Sebelumnya` dan `Lanjut` antar step.
- [ ] Submit button hanya tampil sebagai aksi utama pada step Review.
- [ ] Error submit otomatis pindah ke step pertama yang belum valid.
- [ ] Dialog field wajib memakai `ResponseDialog` dan menyebut step bermasalah.
- [ ] Pastikan auto-fill hint customer/ONT tetap tampil di step Port.
- [ ] Pastikan scroll to top mobile tetap bekerja setelah step berubah.
- [ ] Pastikan tidak ada horizontal scroll di mobile.
- [ ] Pastikan build/lint frontend lolos.

## Todo Backend

- [ ] Verifikasi tidak ada endpoint baru yang dibutuhkan.
- [ ] Verifikasi submit payload tetap sama dengan struktur existing.
- [ ] Verifikasi request approval masih menerima snapshot dari form baru.
- [ ] Verifikasi approval final tetap menerapkan field ODP dan status port.
- [ ] Tambahkan backend patch hanya jika struktur evidence/step baru wajib dipersist.

## Checklist UAT

- [ ] Validator bisa membuka form validasi ODP dan melihat 5 step.
- [ ] Step Identitas menampilkan data ODP dan field koreksi teknis.
- [ ] Step Foto Awal mewajibkan foto sesuai template.
- [ ] Step Kondisi mewajibkan keterangan saat item bermasalah.
- [ ] Step Port menampilkan jumlah port sesuai kapasitas ODP aktual.
- [ ] Step Port tetap memfilter customer/ONT berdasarkan POP ODP.
- [ ] Step Port mengosongkan customer/ONT saat status idle.
- [ ] Step Review menampilkan semua summary yang dibutuhkan sebelum submit.
- [ ] Submit gagal mengarahkan user ke step yang bermasalah.
- [ ] Submit berhasil membuat request validasi seperti flow sebelumnya.
- [ ] Adminregion bisa membaca request hasil multi-step tanpa kehilangan data.
- [ ] Superadmin bisa approve request dan final data ODP berubah sesuai payload.
- [ ] Detail ODP tetap menampilkan histori validasi dan mini gallery evidence.
- [ ] Mobile viewport tidak horizontal scroll.
- [ ] Desktop layout tetap compact dan tidak terlalu panjang.

## Urutan Implementasi Disarankan

1. Refactor state step dan navigation tanpa mengubah payload.
2. Pindahkan content existing ke 5 step baru.
3. Perbaiki progress dan error routing per step.
4. Rapikan responsive desktop/mobile.
5. Verifikasi submit request, approval, detail ODP, dan histori.
6. Jalankan UAT manual untuk validator dan adminregion.

## Catatan Keputusan

- Step `Ringkasan` tidak dibuat sebagai step terpisah. Ringkasan ODP menjadi header compact agar validator selalu tahu konteks asset.
- Step `Review` menjadi satu-satunya tempat submit utama.
- Nama step mengikuti bahasa user-facing yang sederhana, sementara isi dan instruksi field memakai bahasa teknis.
- Backend tidak diubah di tahap awal kecuali hasil implementasi membuktikan ada field yang perlu dipersist baru.
