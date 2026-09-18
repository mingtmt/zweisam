"use client";

import { useState } from "react";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Reward } from "@/lib/types";

interface NewRewardModalProps {
  creatorUid: string;
  onCreated: (reward: Reward) => void;
  onClose: () => void;
}

const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-rose-400 focus:ring-1 focus:ring-rose-400 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-rose-500";
const labelClass =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-400";

export default function NewRewardModal({
  creatorUid,
  onCreated,
  onClose,
}: NewRewardModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState(50);
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

    setError("");
    setSaving(true);
    try {
      const ref = doc(collection(db, "rewards"));
      const reward = {
        title: trimmedTitle,
        description: description.trim(),
        pointCost: points,
        createdBy: creatorUid,
        userId: creatorUid,
        createdAt: serverTimestamp(),
      };
      await setDoc(ref, reward);
      onCreated({ ...reward, id: ref.id } as Reward);
      onClose();
    } catch {
      setError("Failed to create reward. Please try again.");
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
        <h2 className="mb-4 text-lg font-semibold">New Reward</h2>

        <div className="mb-3">
          <label className={labelClass} htmlFor="reward-title">
            Title
          </label>
          <input
            id="reward-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. A weekend getaway"
            className={inputClass}
          />
        </div>

        <div className="mb-3">
          <label className={labelClass} htmlFor="reward-description">
            Description
          </label>
          <textarea
            id="reward-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional details"
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="mb-3">
          <label className={labelClass} htmlFor="reward-points">
            Points
          </label>
          <input
            id="reward-points"
            type="number"
            min={1}
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            className={inputClass}
          />
        </div>

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
            {saving ? "Creating..." : "Create Reward"}
          </button>
        </div>
      </div>
    </div>
  );
}