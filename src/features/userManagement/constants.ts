import type { UserStatus } from "./redux/updateUserType";

/** Status akun sesuai Swagger (`active`, `inactive`, `suspended`). */
export const USER_STATUS_OPTIONS: {
  value: UserStatus;
  label: string;
  description: string;
}[] = [
  {
    value: "active",
    label: "Aktif",
    description: "Dapat masuk dan menggunakan aplikasi.",
  },
  {
    value: "inactive",
    label: "Nonaktif",
    description: "Tidak dapat masuk sampai diaktifkan kembali.",
  },
  {
    value: "suspended",
    label: "Suspended",
    description: "Akses dibekukan sementara.",
  },
];
