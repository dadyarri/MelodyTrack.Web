import { Button } from "antd";
import type { ComponentType } from "react";

type DraftModalFooterProps = {
  onClearDraft: () => void;
  CancelBtn: ComponentType;
  OkBtn: ComponentType;
};

export function DraftModalFooter({ onClearDraft, CancelBtn, OkBtn }: DraftModalFooterProps) {
  return (
    <>
      <Button onClick={onClearDraft}>Очистить черновик</Button>
      <CancelBtn />
      <OkBtn />
    </>
  );
}
