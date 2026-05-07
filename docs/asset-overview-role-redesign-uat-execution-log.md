# UAT Execution Log - Asset Overview Role Redesign

Tanggal mulai: 2026-05-06  
Status: Closed

## Instruksi Singkat
1. Login sesuai akun.
2. Jalankan test case pada tabel.
3. Tulis hasil `Pass/Fail` + bukti singkat (screenshot/link/catatan).
4. Jika ada `Fail`, isi root cause dan retest result.

## Test Case Matrix

| TC | Skenario | Expected |
|---|---|---|
| TC-6 | Validator submit validasi ODP | Muncul di queue adminregion dengan evidence + checklist |
| TC-6.1 | Adminregion approve/reject request | Status berpindah sesuai workflow |
| TC-6.2 | Superadmin approve/reject request | Status final dan audit trail tetap sinkron |
| TC-7 | Responsive Asset Overview | Desktop/mobile rapi, tidak overlap, scroll normal |
| TC-7.1 | Responsive Validation Requests | Daftar/preview evidence usable di mobile |
| TC-7.2 | Responsive Device List | Card mobile fallback tampil untuk non-ODP & ODP |

## Log Per Role

### Adminregion Bali (`adminregion.bali@syntrix.local`)
| TC | Hasil | Bukti | Catatan |
|---|---|---|---|
| TC-6 | Pass | Manual test user | Workflow request validasi berjalan sesuai ekspektasi. |
| TC-7 | Pass | Manual test user | Responsive desktop/mobile normal. |

### Adminregion Jabar (`adminregion.jabar@syntrix.local`)
| TC | Hasil | Bukti | Catatan |
|---|---|---|---|
| TC-6 | Pass | Manual test user | Workflow request validasi berjalan sesuai ekspektasi. |
| TC-7 | Pass | Manual test user | Responsive desktop/mobile normal. |

### Superadmin (`admin.ops@syntrix.local`)
| TC | Hasil | Bukti | Catatan |
|---|---|---|---|
| TC-6.2 | Pass | Manual test user | Approval final + status sinkron. |
| TC-7 | Pass | Manual test user | Responsive desktop/mobile normal. |

### Validator Bali (`validator.bali@syntrix.local`)
| TC | Hasil | Bukti | Catatan |
|---|---|---|---|
| TC-6 | Pass | Manual test user | Submit validasi berjalan normal. |
| TC-7.2 | Pass | Manual test user | List mobile dan flow validator normal. |

### Validator Jabar (`validator.jabar@syntrix.local`)
| TC | Hasil | Bukti | Catatan |
|---|---|---|---|
| TC-6 | Pass | Manual test user | Submit validasi dan evidence tampil di queue review. |
| TC-7.2 | Pass | Manual test user | Tampilan list/flow validator tetap usable saat uji manual. |

## Defect Tracker

| ID | Role | TC | Severity | Ringkasan | Status |
|---|---|---|---|---|---|
| - | - | - | - | Tidak ada defect pada UAT manual final | Closed |

## Final Summary
- Total Pass: 10
- Total Fail: 0
- Open Defect: 0
- Ready for Sign-off: [x] Yes / [ ] No
