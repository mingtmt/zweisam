"use client";

import QuestIcon from "@/components/QuestIcon";
import type { Quest } from "@/lib/types";

interface QuestCardProps {
  quest: Quest;
  disabled?: boolean;
  onToggle: (quest: Quest) => void;
  partnerName?: string;
  targetName?: string;
  myDone?: boolean;
  partnerDone?: boolean;
  onDelete?: (quest: Quest) => void;
}

function formatScheduledAt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function QuestCard({
  quest,
  disabled,
  onToggle,
  partnerName,
  targetName,
  myDone,
  partnerDone,
  onDelete,
}: QuestCardProps) {
  const isCompleted = quest.status === "completed";

  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
        isCompleted
          ? "border-zinc-100 bg-zinc-50 opacity-70 dark:border-zinc-800 dark:bg-zinc-900/50"
          : "border-zinc-100 bg-white shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-900/50"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          isCompleted
            ? "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
            : "bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
        }`}
      >
        <QuestIcon icon={quest.icon} className="h-5 w-5" />
      </span>
      <div className="flex-1">
        <h3
          className={`text-sm font-semibold leading-snug ${
            isCompleted ? "text-zinc-400 line-through dark:text-zinc-500" : ""
          }`}
        >
          {quest.title}
        </h3>
        {quest.description && (
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {quest.description}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            {quest.points} pts
          </span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {quest.schedule}
          </span>
          {quest.scheduledAt && formatScheduledAt(quest.scheduledAt) && (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-600 dark:bg-rose-900/40 dark:text-rose-400">
              Due {formatScheduledAt(quest.scheduledAt)}
            </span>
          )}
          {targetName && (
            <span className="rounded-full border border-rose-200 px-2 py-0.5 text-[10px] font-medium text-rose-600 dark:border-rose-800 dark:text-rose-400">
              Only {targetName}
            </span>
          )}
          {myDone && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              ✓ Done by you
            </span>
          )}
          {partnerDone && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              ✓ Done by {partnerName || "your partner"}
            </span>
          )}
          {onDelete && (
            <button
              type="button"
              aria-label="Delete quest"
              disabled={disabled}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(quest);
              }}
              className="ml-auto rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 active:bg-red-100 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-red-950/40"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <input
        type="checkbox"
        checked={isCompleted}
        onChange={() => onToggle(quest)}
        disabled={disabled}
        className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-rose-600"
      />
    </label>
  );
}