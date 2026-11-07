"use client";

import { useI18n } from "@/lib/i18n";
import { completionFor, isEligible, isWholeExpired } from "@/lib/quests";
import type { Quest } from "@/lib/types";

interface TodayProgressProps {
  quests: Quest[];
  uid: string;
  partnerId: string;
  myName: string;
  partnerName: string;
  now: number;
}

/** Done / total of today's daily quests for one person. */
function progressFor(quests: Quest[], who: string, other: string, now: number) {
  const daily = quests.filter(
    (q) => q.active !== false && q.schedule === "daily" && isEligible(q, who, other)
  );
  const done = daily.filter((q) => !isWholeExpired(q, now) && completionFor(q, who)).length;
  return { done, total: daily.length };
}

function Bar({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs font-bold">
        <span className="truncate text-muted">{label}</span>
        <span className={done === total ? "text-mint" : "text-foreground"}>
          {done}/{total}
        </span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-soft"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${done === total ? "bg-mint" : "bg-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function TodayProgress({ quests, uid, partnerId, myName, partnerName, now }: TodayProgressProps) {
  const { t } = useI18n();
  const me = progressFor(quests, uid, partnerId, now);
  const partner = progressFor(quests, partnerId, uid, now);
  if (me.total === 0 && partner.total === 0) return null;

  const finished = [
    me.total > 0 && me.done === me.total ? myName : null,
    partner.total > 0 && partner.done === partner.total ? partnerName : null,
  ].filter((n): n is string => !!n);

  return (
    <section className="mb-5 rounded-3xl border border-line bg-card p-4">
      <h2 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-muted">{t("home.today")}</h2>
      <div className="flex flex-col gap-3">
        {me.total > 0 && <Bar label={myName} done={me.done} total={me.total} />}
        {partner.total > 0 && <Bar label={partnerName} done={partner.done} total={partner.total} />}
      </div>
      {finished.map((name) => (
        <p key={name} className="mt-3 text-sm font-bold text-mint motion-safe:animate-pop">
          {t("home.todayDone", { name })}
        </p>
      ))}
    </section>
  );
}
