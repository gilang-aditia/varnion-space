import {
  Check,
  KeyRound,
  Shield,
  ShieldX,
  UserPlus,
  Users,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { uiActions } from "@/store/slices/uiSlice";
import { usePermissions } from "@/hooks/use-drive";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/common/empty-state";
import { UsersTab } from "./components/UsersTab";
import { RolesTab } from "./components/RolesTab";
import { PermissionsTab } from "./components/PermissionsTab";
import { PermissionMatrixTab } from "./components/PermissionMatrixTab";

export function UsersPage() {
  const dispatch = useAppDispatch();
  const total = useAppSelector((s) => s.userList.meta?.total);
  const perms = usePermissions();

  if (!perms.canSystem("users.view")) {
    return (
      <EmptyState
        icon={ShieldX}
        title="Akses ditolak"
        description="Halaman ini hanya untuk Administrator dan Auditor."
        className="h-full"
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Pengguna & Peran
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {total ?? "—"} pengguna
          </p>
        </div>
        {perms.canSystem("users.manage") ? (
          <Button
            className="gap-1.5"
            onClick={() => dispatch(uiActions.openDialog({ type: "newUser" }))}
          >
            <UserPlus className="size-4" />
            Tambah pengguna
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">
            Mode hanya-baca (Auditor)
          </span>
        )}
      </div>

      <Tabs defaultValue="users" className="mt-5">
        <TabsList>
          <TabsTrigger value="users">
            <Users /> Pengguna
          </TabsTrigger>
          <TabsTrigger value="roles">
            <Shield /> Peran
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <KeyRound /> Izin
          </TabsTrigger>
          <TabsTrigger value="matrix">
            <Check /> Matriks hak akses
          </TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-3">
          <UsersTab />
        </TabsContent>
        <TabsContent value="roles" className="mt-3">
          <RolesTab />
        </TabsContent>
        <TabsContent value="permissions" className="mt-3">
          <PermissionsTab />
        </TabsContent>
        <TabsContent value="matrix" className="mt-3">
          <PermissionMatrixTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
