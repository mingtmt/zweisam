"use client";

import QuestIcon from "@/components/QuestIcon";
import { PointsPill, cardClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import type { Quest } from "@/lib/types";

interface QuestCardProps {
  quest: Quest;
  disabled?: boolean;
  onToggle: (quest: Quest) => void;
  partnerName?: string;
  targetName?: string;
  myDone?: boolean;
  partnerDone?: boolean;
  /** Special quest whose date passed without completion. */
  overdue?: boolean;
  onEdit?: (quest: Quest) => void;
  onDelete?: (quest: Quest) => void;
  /** Points just earned, shown as a floating "+N" (changes key to replay). */
  burst?: { key: number; delta: number } | null;
}

const tag = "rounded-full px-2 py-0.5 text-[11px] font-bold";

export default function QuestCard({
  quest,
  disabled,
  onToggle,
  partnerName,
  targetName,
  myDone,
  partnerDone,
  overdue,
  onEdit,
  onDelete,
  burst,
}: QuestCardProps) {
  const { t, formatDateTime } = useI18n();
  const isCompleted = quest.status === "completed";
  const due = quest.scheduledAt ? formatDateTime(quest.scheduledAt) : "";

  return (
    <div
      className={`${cardClass} relative flex items-start gap-3 p-4 transition-opacity ${
        isCompleted ? "opacity-60" : ""
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
          isCompleted ? "bg-soft text-muted" : "bg-accent-soft text-accent"
        }`}
      >
        <QuestIcon icon={quest.icon} className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <h3 className={`font-extrabold leading-snug ${isCompleted ? "text-muted line-through" : ""}`}>
          {quest.title}
        </h3>
        {quest.description && <p className="mt-0.5 text-sm text-muted">{quest.description}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <PointsPill>{quest.points}</PointsPill>
          <span className={`${tag} bg-soft text-muted`}>{t(`quest.schedule.${quest.schedule}` as const)}</span>
          {due &&
            (overdue ? (
              <span className={`${tag} bg-danger-soft text-danger`}>{t("quest.overdue", { date: due })}</span>
            ) : (
              <span className={`${tag} bg-accent-soft text-accent`}>{t("quest.due", { date: due })}</span>
            ))}
          {targetName && (
            <span className={`${tag} border border-accent/40 text-accent`}>{t("quest.only", { name: targetName })}</span>
          )}
          {myDone && <span className={`${tag} bg-mint-soft text-mint`}>{t("quest.doneByYou")}</span>}
          {partnerDone && (
            <span className={`${tag} bg-mint-soft text-mint`}>
              {t("quest.doneBy", { name: partnerName || t("common.partner") })}
            </span>
          )}
        </div>
        {(onEdit || onDelete) && (
          <div className="mt-2 flex gap-1">
            {onEdit && (
              <button
                type="button"
                aria-label={t("quest.edit")}
                onClick={() => onEdit(quest)}
                className="flex h-9 items-center gap-1 rounded-xl px-2.5 text-xs font-bold text-muted hover:bg-soft hover:text-foreground"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                </svg>
                {t("common.edit")}
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                aria-label={t("quest.delete")}
                onClick={() => onDelete(quest)}
                className="flex h-9 items-center gap-1 rounded-xl px-2.5 text-xs font-bold text-muted hover:bg-danger-soft hover:text-danger"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                </svg>
                {t("common.delete")}
              </button>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        role="checkbox"
        aria-checked={isCompleted}
        aria-label={quest.title}
        disabled={disabled}
        onClick={() => onToggle(quest)}
        className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          isCompleted ? "border-accent bg-accent text-on-accent" : "border-line bg-card text-transparent hover:border-accent"
        }`}
      >
        <svg
          key={isCompleted ? "on" : "off"}
          viewBox="0 0 24 24"
          className={`h-5 w-5 ${isCompleted ? "motion-safe:animate-pop" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
        {burst && burst.delta > 0 && (
          <span
            key={burst.key}
            className="pointer-events-none absolute -top-3 right-0 text-sm font-extrabold text-gold opacity-0 motion-safe:animate-float-up"
          >
            +{burst.delta}
          </span>
        )}
      </button>
    </div>
  );
}
