"use client";

import { useState } from "react";
import { deleteField, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { coupleCol, coupleDoc } from "@/lib/couple";
import { useI18n } from "@/lib/i18n";
import { SAMPLE_QUESTS } from "@/lib/samples";
import BottomSheet from "@/components/BottomSheet";
import QuestIcon, { QUEST_ICONS } from "@/components/QuestIcon";
import { Button, Segmented, inputBase, inputClass, labelClass } from "@/components/ui";
import type { Quest, QuestSchedule } from "@/lib/types";

interface QuestFormProps {
  coupleId: string;
  creatorUid: string;
  creatorName: string;
  partnerId?: string | null;
  partnerName?: string;
  /** When set, the form edits this quest instead of creating one. */
  initial?: Quest;
  onClose: () => void;
}

const POINT_PRESETS = [5, 10, 20, 50];

/** Convert an ISO string to the value a datetime-local input expects. */
function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

export default function QuestForm({
  coupleId,
  creatorUid,
  creatorName,
  partnerId,
  partnerName,
  initial,
  onClose,
}: QuestFormProps) {
  const { t, locale } = useI18n();
  const editing = !!initial?.id;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [icon, setIcon] = useState<string>(initial?.icon ?? QUEST_ICONS[0]);
  const [points, setPoints] = useState(initial?.points ?? 10);
  const [schedule, setSchedule] = useState<QuestSchedule>(initial?.schedule ?? "daily");
  const [target, setTarget] = useState<string>(initial?.target ?? "both");
  const [scheduledAt, setScheduledAt] = useState(toLocalInput(initial?.scheduledAt));
  const [showMore, setShowMore] = useState(
    !!initial && (!!initial.description || (initial.target ?? "both") !== "both")
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Legacy quests may store "me"/"partner" relative to the creator.
  const normalizedTarget =
    target === "me" ? initial?.createdBy ?? creatorUid : target === "partner" ? partnerId ?? "both" : target;

  const targetOptions = [
    { value: "both", label: t("questForm.target.both") },
    { value: creatorUid, label: creatorName },
    ...(partnerId ? [{ value: partnerId, label: partnerName || t("common.partner") }] : []),
  ];

  async function handleSave() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return setError(t("questForm.errTitle"));
    if (!Number.isInteger(points) || points < 1) return setError(t("questForm.errPoints"));
    if (schedule === "special" && !scheduledAt) return setError(t("questForm.errDate"));

    setError("");
    setSaving(true);
    const fields = {
      title: trimmedTitle,
      description: description.trim(),
      icon,
      schedule,
      points,
      target: normalizedTarget,
    };
    const when = schedule === "special" && scheduledAt ? new Date(scheduledAt).toISOString() : null;
    try {
      if (editing && initial?.id) {
        await updateDoc(coupleDoc(db, coupleId, "quests", initial.id), {
          ...fields,
          scheduledAt: when ?? deleteField(),
        });
      } else {
        await setDoc(doc(coupleCol(db, coupleId, "quests")), {
          ...fields,
          ...(when ? { scheduledAt: when } : {}),
          status: "pending",
          createdBy: creatorUid,
          active: true,
          createdAt: serverTimestamp(),
        });
      }
      onClose();
    } catch (e) {
      console.error(e);
      setError(t("questForm.errSave"));
      setSaving(false);
    }
  }

  return (
    <BottomSheet
      title={t(editing ? "questForm.editTitle" : "questForm.newTitle")}
      onClose={onClose}
      footer={
        <>
          {error && <p className="mb-2 text-sm font-semibold text-danger">{error}</p>}
          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? t("common.saving") : t(editing ? "common.save" : "questForm.create")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {!editing && (
          <div>
            <span className={labelClass}>{t("questForm.samples")}</span>
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
              {SAMPLE_QUESTS[locale].map((s) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => {
                    setTitle(s.title);
                    setDescription(s.description);
                    setIcon(s.icon);
                  }}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-bold transition-colors ${
                    s.title === title
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-line bg-card text-foreground hover:bg-soft"
                  }`}
                >
                  <QuestIcon icon={s.icon} className="h-4 w-4" />
                  {s.title}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className={labelClass} htmlFor="quest-title">
            {t("questForm.title")}
          </label>
          <input
            id="quest-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("questForm.titlePlaceholder")}
            maxLength={80}
            className={inputClass}
          />
        </div>

        <div>
          <span className={labelClass}>{t("questForm.icon")}</span>
          <div className="grid grid-cols-8 gap-1.5">
            {QUEST_ICONS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setIcon(name)}
                aria-label={name}
                aria-pressed={icon === name}
                className={`flex aspect-square items-center justify-center rounded-xl transition-colors ${
                  icon === name ? "bg-accent text-on-accent" : "bg-soft text-muted hover:text-foreground"
                }`}
              >
                <QuestIcon icon={name} className="h-[18px] w-[18px]" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="quest-points">
            {t("questForm.points")}
          </label>
          <div className="flex gap-2">
            {POINT_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPoints(p)}
                className={`min-h-11 min-w-0 flex-1 rounded-2xl text-sm font-extrabold transition-colors ${
                  points === p ? "bg-gold-soft text-gold ring-2 ring-gold/40" : "bg-soft text-muted"
                }`}
              >
                {p}
              </button>
            ))}
            <input
              id="quest-points"
              type="number"
              inputMode="numeric"
              min={1}
              value={Number.isNaN(points) ? "" : points}
              onChange={(e) => setPoints(e.target.valueAsNumber)}
              className={`${inputBase} w-20 shrink-0 text-center`}
            />
          </div>
        </div>

        <div>
          <span className={labelClass}>{t("questForm.schedule")}</span>
          <Segmented<QuestSchedule>
            value={schedule}
            onChange={setSchedule}
            options={[
              { value: "daily", label: t("quest.schedule.daily") },
              { value: "weekly", label: t("quest.schedule.weekly") },
              { value: "special", label: t("quest.schedule.special") },
            ]}
          />
        </div>

        {schedule === "special" && (
          <div>
            <label className={labelClass} htmlFor="quest-scheduledAt">
              {t("questForm.scheduledAt")}
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

        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          aria-expanded={showMore}
          className="flex items-center gap-1 self-start text-sm font-bold text-accent"
        >
          <svg viewBox="0 0 24 24" className={`h-4 w-4 transition-transform ${showMore ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
          {t("questForm.more")}
        </button>

        {showMore && (
          <>
            <div>
              <span className={labelClass}>{t("questForm.target")}</span>
              <Segmented value={normalizedTarget} onChange={setTarget} options={targetOptions} />
            </div>
            <div>
              <label className={labelClass} htmlFor="quest-description">
                {t("questForm.description")}
              </label>
              <textarea
                id="quest-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("questForm.descriptionPlaceholder")}
                rows={2}
                maxLength={300}
                className={`${inputClass} resize-none`}
              />
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
