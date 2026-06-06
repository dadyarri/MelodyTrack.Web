import { Modal, type ModalProps } from "antd";
import type { ReactNode } from "react";
import { DraftModalFooter } from "./DraftModalFooter";
import { DraftModalTitle } from "./DraftModalTitle";

type DraftFormModalProps = Omit<ModalProps, "title" | "footer"> & {
  title: string;
  restored: boolean;
  onClearDraft: () => void;
  showClearDraft?: boolean;
  children: ReactNode;
};

export function DraftFormModal({ title, restored, onClearDraft, showClearDraft = true, children, ...props }: DraftFormModalProps) {
  return (
    <Modal
      {...props}
      title={<DraftModalTitle title={title} restored={restored} />}
      footer={(_, { CancelBtn, OkBtn }) => (
        <DraftModalFooter onClearDraft={onClearDraft} showClearDraft={showClearDraft} CancelBtn={CancelBtn} OkBtn={OkBtn} />
      )}
    >
      {children}
    </Modal>
  );
}
