"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

// Shared class strings and tiny building blocks for a consistent look.

/** Input look without a width, for inputs sized by the caller. */
export const inputBase =
  "rounded-2xl border border-line bg-soft px-3.5 py-3 text-[15px] outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25";

export const inputClass = `w-full ${inputBase}`;

export const labelClass = "mb-1.5 block text-xs font-bold text-muted";

export const cardClass = "rounded-3xl border border-line bg-card shadow-[0_2px_10px_-4px_rgba(150,80,70,0.15)]";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANT: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-strong active:scale-[0.98]",
  secondary: "border border-line bg-card text-foreground hover:bg-soft active:scale-[0.98]",
  danger: "bg-danger text-white hover:opacity-90 active:scale-[0.98] dark:text-[#2a0f0f]",
  ghost: "text-accent hover:bg-accent-soft",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold transition disabled:pointer-events-none disabled:opacity-45 ${VARIANT[variant]} ${className}`}
    />
  );
}

/** Pill-style segmented control. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-2xl bg-soft p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`min-h-10 flex-1 rounded-xl px-2 text-sm font-bold transition-colors ${
            value === o.value ? "bg-card text-accent shadow-sm" : "text-muted hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PointsPill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-extrabold text-gold ${className}`}>
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden="true">
        <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7.1L12 17.3 5.8 21l1.6-7.1L2 9.2l7.1-.6L12 2z" />
      </svg>
      {children}
    </span>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`${cardClass} flex animate-pulse items-center gap-3 p-4`}>
          <div className="h-11 w-11 rounded-2xl bg-soft" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/3 rounded-full bg-soft" />
            <div className="h-3 w-1/3 rounded-full bg-soft" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ emoji, children }: { emoji: string; children: ReactNode }) {
  return (
    <div className={`${cardClass} flex flex-col items-center gap-2 px-6 py-10 text-center`}>
      <span className="text-4xl" aria-hidden="true">{emoji}</span>
      <p className="text-sm text-muted">{children}</p>
    </div>
  );
}

export function ErrorState({ message, retryLabel, onRetry }: { message: string; retryLabel: string; onRetry: () => void }) {
  return (
    <div className={`${cardClass} flex flex-col items-center gap-3 px-6 py-8 text-center`}>
      <span className="text-3xl" aria-hidden="true">🥲</span>
      <p className="text-sm text-muted">{message}</p>
      <Button variant="secondary" onClick={onRetry}>
        {retryLabel}
      </Button>
    </div>
  );
}
