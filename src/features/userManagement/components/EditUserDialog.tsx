import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useCurrentUser } from "@/hooks/use-drive";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { USER_STATUS_OPTIONS } from "../constants";
import { updateUser } from "../redux/updateUserAction";
import {
  clearUpdateUserError,
  resetUpdateUserState,
} from "../redux/updateUserSlice";
import type { UpdateUserPayload, UserStatus } from "../redux/updateUserType";
import type { UserData } from "../redux/userType";

/** Dialog "Edit pengguna" → PUT /users/{id}. Hanya field yang berubah yang dikirim. */
export function EditUserDialog({
  user,
  onClose,
}: {
  user: UserData;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const me = useCurrentUser();
  const isSelf = user.id === me?.id;
  const { loading, error: apiError } = useAppSelector(
    (state) => state.updateUser,
  );
  const [form, setForm] = useState({
    display_name: user.display_name,
    password: "",
    status: user.status as UserStatus,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const error = formError ?? apiError;

  // dialog ditutup → bersihkan error/hasil sebelumnya
  useEffect(
    () => () => {
      dispatch(resetUpdateUserState());
    },
    [dispatch],
  );

  const set = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFormError(null);
    if (apiError) dispatch(clearUpdateUserError());
  };

  const changes: UpdateUserPayload = {
    ...(form.display_name.trim() !== user.display_name
      ? { display_name: form.display_name }
      : {}),
    ...(form.password ? { password: form.password } : {}),
    ...(form.status !== user.status ? { status: form.status } : {}),
  };
  const dirty = Object.keys(changes).length > 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.display_name.trim())
      return setFormError("Nama tampilan wajib diisi.");
    if (form.password && form.password.length < 8)
      return setFormError("Kata sandi minimal 8 karakter.");
    if (!dirty) return onClose();

    const result = await dispatch(
      updateUser({ id: user.id, payload: changes }),
    );
    if (updateUser.fulfilled.match(result)) onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Edit pengguna</DialogTitle>
            <DialogDescription className="truncate">
              {user.email}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="eu-name">Nama tampilan</Label>
              <Input
                id="eu-name"
                autoFocus
                value={form.display_name}
                onChange={(e) => set("display_name", e.target.value)}
                placeholder="mis. Budi Santoso"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="eu-pass">Kata sandi baru</Label>
              <div className="relative">
                <Input
                  id="eu-pass"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="Kosongkan bila tidak diganti"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={
                    showPassword
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Status akun</Label>
              <Select
                value={form.status}
                onValueChange={(v) => set("status", v as UserStatus)}
                disabled={isSelf}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {USER_STATUS_OPTIONS.map((o) => (
                    <SelectItem
                      key={o.value}
                      value={o.value}
                      description={o.description}
                    >
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isSelf && (
                <p className="text-xs text-muted-foreground">
                  Anda tidak dapat mengubah status akun sendiri.
                </p>
              )}
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={loading || !dirty}>
              {loading && <Loader2 className="animate-spin" />}
              Simpan perubahan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
