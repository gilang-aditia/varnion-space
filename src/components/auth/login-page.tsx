import { useRef, useState, type FocusEvent, type FormEvent } from "react";
import { Eye, EyeOff, LoaderCircle, Lock, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { demoLogin, type SerializedApiError } from "@/api";
import { useAppDispatch } from "@/store/hooks";
import { login } from "@/store/thunks";
import { loadRememberedIdentifier } from "@/store/storage";
import { uiActions } from "@/store/slices/uiSlice";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Logo, LogoMark } from "@/components/common/logo";
import { UserAvatar } from "@/components/common/user-avatar";
import { LoginBlobs, type BlobMood } from "./login-blobs";

/* ------------------------------- Panel karakter ------------------------------- */

const GREETING: Record<BlobMood | "peek", string> = {
  idle: "Hai! Kami sudah menunggu Anda 👋",
  grin: "Wah, siapa nih yang datang? 😁",
  shy: "Tenang, kami tidak mengintip… 🙈",
  peek: "Eh… sandinya kelihatan! 👀",
};

function BlobPanel(props: Parameters<typeof LoginBlobs>[0]) {
  const greeting = GREETING[props.mood === "shy" && props.peek ? "peek" : props.mood];
  return (
    <div className="relative hidden overflow-hidden bg-indigo-50 lg:flex lg:flex-col dark:bg-[#141a2e]">
      <div className="p-10 pb-0">
        <div className="inline-flex items-center gap-2.5 rounded-full bg-background/80 py-1.5 pr-4 pl-1.5 shadow-xs">
          <LogoMark className="size-8" />
          <span className="text-sm font-semibold tracking-tight">Varnion Space</span>
        </div>
        <p
          key={greeting}
          className="mt-10 max-w-xl text-3xl leading-tight font-semibold tracking-tight text-slate-900 animate-in fade-in-0 slide-in-from-bottom-1 duration-300 dark:text-white"
        >
          {greeting}
        </p>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Simpan, atur, dan bagikan file tim per workspace — setiap akses dan perubahan tercatat otomatis.
        </p>
      </div>
      {/* absolute → tinggi SVG tidak ikut menentukan tinggi halaman */}
      <div className="relative min-h-0 flex-1">
        <LoginBlobs {...props} />
      </div>
    </div>
  );
}

/* --------------------------------- Halaman --------------------------------- */

export function LoginPage() {
  const dispatch = useAppDispatch();
  const remembered = loadRememberedIdentifier();
  const [identifier, setIdentifier] = useState(remembered);
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(!!remembered);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{
    field: "identifier" | "password";
    message: string;
  } | null>(null);

  // --- reaksi karakter blob ---
  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState<"identifier" | "password" | null>(null);
  const [typingKey, setTypingKey] = useState(0);
  const blobMood: BlobMood =
    focused === "password" ? "shy" : focused === "identifier" && identifier ? "grin" : "idle";
  /** Fokus dihitung per grup (input + tombolnya) agar klik tombol mata tidak dianggap keluar. */
  const trackFocus = (field: "identifier" | "password") => ({
    onFocus: () => setFocused(field),
    onBlur: (e: FocusEvent<HTMLDivElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setFocused(null);
    },
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!identifier.trim())
      return setError({
        field: "identifier",
        message: "Masukkan email atau username.",
      });
    if (!password)
      return setError({ field: "password", message: "Masukkan kata sandi." });
    setLoading(true);
    setError(null);
    try {
      await dispatch(login({ identifier, password, remember })).unwrap();
      // berhasil → App beralih ke halaman utama
    } catch (err) {
      const apiError = err as SerializedApiError;
      setError({
        field: apiError.field === "identifier" ? "identifier" : "password",
        message: apiError.message,
      });
      setLoading(false);
    }
  };

  const inputCls =
    "h-11 w-full rounded-xl border border-input bg-background pr-3 pl-10 text-sm transition outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30";

  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[1.05fr_1fr]">
      <BlobPanel
        mood={blobMood}
        peek={showPassword && password.length > 0}
        typingKey={typingKey}
        identifierRef={identifierRef}
        passwordRef={passwordRef}
      />

      <div className="flex flex-col px-6 py-8 sm:px-10">
        <Logo className="lg:hidden" />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-2xl font-semibold tracking-tight">
            Masuk ke akun Anda
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Gunakan email atau username perusahaan Anda.
          </p>

          <form onSubmit={submit} className="mt-8 grid gap-4" noValidate>
            <div className="grid gap-1.5">
              <Label htmlFor="identifier">Email atau username</Label>
              <div className="relative" {...trackFocus("identifier")}>
                <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={identifierRef}
                  id="identifier"
                  autoComplete="username"
                  autoFocus={!remembered}
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setTypingKey((k) => k + 1);
                    setError(null);
                  }}
                  placeholder="nama@varnion.id"
                  aria-invalid={error?.field === "identifier"}
                  aria-describedby={
                    error?.field === "identifier" ? "login-error" : undefined
                  }
                  className={inputCls}
                />
              </div>
              {error?.field === "identifier" && (
                <p id="login-error" className="text-xs text-destructive">
                  {error.message}
                </p>
              )}
            </div>

            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Kata sandi</Label>
                <button
                  type="button"
                  onClick={() =>
                    dispatch(
                      uiActions.toastAdded({
                        title: "Lupa kata sandi?",
                        description:
                          "Hubungi Administrator untuk mengatur ulang kata sandi Anda.",
                        tone: "info",
                      }),
                    )
                  }
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Lupa kata sandi?
                </button>
              </div>
              <div className="relative" {...trackFocus("password")}>
                <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={passwordRef}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  autoFocus={!!remembered}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setTypingKey((k) => k + 1);
                    setError(null);
                  }}
                  placeholder="••••••••"
                  aria-invalid={error?.field === "password"}
                  aria-describedby={
                    error?.field === "password" ? "login-error" : undefined
                  }
                  className={cn(inputCls, "pr-11")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={
                    showPassword
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {error?.field === "password" && (
                <p id="login-error" className="text-xs text-destructive">
                  {error.message}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={remember}
                onCheckedChange={(v) => setRemember(v === true)}
              />
              <Label htmlFor="remember" className="cursor-pointer font-normal">
                Ingat saya di perangkat ini
              </Label>
            </div>

            <Button
              type="submit"
              size="lg"
              className="mt-2 h-11 rounded-xl text-sm"
              disabled={loading}
            >
              {loading && <LoaderCircle className="size-4 animate-spin" />}
              {loading ? "Memeriksa…" : "Masuk"}
            </Button>
          </form>

          {demoLogin.accounts.length > 0 && (
            <div className="mt-8 rounded-2xl border bg-muted/30 p-3">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-xs font-semibold">Akun demo</p>
                <p className="text-[11px] text-muted-foreground">
                  kata sandi:{" "}
                  <code className="rounded bg-muted px-1 font-mono">
                    {demoLogin.password}
                  </code>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {demoLogin.accounts.map((account) => (
                  <button
                    key={account.username}
                    type="button"
                    onClick={() => {
                      setIdentifier(account.username);
                      setPassword(demoLogin.password);
                      setError(null);
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border bg-background p-2 text-left transition hover:border-primary/40 hover:bg-primary/5",
                      identifier === account.username &&
                        "border-primary/50 bg-primary/5",
                    )}
                    title={account.hint}
                  >
                    <UserAvatar user={account} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium">
                        {account.name}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {account.label}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Varnion Space
        </p>
      </div>
    </div>
  );
}
