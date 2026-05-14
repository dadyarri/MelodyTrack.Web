import type { ButtonProps } from "antd";
import { Button } from "antd";
import type { ReactNode } from "react";

type ShortcutButtonProps = Omit<ButtonProps, "children"> & {
  shortcut: ReactNode;
  label: ReactNode;
  leadingIcon?: ReactNode;
};

export function ShortcutButton({ shortcut, label, leadingIcon, className, ...props }: ShortcutButtonProps) {
  return (
    <Button {...props} className={["shortcut-button", className].filter(Boolean).join(" ")}>
      <span className="shortcut-button-content">
        {leadingIcon ? <span className="shortcut-button-icon">{leadingIcon}</span> : null}
        <span className="shortcut-button-label">{label}</span>
        <span className="shortcut-button-keycap" aria-hidden="true">
          {shortcut}
        </span>
      </span>
    </Button>
  );
}
