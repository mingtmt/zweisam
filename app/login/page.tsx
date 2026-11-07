"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle } from "@/lib/auth";
import { LOCALES, useI18n } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    try {
      setError("");
      setBusy(true);
      await signInWithGoogle(locale);
      router.push("/");
    } catch (e: unknown) {
      console.error(e);
      setError(t("login.failed"));
      setBusy(false);
    }
  };

  return (
    <main className="relative flex flex-1 items-center justify-center px-6">
      <div className="absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] flex gap-1 rounded-full bg-soft p-1">
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase ${
              l === locale ? "bg-card text-accent shadow-sm" : "text-muted"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-[#fb7185] to-[#e11d48] text-5xl font-black text-white shadow-lg shadow-rose-300/40">
          Z
        </div>
        <div>
          <h1 className="text-4xl font-black tracking-tight">Zweisam</h1>
          <p className="mt-2 text-muted">{t("login.tagline")}</p>
        </div>
        <button
          onClick={handleLogin}
          disabled={busy}
          className="flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-line bg-card px-6 font-bold shadow-sm transition hover:bg-soft active:scale-[0.98] disabled:opacity-60"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {t("login.google")}
        </button>
        {error && <p className="text-sm font-semibold text-danger">{error}</p>}
      </div>
    </main>
  );
}
