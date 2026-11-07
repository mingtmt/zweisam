"use client";

import { useState } from "react";
import { doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { coupleCol, coupleDoc } from "@/lib/couple";
import { useI18n } from "@/lib/i18n";
import { SAMPLE_REWARDS } from "@/lib/samples";
import BottomSheet from "@/components/BottomSheet";
import { Button, Segmented, inputBase, inputClass, labelClass } from "@/components/ui";
import type { Reward } from "@/lib/types";

interface RewardFormProps {
  coupleId: string;
  creatorUid: string;
  initial?: Reward;
  onClose: () => void;
}

type LimitMode = "unlimited" | "limited";

export default function RewardForm({ coupleId, creatorUid, initial, onClose }: RewardFormProps) {
  const { t, locale } = useI18n();
  const editing = !!initial?.id;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [cost, setCost] = useState(initial?.pointCost ?? 50);
  const [mode, setMode] = useState<LimitMode>(initial?.maxClaims ? "limited" : "unlimited");
  const [maxClaims, setMaxClaims] = useState(initial?.maxClaims ?? 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return setError(t("rewardForm.errTitle"));
    if (!Number.isInteger(cost) || cost < 1) return setError(t("rewardForm.errCost"));
    if (mode === "limited" && (!Number.isInteger(maxClaims) || maxClaims < 1))
      return setError(t("rewardForm.errLimit"));

    setError("");
    setSaving(true);
    const fields = {
      title: trimmedTitle,
      description: description.trim(),
      pointCost: cost,
      maxClaims: mode === "limited" ? maxClaims : null,
    };
    try {
      if (editing && initial?.id) {
        await updateDoc(coupleDoc(db, coupleId, "rewards", initial.id), fields);
      } else {
        await setDoc(doc(coupleCol(db, coupleId, "rewards")), {
          ...fields,
          claimCount: 0,
          createdBy: creatorUid,
          createdAt: serverTimestamp(),
        });
      }
      onClose();
    } catch (e) {
      console.error(e);
      setError(t("rewardForm.errSave"));
      setSaving(false);
    }
  }

  return (
    <BottomSheet
      title={t(editing ? "rewardForm.editTitle" : "rewardForm.newTitle")}
      onClose={onClose}
      footer={
        <>
          {error && <p className="mb-2 text-sm font-semibold text-danger">{error}</p>}
          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? t("common.saving") : t(editing ? "common.save" : "rewardForm.create")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="rounded-2xl bg-accent-soft px-3.5 py-2.5 text-sm font-semibold text-accent">
          🎁 {t("rewardForm.hint")}
        </p>

        {!editing && (
          <div>
            <span className={labelClass}>{t("rewardForm.samples")}</span>
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
              {SAMPLE_REWARDS[locale].map((s) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => {
                    setTitle(s.title);
                    setDescription(s.description);
                    setCost(s.pointCost);
                  }}
                  className={`shrink-0 rounded-full border px-3 py-2 text-sm font-bold transition-colors ${
                    s.title === title
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-line bg-card text-foreground hover:bg-soft"
                  }`}
                >
                  {s.title}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className={labelClass} htmlFor="reward-title">
            {t("rewardForm.title")}
          </label>
          <input
            id="reward-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("rewardForm.titlePlaceholder")}
            maxLength={80}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="reward-cost">
            {t("rewardForm.cost")}
          </label>
          <input
            id="reward-cost"
            type="number"
            inputMode="numeric"
            min={1}
            value={Number.isNaN(cost) ? "" : cost}
            onChange={(e) => setCost(e.target.valueAsNumber)}
            className={inputClass}
          />
        </div>

        <div>
          <span className={labelClass}>{t("rewardForm.limit")}</span>
          <Segmented<LimitMode>
            value={mode}
            onChange={setMode}
            options={[
              { value: "unlimited", label: t("rewardForm.limit.unlimited") },
              { value: "limited", label: t("rewardForm.limit.limited") },
            ]}
          />
          {mode === "limited" && (
            <div className="mt-2 flex items-center gap-3">
              <label className="flex-1 text-sm font-semibold text-muted" htmlFor="reward-max">
                {t("rewardForm.limitCount")}
              </label>
              <input
                id="reward-max"
                type="number"
                inputMode="numeric"
                min={1}
                value={Number.isNaN(maxClaims) ? "" : maxClaims}
                onChange={(e) => setMaxClaims(e.target.valueAsNumber)}
                className={`${inputBase} w-24 shrink-0 text-center`}
              />
            </div>
          )}
        </div>

        <div>
          <label className={labelClass} htmlFor="reward-description">
            {t("rewardForm.description")}
          </label>
          <textarea
            id="reward-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("rewardForm.descriptionPlaceholder")}
            rows={2}
            maxLength={300}
            className={`${inputClass} resize-none`}
          />
        </div>
      </div>
    </BottomSheet>
  );
}
