# Request Review Generalization UAT

Gunakan akun di `docs/account-credentials.md`. Pastikan migration backend terbaru sudah dijalankan sebelum mulai.

## TC-RQ-1 - Adminregion Create ODP

- [ ] Login sebagai adminregion Jabar/Bali.
- [ ] Buat ODP baru dari Asset Overview.
- [ ] Pastikan setelah submit muncul pesan request approval, bukan langsung pindah ke list.
- [ ] Login superadmin.
- [ ] Pastikan ada notifikasi `Create Device`.
- [ ] Buka `Requests`, pilih request tersebut.
- [ ] Pastikan detail device, region, port, splitter, dan koordinat terbaca jelas.
- [ ] Approve.
- [ ] Pastikan ODP muncul di Asset Overview/list region terkait.

## TC-RQ-2 - Validator Submit Validasi

- [ ] Login validator region terkait.
- [ ] Buka ODP dari QR/link field validation.
- [ ] Update port/checklist/evidence.
- [ ] Submit Validasi.
- [ ] Tutup dialog sukses dan pastikan halaman refresh.
- [ ] Login adminregion, approve request.
- [ ] Login superadmin, approve final.
- [ ] Pastikan status menjadi validated.

## TC-RQ-3 - Reject Note

- [ ] Adminregion reject hasil validator tanpa note atau note pendek.
- [ ] Pastikan sistem menolak.
- [ ] Isi note minimal 10 karakter, reject berhasil.
- [ ] Superadmin reject request pending tanpa note atau note pendek.
- [ ] Pastikan sistem menolak.
- [ ] Isi note minimal 10 karakter, reject berhasil.

## TC-RQ-4 - Adminregion Create POP/Route/Project

- [ ] Login adminregion.
- [ ] Create POP baru dan pastikan masuk request approval superadmin.
- [ ] Create Route baru dan pastikan masuk request approval superadmin.
- [ ] Create Project baru dan pastikan masuk request approval superadmin.
- [ ] Login superadmin, approve masing-masing request.
- [ ] Pastikan POP/Route/Project muncul di list region terkait setelah approve.

## TC-RQ-5 - Adminregion Update/Archive

- [ ] Login adminregion.
- [ ] Rename atau quick edit asset region terkait.
- [ ] Pastikan data utama belum berubah sebelum superadmin approve.
- [ ] Login superadmin, buka request update.
- [ ] Pastikan diff sebelum/sesudah tampil.
- [ ] Approve dan pastikan data utama berubah.
- [ ] Login adminregion, archive/delete asset.
- [ ] Pastikan masuk request approval.
- [ ] Login superadmin, approve dan pastikan asset terarsip/terhapus sesuai jenis resource.

## TC-RQ-6 - Role UI

- [ ] Validator hanya melihat menu yang relevan untuk field workflow.
- [ ] Validator field ODP nyaman di mobile: toolbar, metric, port card, submit button tidak overlap.
- [ ] Adminregion hanya melihat data dan request region terkait.
- [ ] Superadmin melihat queue final approval lintas region.
- [ ] Superadmin tidak melihat submenu List ODP.
