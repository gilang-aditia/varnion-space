# Integrasi Backend

Frontend hanya berbicara dengan interface `DriveApi` di [`src/api/contract.ts`](../src/api/contract.ts).
Saat ini dipakai **mock server** di browser (`src/api/mock`). Untuk memakai backend sungguhan:

```bash
# .env.local
VITE_API_MODE=http
VITE_API_BASE_URL=https://drive.varnion.id/api
```

Tidak ada komponen UI yang perlu diubah. Implementasi HTTP-nya ada di
[`src/api/http/http-api.ts`](../src/api/http/http-api.ts) — sesuaikan path di sana bila endpoint backend berbeda.

**Format JSON: `snake_case`.** Adapter HTTP otomatis mengubah key request ke `snake_case` dan key respons ke
`camelCase` (`can_view` ↔ `canView`, `subject_user_id` ↔ `subjectUserId`, `parent_id` ↔ `parentId`, …).
Tabel di bawah ditulis dalam `snake_case` seperti yang dikirim/diterima backend.

## Autentikasi

- `POST /auth/login` mengembalikan `{ token, user }`.
- Semua request berikutnya mengirim `Authorization: Bearer <token>`.
- Respons **401** di endpoint mana pun → frontend menghapus sesi dan kembali ke halaman login.
- "Ingat saya" hanya menentukan di mana token disimpan (localStorage vs sessionStorage); masa berlaku token diatur backend.

## Format error

Status HTTP non-2xx dengan body:

```json
{ "message": "Sudah ada item bernama \"Laporan\" di lokasi ini.", "code": "VALIDATION", "field": "name" }
```

| Status | `code` | Perilaku UI |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | Sesi berakhir → halaman login (untuk login: pesan di field `password`) |
| 403 | `FORBIDDEN` | Toast "Akses ditolak" |
| 404 | `NOT_FOUND` | Toast |
| 409 | `CONFLICT` | Toast, atau di bawah input bila ada `field` |
| 422 | `VALIDATION` | Ditampilkan di bawah input bila ada `field`, selain itu toast |

## Endpoint

Bentuk data (`User`, `DriveNode`, `FileVersion`, `ActivityLog`, `AccessEntry`) mengikuti
[`src/types/drive.ts`](../src/types/drive.ts). Semua tanggal ISO 8601. Kolom **Izin** memakai flag ACL
folder/file (`can_view`, `can_download`, `can_edit`, `can_delete`, `can_share`) atau izin workspace/sistem.

| Method & path | Body | Respons | Izin | Log yang dicatat |
| --- | --- | --- | --- | --- |
| `POST /auth/login` | `{ identifier, password, device? }` | `{ token, user }` | publik | `login` / `login_failed` |
| `POST /auth/logout` | – | 204 | login | `logout` |
| `GET /auth/me` | – | `User` | login | – |
| `GET /users` | – | `User[]` | login | – |
| `POST /users` | `{ name, email, username, password, title, role }` | `User` | `users.manage` | `user_create` |
| `PATCH /users/:id` | `{ role?, status? }` | `User` | `users.manage` | `user_role` / `user_status` |
| `GET /nodes` | – | `DriveNode[]` | login | – |
| `POST /workspaces` | `{ name, description, color }` | `DriveNode` | `workspace.create` | `create` |
| `POST /workspaces/:id/members` | `{ user_id, role }` | `DriveNode` (workspace) | `members.manage` | `member_add` |
| `PATCH /workspaces/:id/members/:user_id` | `{ role }` | `DriveNode` | `members.manage` | `member_role` |
| `DELETE /workspaces/:id/members/:user_id` | – | `DriveNode` | `members.manage` | `member_remove` |
| `POST /nodes/:parent_id/folders` | `{ name }` | `DriveNode` | `can_edit` pada induk | `create` |
| `POST /nodes/:parent_id/files` | multipart `files[]` | `DriveNode[]` | `can_edit` pada induk | `upload` (per file) |
| `PATCH /nodes/:id` | `{ name }` | `DriveNode` | `can_edit` (workspace: `members.manage`) | `rename` |
| `POST /nodes/:id/move` | `{ parent_id }` | `DriveNode[]` (node + seluruh isinya) | `can_edit` pada item & tujuan | `move` |
| `POST /nodes/:id/trash` | – | `DriveNode` | `can_delete` | `delete` |
| `POST /nodes/:id/restore` | – | `DriveNode` | `trash.restore` | `restore` |
| `DELETE /nodes/:id` | – | `{ removed_ids: string[] }` | `trash.purge` | `purge` |
| `POST /nodes/:id/views` | `{ version? }` | 204 | `can_view` | `open` |
| `GET /nodes/:id/download?version=` | – | `{ url, file_name }` | `can_download` | `download` |
| `GET /nodes/:id/access` | – | `AccessEntry[]` | `can_view` | – |
| `PUT /nodes/:id/access` | `{ entries: AccessEntry[] }` | `DriveNode` | `can_share` | `access_grant` / `access_revoke` (per subjek) |
| `POST /files/:id/versions` | multipart `file`, `note?` | `DriveNode` | `can_edit` | `edit` |
| `POST /files/:id/versions/:version/restore` | – | `DriveNode` | `can_edit` | `version_restore` |
| `GET /activity?since=&limit=` | – | `ActivityLog[]` (terbaru dulu) | login | – |

## Akses per folder & file (ACL)

Setiap folder/file boleh punya daftar aturan akses. Satu aturan (`AccessEntry`):

```json
{
  "can_delete": false,
  "can_download": true,
  "can_edit": false,
  "can_share": false,
  "can_view": true,
  "subject_role_id": "00000000-0000-0000-0000-000000000004",
  "subject_type": "user",
  "subject_user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

- `subject_type: "user"` → berlaku untuk `subject_user_id` — **akun mana pun yang aktif, termasuk di luar workspace**;
  `subject_role_id` = preset yang dipakai (boleh `null` bila kustom).
- `subject_type: "role"` → berlaku untuk semua anggota workspace yang perannya `subject_role_id`; `subject_user_id` = `null`.
- Preset peran (`subject_role_id`) didefinisikan di `ACCESS_ROLES` pada [`src/lib/rbac.ts`](../src/lib/rbac.ts):
  `…0002` Pengelola (semua), `…0003` Editor (view/download/edit/delete), `…0004` Pelihat (view/download).
  **Samakan UUID-nya dengan tabel roles di backend.**

Setiap `DriveNode` yang dikirim server sebaiknya menyertakan:

- `access` — aturan khusus pada node itu (boleh dihilangkan; UI akan memanggil `GET /nodes/:id/access`).
- `my_permissions` — izin **efektif** user yang login: `{ can_view, can_download, can_edit, can_delete, can_share }`.
  UI memakai ini untuk mengunci tombol/menu.

Aturan menghitung izin efektif (implementasi acuan: `resolveNodePermissions` di `src/lib/rbac.ts`):

1. Administrator & Pengelola workspace → akses penuh.
2. Cari aturan mulai dari node itu sendiri lalu naik ke folder induk; aturan pertama yang cocok menang
   (aturan `user` didahulukan dari `role`). Aturan berlaku turun ke seluruh isi folder.
3. Tidak ada aturan → default dari peran workspace (Editor / Pelihat seperti preset di atas);
   **bukan anggota → tanpa akses**. Jadi orang di luar workspace hanya bisa mengakses item yang dibagikan ke dia.
4. Auditor selalu boleh melihat & mengunduh. `can_view = false` → semua izin lain dianggap `false`.
5. Node masuk `GET /nodes` bila `can_view` bernilai true — termasuk item yang dibagikan dari workspace yang
   tidak diikuti user. Frontend menampilkannya di halaman **"Dibagikan ke saya"** (item yang folder induknya
   tidak ikut terkirim, atau yang punya aturan `user` untuk user tsb). Karena aturan diwariskan, isi folder yang
   disembunyikan otomatis ikut tersembunyi.

## Link publik (tanpa login)

Folder/file bisa dibagikan ke **siapa saja yang punya link**. Backend membuat `access_key` acak (≥ 128 bit) dan
menyimpannya di `share_link` pada node:

```json
"share_link": {
  "key": "pub_Q3vR8…",
  "enabled": true,
  "can_download": false,
  "expires_at": "2026-12-11T00:00:00Z",
  "created_by": "<user_id>",
  "created_at": "…",
  "updated_at": "…"
}
```

| Method & path | Body | Respons | Izin | Log |
| --- | --- | --- | --- | --- |
| `PUT /nodes/:id/share-link` | `{ enabled, can_download, expires_at, regenerate? }` | `DriveNode` | `can_share` | `link_update` |
| `GET /public/shares/:key` | – | `PublicShare` | **tanpa login** | `link_view` |
| `GET /public/shares/:key/download?node_id=&version=` | – | `{ url, file_name }` | **tanpa login**, `can_download` pada link | `link_download` |

- `regenerate: true` → buat `key` baru; link lama langsung tidak berlaku.
- URL di frontend: `https://<domain>/#/s/<key>` (folder di dalamnya: `#/s/<key>/<node_id>`).
- `GET /public/shares/:key` → 404 bila key salah, `enabled = false`, lewat `expires_at`, atau item di sampah.
- `PublicShare` = `{ key, permissions: { can_view, can_download }, expires_at, shared_by, root, nodes }` —
  `root`/`nodes` hanya berisi `id, kind, name, parent_id, file_type, size, version, created_at, updated_at`
  (tanpa anggota, ACL, email, atau id pengguna). `nodes` = seluruh isi folder; `root.parent_id = null`.
- Unduhan hanya untuk file di dalam link tersebut; sebaiknya kembalikan signed URL berumur pendek.
- Bila request membawa token valid, catat log atas nama user; tanpa token `actor_id = null`.
- Disarankan: rate limit per IP pada endpoint publik.

## Tanggung jawab server

Mock server ([`src/api/mock/mock-api.ts`](../src/api/mock/mock-api.ts)) adalah referensi perilaku yang diharapkan:

1. **RBAC + ACL** — peran sistem & workspace serta aturan akses folder/file di [`src/lib/rbac.ts`](../src/lib/rbac.ts). Admin = Pengelola di semua workspace; Auditor = Pelihat di semua workspace + boleh melihat seluruh log; Anggota = sesuai keanggotaan & aturan akses. UI hanya menyembunyikan/mengunci tombol — **server wajib menolak** aksi tanpa izin (403).
2. **Visibilitas** — `GET /nodes` hanya node yang boleh dilihat (lihat bagian ACL; termasuk item di sampah dengan `deleted_at`). `GET /activity` hanya log yang boleh dilihat: Admin/Auditor semua; Anggota log miliknya sendiri + log di workspace tempat ia menjadi anggota, kecuali log tentang folder/file yang disembunyikan darinya.
3. **Audit log** — setiap aksi pada tabel di atas menambah satu `ActivityLog` (lihat kolom terakhir). Frontend mengambil log baru lewat `GET /activity?since=<log terbaru>` setelah setiap aksi; polling atau websocket bisa memakai endpoint yang sama.
4. **Versi file** — `versions` diurutkan dari yang paling lama; `version` = versi terakhir. Memulihkan versi lama **tidak menghapus riwayat**: isi versi lama disalin menjadi versi baru dengan `restoredFrom`.
5. **Memindahkan** — frontend menampilkan layar validasi & konfirmasi dulu (izin, antar workspace, nama bentrok,
   aturan akses yang ikut terbawa); server tetap wajib memvalidasi ulang. Tujuan harus folder/workspace aktif, bukan lokasi saat ini, dan bukan node itu sendiri atau isinya.
   Boleh antar workspace: `workspaceId` seluruh isi folder ikut berubah, dan log `move` menyimpan
   `meta.fromWorkspaceId` agar terlihat oleh anggota workspace asal maupun tujuan. Nama yang bentrok di
   tujuan diberi akhiran otomatis, mis. `Laporan (1).pdf`.
6. **Validasi nama** — aturan di [`src/lib/validation.ts`](../src/lib/validation.ts) (tidak kosong, maks. 120 karakter, tanpa `\ / : * ? " < > |`, unik di folder yang sama, tidak peka huruf besar/kecil).
7. **Pencatatan "membuka"** — sebaiknya di-dedupe (mock: sekali per user per item per 10 menit).

## Catatan skala

`GET /nodes` dan `GET /activity` saat ini dimuat sekaligus setelah login. Untuk data besar, tambahkan paginasi
(`limit`/cursor) — perubahan cukup di `src/api/http/http-api.ts` dan `src/store/thunks/session.ts`.
