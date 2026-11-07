"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n, type MessageKey } from "@/lib/i18n";

const tabs: { label: MessageKey; href: string; icon: React.ReactNode; badge?: boolean }[] = [
  {
    label: "nav.home",
    href: "/",
    icon: <path d="M4 10.5L12 4l8 6.5V19a1 1 0 01-1 1h-4.5v-5h-5v5H5a1 1 0 01-1-1v-8.5z" />,
  },
  {
    label: "nav.store",
    href: "/store",
    badge: true,
    icon: (
      <path d="M4 11h16v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8zM3 7.5h18V11H3V7.5zM12 7.5V20M12 7.5S10.5 3 8 3.5 6.5 7.5 12 7.5zm0 0s1.5-4.5 4-4 1.5 4-4 4z" />
    ),
  },
  {
    label: "nav.profile",
    href: "/profile",
    icon: <path d="M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0" />,
  },
];

export default function BottomNav({ storeBadge = 0 }: { storeBadge?: number }) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav className="sticky bottom-0 z-40 border-t border-line bg-card/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-colors ${
                isActive ? "text-accent" : "text-muted hover:text-foreground"
              }`}
            >
              <span
                className={`relative flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                  isActive ? "bg-accent-soft" : ""
                }`}
              >
                <svg
                  className="h-[22px] w-[22px]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {tab.icon}
                </svg>
                {tab.badge && storeBadge > 0 && (
                  <span className="absolute right-2 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-extrabold text-on-accent">
                    {storeBadge}
                  </span>
                )}
              </span>
              {t(tab.label)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
