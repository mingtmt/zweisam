"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  deleteField,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { coupleIdFor, coupleMembers } from "@/lib/couple";
import { LOCALES, useI18n, type MessageKey } from "@/lib/i18n";
import { logOut } from "@/lib/auth";
import Avatar from "@/components/Avatar";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/Toast";
import { Button, PointsPill, Segmented, cardClass, inputClass, labelClass } from "@/components/ui";
import type { Locale } from "@/lib/types";

const LOCALE_LABEL: Record<Locale, string> = { vi: "Tiếng Việt", en: "English" };

class PairError extends Error {
  constructor(public key: MessageKey) {
    super(key);
  }
}

function NicknameEditor({
  initial,
  placeholder,
  onSave,
  onDone,
}: {
  initial: string;
  placeholder: string;
  onSave: (value: string) => Promise<void>;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  return (
    <form
      className="mt-3 flex w-full gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          await onSave(draft.trim());
          onDone();
        } finally {
          setSaving(false);
        }
      }}
    >
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        maxLength={30}
        className={`${inputClass} py-2.5`}
      />
      <Button type="submit" disabled={saving}>
        {saving ? "…" : t("common.save")}
      </Button>
    </form>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const toast = useToast();
  const { firebaseUser, userDoc, partnerDoc: partner } = useAuth();
  const [copied, setCopied] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [pairing, setPairing] = useState(false);
  const [pairError, setPairError] = useState("");
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [editing, setEditing] = useState<"own" | "partner" | null>(null);

  if (!userDoc || !firebaseUser) return null;
  const uid = firebaseUser.uid;
  const myLabel = userDoc.nickname || userDoc.displayName;

  const handleLogout = async () => {
    await logOut();
    router.push("/login");
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(userDoc.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — the code is visible anyway
    }
  };

  const changeLocale = async (next: Locale) => {
    setLocale(next);
    try {
      await updateDoc(doc(db, "users", uid), { locale: next });
    } catch (e) {
      console.error(e);
      toast(t("profile.err.language"), "error");
    }
  };

  const saveNickname = (targetUid: string) => async (value: string) => {
    try {
      await updateDoc(doc(db, "users", targetUid), { nickname: value ? value : deleteField() });
    } catch (e) {
      console.error(e);
      toast(t("profile.err.nickname"), "error");
      throw e;
    }
  };

  const pairWithPartner = async () => {
    const code = inviteCodeInput.trim().toUpperCase();
    if (!code) return;
    setPairError("");
    setPairing(true);
    try {
      const snap = await getDocs(query(collection(db, "users"), where("inviteCode", "==", code)));
      if (snap.empty) throw new PairError("profile.err.noUser");
      const partnerId = snap.docs[0].id;
      if (partnerId === uid) throw new PairError("profile.err.self");

      const coupleId = coupleIdFor(uid, partnerId);
      await runTransaction(db, async (tx) => {
        const meRef = doc(db, "users", uid);
        const partnerRef = doc(db, "users", partnerId);
        const coupleRef = doc(db, "couples", coupleId);
        const [meSnap, partnerSnap, coupleSnap] = await Promise.all([
          tx.get(meRef),
          tx.get(partnerRef),
          tx.get(coupleRef),
        ]);
        if (meSnap.data()?.partnerId) throw new PairError("profile.err.alreadyPaired");
        if (partnerSnap.data()?.partnerId) throw new PairError("profile.err.partnerPaired");

        tx.update(meRef, { partnerId, coupleId });
        tx.update(partnerRef, { partnerId: uid, coupleId });
        if (!coupleSnap.exists()) {
          tx.set(coupleRef, { members: coupleMembers(uid, partnerId), createdAt: serverTimestamp() });
        }
      });
      setInviteCodeInput("");
    } catch (e: unknown) {
      console.error(e);
      setPairError(t(e instanceof PairError ? e.key : "profile.err.pairFailed"));
    } finally {
      setPairing(false);
    }
  };

  const disconnectFromPartner = async () => {
    setConfirmDisconnect(false);
    const partnerId = userDoc.partnerId;
    if (!partnerId) return;
    setDisconnecting(true);
    try {
      await runTransaction(db, async (tx) => {
        // Couple data is kept so re-pairing restores it.
        tx.update(doc(db, "users", uid), { partnerId: null, coupleId: null });
        tx.update(doc(db, "users", partnerId), { partnerId: null, coupleId: null });
      });
    } catch (e) {
      console.error(e);
      toast(t("profile.err.disconnect"), "error");
    } finally {
      setDisconnecting(false);
    }
  };

  const sectionTitle = "mb-3 text-xs font-extrabold uppercase tracking-wider text-muted";

  return (
    <main className="mx-auto min-h-full max-w-md px-4 pb-6 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <h1 className="mb-4 text-2xl font-black">{t("profile.title")}</h1>

      <section className={`${cardClass} mb-4 flex flex-col items-center px-6 py-6 text-center`}>
        <Avatar src={userDoc.photoURL} name={myLabel} className="h-20 w-20 rounded-full ring-4 ring-accent-soft" />
        <div className="mt-3 flex items-center gap-1.5">
          <h2 className="text-xl font-extrabold">{myLabel}</h2>
          <button
            type="button"
            onClick={() => setEditing(editing === "own" ? null : "own")}
            className="rounded-full px-2 py-1 text-xs font-bold text-accent hover:bg-accent-soft"
          >
            {editing === "own" ? t("common.cancel") : t("profile.nickname")}
          </button>
        </div>
        <p className="text-sm text-muted">{userDoc.email}</p>
        {editing === "own" && (
          <NicknameEditor
            initial={myLabel}
            placeholder={t("profile.yourNickname")}
            onSave={saveNickname(uid)}
            onDone={() => setEditing(null)}
          />
        )}
        <p className="mt-2 text-xs text-muted">{t("profile.nicknameHint")}</p>
        <div className="mt-4 flex items-center gap-2">
          <span className="text-sm font-bold text-muted">{t("profile.points")}</span>
          <PointsPill className="px-3 py-1 text-base">{userDoc.points}</PointsPill>
        </div>
      </section>

      <section className={`${cardClass} mb-4 p-5`}>
        <h3 className={sectionTitle}>{t("profile.pairing")}</h3>
        {userDoc.partnerId ? (
          <div className="flex flex-col gap-3">
            {partner ? (
              <>
                <div className="flex items-center gap-3 rounded-2xl bg-soft p-3">
                  <Avatar
                    src={partner.photoURL}
                    name={partner.nickname || partner.displayName}
                    className="h-12 w-12 rounded-full"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="truncate font-extrabold">{partner.nickname || partner.displayName}</h4>
                      <button
                        type="button"
                        onClick={() => setEditing(editing === "partner" ? null : "partner")}
                        className="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold text-accent hover:bg-accent-soft"
                      >
                        {editing === "partner" ? t("common.cancel") : t("profile.nickname")}
                      </button>
                    </div>
                    <p className="truncate text-xs text-muted">{partner.email}</p>
                  </div>
                  <PointsPill>{partner.points}</PointsPill>
                </div>
                {editing === "partner" && (
                  <NicknameEditor
                    initial={partner.nickname || partner.displayName}
                    placeholder={t("profile.theirNickname")}
                    onSave={saveNickname(userDoc.partnerId)}
                    onDone={() => setEditing(null)}
                  />
                )}
                <p className="text-xs text-muted">{t("profile.partnerNicknameHint")}</p>
                {userDoc.nickname && (
                  <p className="text-sm italic text-muted">{t("profile.theyCallYou", { name: userDoc.nickname })}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">{t("profile.loadingPartner")}</p>
            )}
            <p className="text-sm font-bold text-mint">{t("profile.paired")}</p>
            <Button variant="secondary" onClick={() => setConfirmDisconnect(true)} disabled={disconnecting}>
              {disconnecting ? t("profile.disconnecting") : t("profile.disconnect")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">{t("profile.shareCode")}</p>
            <button
              type="button"
              onClick={copyCode}
              className="w-full rounded-2xl border-2 border-dashed border-accent/40 bg-accent-soft px-4 py-3 text-center font-mono text-2xl font-black tracking-[0.3em] text-accent"
            >
              {userDoc.inviteCode}
            </button>
            {copied && <p className="text-center text-xs font-bold text-mint">{t("profile.copied")}</p>}

            <div className="my-1 flex items-center gap-3 text-muted">
              <div className="h-px flex-1 bg-line" />
              <span className="text-[11px] font-bold uppercase tracking-wider">{t("profile.or")}</span>
              <div className="h-px flex-1 bg-line" />
            </div>

            <label className={labelClass} htmlFor="invite-code">
              {t("profile.enterCode")}
            </label>
            <div className="flex gap-2">
              <input
                id="invite-code"
                value={inviteCodeInput}
                onChange={(e) => {
                  setInviteCodeInput(e.target.value.toUpperCase());
                  setPairError("");
                }}
                placeholder="XXXXXX"
                maxLength={6}
                autoCapitalize="characters"
                className={`${inputClass} text-center font-mono font-black uppercase tracking-[0.3em]`}
              />
              <Button onClick={pairWithPartner} disabled={pairing || inviteCodeInput.trim().length < 6}>
                {pairing ? "…" : t("profile.connect")}
              </Button>
            </div>
            {pairError && <p className="text-sm font-semibold text-danger">{pairError}</p>}
          </div>
        )}
      </section>

      <section className={`${cardClass} mb-4 p-5`}>
        <h3 className={sectionTitle}>{t("profile.language")}</h3>
        <Segmented<Locale>
          value={locale}
          onChange={changeLocale}
          options={LOCALES.map((l) => ({ value: l, label: LOCALE_LABEL[l] }))}
        />
      </section>

      <Button variant="secondary" className="w-full" onClick={handleLogout}>
        {t("profile.signOut")}
      </Button>

      {confirmDisconnect && (
        <ConfirmModal
          title={t("profile.disconnectTitle")}
          message={t("profile.disconnectMessage")}
          confirmLabel={t("profile.disconnect")}
          danger
          onConfirm={disconnectFromPartner}
          onClose={() => setConfirmDisconnect(false)}
        />
      )}
    </main>
  );
}
