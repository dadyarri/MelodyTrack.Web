import { Button } from "antd";
import type { ButtonProps } from "antd";
import type { ReactNode } from "react";
import { formatShortcutLabel } from "@/utils/shortcuts";

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
        <span className="shortcut-keycap shortcut-button-keycap" aria-hidden="true">
          {typeof shortcut === "string" ? formatShortcutLabel(shortcut) : shortcut}
        </span>
      </span>
    </Button>
  );
}
