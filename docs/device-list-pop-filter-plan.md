# Rencana Filter POP Pada List Asset

## Latar Belakang

Halaman list asset saat ini sudah bisa dibatasi berdasarkan region, tetapi user masih sulit membaca hubungan asset terhadap POP. Untuk operasional Syntrix, POP adalah konteks interkoneksi utama: OLT, ODP, ONT, ODC, OTB, switch, router, pole, customer, route, project, dan perangkat lain perlu bisa difilter berdasarkan POP agar proses audit, validasi, dan tracing aset lebih cepat.

Update ini bertujuan menambahkan filter POP pada list asset yang memiliki relasi POP tanpa mengubah struktur utama data. Backend sudah memiliki `pop_id` pada resource `devices`, `poles`, `customers`, `routes`, dan `projects`, sehingga prioritas perubahan ada pada UI, query parameter, dan verifikasi API.

## Prinsip Desain

- Filter POP hanya tampil pada resource operasional yang memiliki `pop_id`: `devices`, `poles`, `customers`, `routes`, dan `projects`.
- POP options harus mengikuti region scope user.
- Jika region dipilih, daftar POP harus mengikuti region tersebut.
- Jika region berubah dan POP lama tidak cocok dengan region baru, filter POP harus direset.
- URL harus menyimpan state filter agar list bisa di-refresh atau dibagikan.
- UI harus tetap compact dan responsive, terutama di mobile.
- Empty state harus menjelaskan bahwa tidak ada data pada POP yang dipilih, bukan sekadar data kosong.

## Dampak Frontend

Halaman terkait:

- `app/(app)/data-management/list/[slug]/page.tsx`
- Komponen filter/list data management yang dipakai oleh list device.
- Helper API list resource yang membangun query ke endpoint backend.
- Smart tip/sidebar jika perlu memberi konteks filter asset berbasis POP.

Perubahan frontend yang dibutuhkan:

- Menambahkan state `popFilter` untuk list device.
- Membaca dan menulis query parameter `pop_id` dari URL.
- Load POP options dari resource `pops`, mengikuti region scope dan filter region aktif.
- Menampilkan combobox POP hanya untuk kategori yang memiliki `pop_id`.
- Menambahkan `pop_id` ke request list asset terkait.
- Menampilkan kolom/informasi POP pada list asset agar relasi POP terbaca tanpa membuka detail.
- Menambahkan badge/filter summary aktif agar user tahu list sedang dibatasi POP.
- Menambahkan tombol reset yang menghapus filter POP bersama filter lain bila diperlukan.
- Menjaga layout filter tetap responsive tanpa horizontal scroll.

## Dampak Backend

Backend saat ini sudah mendukung dasar fitur ini:

- Resource `devices`, `poles`, `customers`, `routes`, dan `projects` sudah memiliki field `pop_id`.
- Registry resource terkait sudah mencakup `pop_id` pada `filterKeys`.
- Schema sudah memiliki index `idx_devices_pop_id` untuk performa filter POP.

Perubahan backend yang perlu diverifikasi:

- Endpoint list resource terkait menerima query `pop_id`.
- Kombinasi query `region_id` + `pop_id` menghasilkan data yang konsisten.
- Role scope tetap diterapkan saat filter POP aktif.
- POP yang tidak termasuk scope user tidak boleh membuka data device di luar scope.
- Jika endpoint list punya normalisasi parameter khusus, pastikan `pop_id` tidak terhapus.

Kemungkinan backend update hanya diperlukan jika hasil verifikasi menunjukkan:

- Query `pop_id` belum benar-benar diteruskan ke SQL builder.
- Role scope belum memblokir POP di luar region user.
- Response list belum membawa metadata POP yang cukup untuk ditampilkan di UI.

## Todo Frontend

- [x] Audit halaman list asset dan tentukan semua resource yang harus punya filter POP.
- [x] Tambahkan helper deteksi resource yang memiliki POP agar filter POP tidak muncul pada master data.
- [x] Tambahkan state `popFilter` dan sinkronisasi dengan query parameter `pop_id`.
- [x] Load daftar POP sesuai role scope user.
- [x] Filter daftar POP berdasarkan `regionFilter` aktif.
- [x] Reset `popFilter` saat region berubah dan POP lama tidak termasuk region baru.
- [x] Tambahkan combobox POP menggunakan komponen shadcn UI yang sudah ada.
- [x] Kirim `pop_id` saat fetch list asset terkait.
- [x] Tampilkan kolom/informasi POP pada tabel dan kartu mobile asset terkait.
- [x] Tampilkan label POP aktif pada filter summary.
- [x] Tambahkan empty state khusus untuk asset yang kosong pada POP terpilih.
- [x] Pastikan list desktop tetap compact dan mobile tidak scroll horizontal.
- [x] Pastikan refresh browser mempertahankan filter region dan POP.
- [x] Pastikan tombol reset membersihkan filter POP dengan benar.
- [x] Update smart tip jika konteks halaman list device aktif.

## Todo Backend

- [x] Verifikasi registry backend mendukung filter `pop_id` untuk resource `devices`, `poles`, `customers`, `routes`, dan `projects`.
- [x] Verifikasi endpoint list resource terkait mengembalikan data sesuai POP.
- [x] Verifikasi kombinasi `region_id` dan `pop_id` tidak mengembalikan device dari region lain.
- [x] Verifikasi role adminregion hanya bisa melihat POP dan device dalam region scope.
- [x] Verifikasi role validator jika punya akses list device tetap mengikuti scope region.
- [x] Verifikasi response asset terkait membawa `pop_id` yang cukup untuk UI.
- [x] Tambahkan test atau minimal catatan uji manual untuk query `pop_id`.
- [x] Tambahkan backend patch hanya jika filter `pop_id` belum berjalan di endpoint existing.

Catatan verifikasi backend:

- `devices`, `poles`, `customers`, `routes`, dan `projects` sudah mencakup `pop_id` pada `filterKeys`.
- `buildWhereClause` meneruskan semua `filterKeys` dari query menjadi kondisi `_eq`.
- Resource terkait bersifat `regionScoped`, sehingga regional role tetap ditambah kondisi `region_id in assigned regions`.
- Kombinasi `region_id` dan `pop_id` masuk ke `_and`, sehingga data dari region lain tidak ikut terbuka selama scope role aktif.
- Resource terkait sudah membawa `pop_id` pada `listFields`.
- Tidak diperlukan patch backend pada tahap ini.

## Checklist UAT

- [ ] Superadmin bisa melihat semua POP setelah memilih semua region atau tanpa region filter.
- [ ] Superadmin bisa memilih region lalu POP list berubah mengikuti region tersebut.
- [ ] Adminregion hanya melihat POP dari region yang menjadi scope-nya.
- [ ] Validator, jika punya akses list device, hanya melihat POP sesuai region assignment.
- [ ] List ODP bisa difilter berdasarkan POP dan jumlah data sesuai hasil backend.
- [ ] List ONT bisa difilter berdasarkan POP dan tidak menampilkan ONT dari POP lain.
- [ ] List device non-ODP/ONT tetap bisa memakai filter POP jika punya `pop_id`.
- [ ] List Pole, Customer, Route, dan Projects bisa difilter berdasarkan POP.
- [ ] Resource master data dan asset tanpa `pop_id` tidak menampilkan filter POP.
- [ ] Empty state muncul jelas saat POP terpilih tidak punya device.
- [ ] Refresh halaman mempertahankan filter POP dari URL.
- [ ] Mobile view tidak membutuhkan scroll horizontal.
- [ ] Reset filter menghapus POP dan mengembalikan list sesuai scope awal.

## Urutan Implementasi Disarankan

1. Frontend: audit halaman list dan pasang filter POP pada list device.
2. Frontend: sinkronkan URL query, reset state, empty state, dan responsive layout.
3. Backend: verifikasi endpoint existing dengan kombinasi `region_id` + `pop_id`.
4. Backend: patch hanya jika query POP belum benar atau role scope bocor.
5. UAT: test superadmin, adminregion, dan validator dengan POP berbeda dalam satu region.
