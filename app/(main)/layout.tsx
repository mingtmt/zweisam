"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { LocaleSync } from "@/lib/i18n";
import { useCoupleCollection } from "@/lib/hooks/useCoupleCollection";
import { ToastProvider } from "@/components/Toast";
import BottomNav from "@/components/BottomNav";
import type { Claim } from "@/lib/types";

function MainShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { firebaseUser, userDoc, coupleId, loading } = useAuth();
  const { items: claims } = useCoupleCollection<Claim>(coupleId, "claims");
  const toGive = claims.filter((c) => c.rewardOwner === firebaseUser?.uid && !c.fulfilledAt && !c.cancelledAt).length;

  useEffect(() => {
    if (!loading && !firebaseUser) router.replace("/login");
  }, [loading, firebaseUser, router]);

  if (loading || !firebaseUser) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <span className="text-4xl motion-safe:animate-pulse" aria-hidden="true">
          💞
        </span>
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <LocaleSync locale={userDoc?.locale} />
      <div className="flex-1">{children}</div>
      <BottomNav storeBadge={toGive} />
    </div>
  );
}

export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainShell>{children}</MainShell>
      </ToastProvider>
    </AuthProvider>
  );
}
