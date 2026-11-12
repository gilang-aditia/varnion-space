import { WORKSPACE_COLORS } from "@/lib/colors";
import type { ActivityAction, WorkspaceColor } from "@/types/drive";
import type { WorkspaceLog } from "./redux/workspaceLogsType";

const COLORS = Object.keys(WORKSPACE_COLORS) as WorkspaceColor[];

/** Warna stabil per workspace (API belum mengirim warna). */
export function workspaceColorOf(id: string): WorkspaceColor {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

/** Kata kunci → jenis aksi (ikon & warna dari `ACTIVITY_META`). Urutan = prioritas. */
const ACTION_KEYWORDS: [RegExp, ActivityAction][] = [
  [/purge|permanent/i, "purge"],
  [/restore/i, "restore"],
  [/delete|remove|trash/i, "delete"],
  [/upload/i, "upload"],
  [/download/i, "download"],
  [/rename/i, "rename"],
  [/move/i, "move"],
  [/create|add|new/i, "create"],
  [/logout/i, "logout"],
  [/login/i, "login"],
  [/member/i, "member_add"],
  [/share|link/i, "link_update"],
  [/view|open/i, "open"],
  [/edit|update|change/i, "edit"],
];

/**
 * Jenis aksi untuk log workspace. Pesan (`_msg`) diperiksa lebih dulu karena
 * lebih spesifik (mis. event `EDIT_FOLDER` dengan pesan "Folder deleted: …").
 */
export function workspaceLogAction(log: WorkspaceLog): ActivityAction {
  for (const source of [log._msg, log.event]) {
    if (!source) continue;
    const hit = ACTION_KEYWORDS.find(([re]) => re.test(source));
    if (hit) return hit[1];
  }
  return "edit";
}
