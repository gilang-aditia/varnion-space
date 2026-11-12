import type { WorkspaceStatus } from "./redux/workspaceType";

/** Status workspace sesuai Swagger (`active`, `inactive`, `archived`). */
export const WORKSPACE_STATUS_OPTIONS: {
  value: WorkspaceStatus;
  label: string;
}[] = [
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
  { value: "archived", label: "Diarsipkan" },
];
