import { Modal, type ModalProps } from "antd";
import type { ReactNode } from "react";

import type { DraftSaveStatus } from "@/shared/lib/react";

import { DraftModalFooter } from "./DraftModalFooter";
import { DraftModalTitle } from "./DraftModalTitle";

type DraftFormModalProps = Omit<ModalProps, "title" | "footer"> & {
  title: string;
  restored: boolean;
  saveStatus?: DraftSaveStatus;
  onClearDraft: () => void;
  showClearDraft?: boolean;
  showDraftState?: boolean;
  children: ReactNode;
};

export function DraftFormModal({
  title,
  restored,
  saveStatus,
  onClearDraft,
  showClearDraft = true,
  showDraftState = true,
  children,
  ...props
}: DraftFormModalProps) {
  return (
    <Modal
      {...props}
      title={showDraftState ? <DraftModalTitle title={title} restored={restored} saveStatus={saveStatus} /> : title}
      footer={(_, { CancelBtn, OkBtn }) => (
        <DraftModalFooter onClearDraft={onClearDraft} showClearDraft={showClearDraft} CancelBtn={CancelBtn} OkBtn={OkBtn} />
      )}
    >
      {children}
    </Modal>
  );
}
