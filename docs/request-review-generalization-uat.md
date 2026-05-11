# Request Review Generalization UAT

Gunakan akun di `docs/account-credentials.md`. Jalankan preflight di `docs/request-review-generalization-preflight.md` dan pastikan migration backend terbaru sudah dijalankan sebelum mulai.

## TC-RQ-1 - Adminregion Create ODP

- [x] Login sebagai adminregion Jabar/Bali.
- [x] Buat ODP baru dari Asset Overview.
- [x] Pastikan setelah submit muncul pesan request approval, bukan langsung pindah ke list.
- [x] Login superadmin.
- [x] Pastikan ada notifikasi `Create Device`.
- [x] Buka `Requests`, pilih request tersebut.
- [x] Pastikan detail device, region, port, splitter, dan koordinat terbaca jelas.
- [x] Approve.
- [x] Pastikan ODP muncul di Asset Overview/list region terkait.

## TC-RQ-2 - Validator Submit Validasi

- [x] Login validator region terkait.
- [x] Buka ODP dari QR/link field validation.
- [x] Update port/checklist/evidence.
- [x] Submit Validasi.
- [x] Tutup dialog sukses dan pastikan halaman refresh.
- [x] Login adminregion, approve request.
- [x] Login superadmin, approve final.
- [x] Pastikan status menjadi validated.

## TC-RQ-3 - Reject Note

- [x] Adminregion reject hasil validator tanpa note atau note pendek.
- [x] Pastikan sistem menolak.
- [x] Isi note minimal 10 karakter, reject berhasil.
- [x] Superadmin reject request pending tanpa note atau note pendek.
- [x] Pastikan sistem menolak.
- [x] Isi note minimal 10 karakter, reject berhasil.

## TC-RQ-4 - Adminregion Create POP/Route/Project

- [x] Login adminregion.
- [x] Create POP baru dan pastikan masuk request approval superadmin.
- [x] Create Route baru dan pastikan masuk request approval superadmin.
- [x] Create Project baru dan pastikan masuk request approval superadmin.
- [x] Login superadmin, approve masing-masing request.
- [x] Pastikan POP/Route/Project muncul di list region terkait setelah approve.

## TC-RQ-5 - Adminregion Update/Archive

- [x] Login adminregion.
- [x] Rename atau quick edit asset region terkait.
- [x] Pastikan data utama belum berubah sebelum superadmin approve.
- [x] Login superadmin, buka request update.
- [x] Pastikan diff sebelum/sesudah tampil.
- [x] Approve dan pastikan data utama berubah.
- [x] Login adminregion, archive/delete asset.
- [x] Pastikan masuk request approval.
- [x] Login superadmin, approve dan pastikan asset terarsip/terhapus sesuai jenis resource.

## TC-RQ-6 - Role UI

- [x] Validator hanya melihat menu yang relevan untuk field workflow.
- [x] Validator field ODP nyaman di mobile: toolbar, metric, port card, submit button tidak overlap.
- [x] Adminregion hanya melihat data dan request region terkait.
- [x] Superadmin melihat queue final approval lintas region.
- [x] Superadmin tidak melihat submenu List ODP.
