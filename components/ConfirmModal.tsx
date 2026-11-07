"use client";

import BottomSheet from "@/components/BottomSheet";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  /** Label for the dismiss button (defaults to "Cancel"). */
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const { t } = useI18n();
  return (
    <BottomSheet
      title={title}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            {cancelLabel ?? t("common.cancel")}
          </Button>
          <Button variant={danger ? "danger" : "primary"} className="flex-1" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="pb-2 text-[15px] text-muted">{message}</p>
    </BottomSheet>
  );
}
