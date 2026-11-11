# Varnion Space

Slicing frontend drive internal (mirip Google Drive) dengan workspace, folder bertingkat, RBAC,
riwayat versi file ala GitLab, dan log aktivitas lengkap.

**Stack:** React 19 · Vite · TypeScript · Tailwind CSS v4 · shadcn/ui · Redux Toolkit

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build produksi
npm run lint
```

Secara default aplikasi memakai **mock server** di browser (data tersimpan di localStorage).
Akun demo — kata sandi `varnion123`:

| Username | Peran |
| --- | --- |
| `rizky` | Administrator — akses penuh, kelola pengguna |
| `sinta` | Pengelola Marketing |
| `budi` | Editor Marketing, Pelihat Keuangan |
| `dewi` | Auditor — hanya-baca, melihat seluruh log |

Menu akun → **Reset data demo** mengembalikan data contoh.

## Arsitektur

```
Komponen UI ──dispatch──▶ Redux thunk ──▶ DriveApi ──▶ mock server (default)
     ▲                         │                    └─▶ REST API (VITE_API_MODE=http)
     └──── selector ◀── cache Redux (users, nodes, activity)
```

- **`src/api/`** — kontrak `DriveApi` + implementasi `mock/` dan `http/`. Satu-satunya tempat yang tahu cara bicara dengan server.
- **`src/store/thunks/`** — aksi aplikasi per domain (`session`, `navigation`, `drive`, `admin`). Pola seragam: panggil API → simpan hasil ke cache → sinkronkan log → toast.
- **`src/store/slices/`** — cache data dari API + state UI (route, dialog, toast, preferensi).
- **`src/lib/`** — fungsi murni yang dipakai bersama: aturan RBAC (`rbac.ts`), validasi, format tanggal/ukuran, View Transition.
- **`src/components/`** — UI per fitur (`auth`, `layout`, `drive`, `dialogs`, `activity`, `admin`, `trash`).

Menghubungkan ke backend: lihat **[docs/backend-integration.md](docs/backend-integration.md)**.

## Catatan

- Animasi "kartu workspace → sidebar" memakai View Transitions API dan hanya diputar saat membuka
  workspace dari beranda. Browser yang belum mendukung tetap berfungsi tanpa animasi.
- Mock tidak menyimpan isi file; pratinjau dan unduhan masih berupa tampilan pengganti.
