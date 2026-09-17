"use client";

import { useState } from "react";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import QuestIcon, { QUEST_ICONS } from "@/components/QuestIcon";
import type { Quest, QuestSchedule } from "@/lib/types";

interface NewQuestModalProps {
  creatorUid: string;
  onCreated: (quest: Quest) => void;
  onClose: () => void;
}

const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-rose-400 focus:ring-1 focus:ring-rose-400 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-rose-500";
const labelClass =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-400";

interface SampleQuest {
  icon: string;
  title: string;
  description: string;
}

const SAMPLE_QUESTS: SampleQuest[] = [
  {
    icon: "coffee",
    title: "Cook together",
    description: "Cook a meal together and enjoy it without phones.",
  },
  {
    icon: "coffee",
    title: "Morning coffee",
    description: "Make morning coffee or tea for your partner.",
  },
  {
    icon: "movie",
    title: "Movie night",
    description: "Pick a film and watch it cuddled up with snacks.",
  },
  {
    icon: "sun",
    title: "Sunrise walk",
    description: "Take a walk together and watch the sunrise.",
  },
  {
    icon: "mail",
    title: "Love letter",
    description: "Write a short love letter and leave it where they'll find it.",
  },
  {
    icon: "sparkles",
    title: "Compliment practice",
    description: "Give each other five genuine compliments today.",
  },
  {
    icon: "moon",
    title: "No-phone hour",
    description: "Spend one hour together without any screens.",
  },
  {
    icon: "dumbbell",
    title: "Workout together",
    description: "Do a 20-minute workout session together.",
  },
  {
    icon: "star",
    title: "Kitchen date",
    description: "Try a new recipe together as a kitchen date.",
  },
  {
    icon: "book",
    title: "Book club of two",
    description: "Read 20 pages of the same book and discuss them.",
  },
];

export default function NewQuestModal({
  creatorUid,
  onCreated,
  onClose,
}: NewQuestModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState<string>(QUEST_ICONS[0]);
  const [points, setPoints] = useState(10);
  const [schedule, setSchedule] = useState<QuestSchedule>("daily");
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }
    if (!Number.isInteger(points) || points < 1) {
      setError("Points must be a whole number of at least 1.");
      return;
    }
    if (schedule === "special" && !scheduledAt) {
      setError("Please select a date and time for a special quest.");
      return;
    }

    setError("");
    setSaving(true);
    try {
      const ref = doc(collection(db, "quests"));
      const quest = {
        title: trimmedTitle,
        description: description.trim(),
        icon,
        schedule,
        points,
        status: "pending" as const,
        createdBy: creatorUid,
        userId: creatorUid,
        active: true,
        scheduledAt:
          schedule === "special" && scheduledAt
            ? new Date(scheduledAt).toISOString()
            : undefined,
        createdAt: serverTimestamp(),
      };
      await setDoc(ref, quest);
      onCreated({ ...quest, id: ref.id } as Quest);
      onClose();
    } catch {
      setError("Failed to create quest. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-lg font-semibold">New Quest</h2>

        <div className="mb-3">
          <span className={labelClass}>Sample quests</span>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {SAMPLE_QUESTS.map((sample) => {
              const selected = sample.title === title;
              return (
                <button
                  key={sample.title}
                  type="button"
                  onClick={() => {
                    setTitle(sample.title);
                    setDescription(sample.description);
                    setIcon(sample.icon);
                  }}
                  className={`flex shrink-0 items-center gap-2 rounded-xl border py-2 pl-2.5 pr-3 text-sm font-medium transition-colors ${
                    selected
                      ? "border-rose-400 bg-rose-50 text-rose-700 dark:border-rose-500 dark:bg-rose-950/30 dark:text-rose-300"
                      : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700/60"
                  }`}
                >
                  <QuestIcon icon={sample.icon} className="h-4 w-4 shrink-0" />
                  {sample.title}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-3">
          <label className={labelClass} htmlFor="quest-title">
            Title
          </label>
          <input
            id="quest-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Cook breakfast together"
            className={inputClass}
          />
        </div>

        <div className="mb-3">
          <label className={labelClass} htmlFor="quest-description">
            Description
          </label>
          <textarea
            id="quest-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional details"
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="mb-3">
          <span className={labelClass}>Icon</span>
          <div className="grid grid-cols-8 gap-1.5">
            {QUEST_ICONS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setIcon(name)}
                aria-label={`Icon ${name}`}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                  icon === name
                    ? "bg-rose-600 text-white"
                    : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                }`}
              >
                <QuestIcon icon={name} className="h-4.5 w-4.5" />
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3 flex gap-3">
          <div className="flex-1">
            <label className={labelClass} htmlFor="quest-points">
              Points
            </label>
            <input
              id="quest-points"
              type="number"
              min={1}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div className="flex-1">
            <label className={labelClass} htmlFor="quest-schedule">
              Schedule
            </label>
            <select
              id="quest-schedule"
              value={schedule}
              onChange={(e) => {
                setSchedule(e.target.value as QuestSchedule);
                setScheduledAt("");
              }}
              className={inputClass}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="special">Special</option>
            </select>
          </div>
        </div>

        {schedule === "special" && (
          <div className="mb-3">
            <label className={labelClass} htmlFor="quest-scheduledAt">
              Date &amp; Time
            </label>
            <input
              id="quest-scheduledAt"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className={inputClass}
            />
          </div>
        )}

        {error && <p className="mb-3 text-xs text-red-500">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="flex-1 rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Quest"}
          </button>
        </div>
      </div>
    </div>
  );
}