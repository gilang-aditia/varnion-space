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

Bentuk data (`User`, `DriveNode`, `FileVersion`, `ActivityLog`) mengikuti [`src/types/drive.ts`](../src/types/drive.ts). Semua tanggal ISO 8601.

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
| `POST /workspaces/:id/members` | `{ userId, role }` | `DriveNode` (workspace) | `members.manage` | `member_add` |
| `PATCH /workspaces/:id/members/:userId` | `{ role }` | `DriveNode` | `members.manage` | `member_role` |
| `DELETE /workspaces/:id/members/:userId` | – | `DriveNode` | `members.manage` | `member_remove` |
| `POST /nodes/:parentId/folders` | `{ name }` | `DriveNode` | `file.create` | `create` |
| `POST /nodes/:parentId/files` | multipart `files[]` | `DriveNode[]` | `file.create` | `upload` (per file) |
| `PATCH /nodes/:id` | `{ name }` | `DriveNode` | `file.edit` (workspace: `members.manage`) | `rename` |
| `POST /nodes/:id/trash` | – | `DriveNode` | `file.delete` | `delete` |
| `POST /nodes/:id/restore` | – | `DriveNode` | `trash.restore` | `restore` |
| `DELETE /nodes/:id` | – | `{ removedIds: string[] }` | `trash.purge` | `purge` |
| `POST /nodes/:id/views` | `{ version? }` | 204 | anggota | `open` |
| `GET /nodes/:id/download?version=` | – | `{ url, fileName }` | `file.download` | `download` |
| `POST /files/:id/versions` | multipart `file`, `note?` | `DriveNode` | `file.edit` | `edit` |
| `POST /files/:id/versions/:version/restore` | – | `DriveNode` | `file.edit` | `version_restore` |
| `GET /activity?since=&limit=` | – | `ActivityLog[]` (terbaru dulu) | login | – |

## Tanggung jawab server

Mock server ([`src/api/mock/mock-api.ts`](../src/api/mock/mock-api.ts)) adalah referensi perilaku yang diharapkan:

1. **RBAC** — matriks izin ada di [`src/lib/rbac.ts`](../src/lib/rbac.ts). Admin = Pengelola di semua workspace; Auditor = Pelihat di semua workspace + boleh melihat seluruh log; Anggota = sesuai keanggotaan. UI hanya menyembunyikan/mengunci tombol — **server wajib menolak** aksi tanpa izin (403).
2. **Visibilitas** — `GET /nodes` hanya node di workspace yang dapat diakses (termasuk item di sampah dengan `deletedAt`). `GET /activity` hanya log yang boleh dilihat: Admin/Auditor semua; Anggota log miliknya sendiri + log di workspace tempat ia menjadi anggota.
3. **Audit log** — setiap aksi pada tabel di atas menambah satu `ActivityLog` (lihat kolom terakhir). Frontend mengambil log baru lewat `GET /activity?since=<log terbaru>` setelah setiap aksi; polling atau websocket bisa memakai endpoint yang sama.
4. **Versi file** — `versions` diurutkan dari yang paling lama; `version` = versi terakhir. Memulihkan versi lama **tidak menghapus riwayat**: isi versi lama disalin menjadi versi baru dengan `restoredFrom`.
5. **Validasi nama** — aturan di [`src/lib/validation.ts`](../src/lib/validation.ts) (tidak kosong, maks. 120 karakter, tanpa `\ / : * ? " < > |`, unik di folder yang sama, tidak peka huruf besar/kecil).
6. **Pencatatan "membuka"** — sebaiknya di-dedupe (mock: sekali per user per item per 10 menit).

## Catatan skala

`GET /nodes` dan `GET /activity` saat ini dimuat sekaligus setelah login. Untuk data besar, tambahkan paginasi
(`limit`/cursor) — perubahan cukup di `src/api/http/http-api.ts` dan `src/store/thunks/session.ts`.
