import { Button } from "antd";
import type { ComponentType } from "react";

type DraftModalFooterProps = {
  onClearDraft: () => void;
  showClearDraft?: boolean;
  CancelBtn: ComponentType;
  OkBtn: ComponentType;
};

export function DraftModalFooter({ onClearDraft, showClearDraft = true, CancelBtn, OkBtn }: DraftModalFooterProps) {
  return (
    <>
      {showClearDraft ? <Button onClick={onClearDraft}>Отбросить черновик</Button> : null}
      <CancelBtn />
      <OkBtn />
    </>
  );
}
