import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { isValidEmail } from "@/lib/validation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { uiActions } from "@/store/slices/uiSlice";
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
import { createUser } from "../redux/createUserAction";
import {
  clearCreateUserError,
  resetCreateUserState,
} from "../redux/createUserSlice";
import { fetchAllRoles } from "../redux/roleAction";

/** Nilai Select untuk "tanpa peran" (Radix Select tidak menerima value kosong). */
const NO_ROLE = "__none__";

/** Dialog "Tambah pengguna" → POST /users. */
export function CreateUserDialog() {
  const dispatch = useAppDispatch();
  const { loading, error: apiError } = useAppSelector(
    (state) => state.createUser,
  );
  const { allRoles, loadingAll: loadingRoles } = useAppSelector(
    (state) => state.roles,
  );
  const [form, setForm] = useState({
    display_name: "",
    email: "",
    password: "",
    role_code: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const error = formError ?? apiError;

  useEffect(() => {
    if (allRoles.length === 0) void dispatch(fetchAllRoles());
  }, [dispatch, allRoles.length]);

  // dialog ditutup → bersihkan error/hasil sebelumnya
  useEffect(
    () => () => {
      dispatch(resetCreateUserState());
    },
    [dispatch],
  );

  const close = () => dispatch(uiActions.closeDialog());
  const set = (key: keyof typeof form) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFormError(null);
    if (apiError) dispatch(clearCreateUserError());
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.display_name.trim() || !form.email.trim())
      return setFormError("Lengkapi nama dan email.");
    if (!isValidEmail(form.email))
      return setFormError("Format email tidak valid.");
    if (form.password.length < 8)
      return setFormError("Kata sandi minimal 8 karakter.");

    const result = await dispatch(
      createUser({
        display_name: form.display_name,
        email: form.email,
        password: form.password,
        role_code:
          form.role_code && form.role_code !== NO_ROLE
            ? form.role_code
            : undefined,
      }),
    );
    if (createUser.fulfilled.match(result)) close();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Tambah pengguna</DialogTitle>
            <DialogDescription>
              Akun baru dapat langsung masuk menggunakan email dan kata sandi
              awal.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="u-name">Nama tampilan</Label>
              <Input
                id="u-name"
                autoFocus
                value={form.display_name}
                onChange={(e) => set("display_name")(e.target.value)}
                placeholder="mis. Budi Santoso"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="u-email">Email</Label>
              <Input
                id="u-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email")(e.target.value)}
                placeholder="nama@perusahaan.com"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="u-pass">Kata sandi awal</Label>
              <div className="relative">
                <Input
                  id="u-pass"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => set("password")(e.target.value)}
                  placeholder="Minimal 8 karakter"
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
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Peran workspace</Label>
              <Select value={form.role_code} onValueChange={set("role_code")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih peran workspace (opsional)" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value={NO_ROLE}>Tanpa peran</SelectItem>
                  {loadingRoles && allRoles.length === 0 && (
                    <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" /> Memuat
                      peran…
                    </div>
                  )}
                  {allRoles.map((r) => (
                    <SelectItem
                      key={r.id}
                      value={r.code}
                      description={r.description || undefined}
                    >
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              Tambah pengguna
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
