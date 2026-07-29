import { Button, Input, Modal, Typography } from "antd";
import type { ReactNode } from "react";
import { useCallback, useId, useState } from "react";

import styles from "./UrlCopyModal.module.css";

export type UrlCopyModalContent = {
  url: string;
  title?: ReactNode;
  description?: ReactNode;
  fieldLabel?: ReactNode;
  copyButtonLabel?: string;
  copiedConfirmation?: string;
  closeLabel?: string;
  warning?: ReactNode;
  context?: ReactNode;
};

export type UrlCopyModalProps = {
  open: boolean;
  content: UrlCopyModalContent | null;
  onClose: () => void;
};

type CopyFeedback = { url: string; kind: "success" | "error"; message: string } | null;

const defaults = {
  title: "Ссылка готова",
  description: "Скопируйте ссылку и отправьте её нужному человеку.",
  fieldLabel: "Ссылка",
  copyButtonLabel: "Скопировать ссылку",
  copiedConfirmation: "Ссылка скопирована",
  closeLabel: "Закрыть",
  copyFailure: "Не удалось скопировать автоматически. Выделите ссылку и скопируйте её вручную.",
};

export function UrlCopyModal({ open, content, onClose }: UrlCopyModalProps) {
  const [feedback, setFeedback] = useState<CopyFeedback>(null);
  const fieldId = useId();
  const focusCopyButton = useCallback((button: HTMLButtonElement | null) => {
    button?.focus();
  }, []);

  if (!content) {
    return null;
  }

  const url = content.url;
  const currentFeedback = feedback?.url === url ? feedback : null;

  const copyUrl = () => {
    const clipboard = Reflect.get(navigator, "clipboard") as Clipboard | undefined;
    if (!clipboard || typeof clipboard.writeText !== "function") {
      setFeedback({ url, kind: "error", message: defaults.copyFailure });
      return;
    }

    let copyAttempt: Promise<void>;
    try {
      copyAttempt = clipboard.writeText(url);
    } catch {
      setFeedback({ url, kind: "error", message: defaults.copyFailure });
      return;
    }

    void copyAttempt.then(
      () => {
        setFeedback({ url, kind: "success", message: content.copiedConfirmation ?? defaults.copiedConfirmation });
      },
      () => {
        setFeedback({ url, kind: "error", message: defaults.copyFailure });
      },
    );
  };

  const close = () => {
    setFeedback(null);
    onClose();
  };

  return (
    <Modal
      className={styles.modal}
      open={open && Boolean(content)}
      title={content.title ?? defaults.title}
      width={560}
      footer={
        <div className={styles.footer}>
          <Button onClick={close}>{content.closeLabel ?? defaults.closeLabel}</Button>
          <Button ref={focusCopyButton} type="primary" className={styles.copyButton} onClick={copyUrl}>
            {content.copyButtonLabel ?? defaults.copyButtonLabel}
          </Button>
        </div>
      }
      onCancel={close}
      destroyOnHidden
    >
      <div className={styles.content}>
        {content.description ?? defaults.description}
        {content.context ? <div>{content.context}</div> : null}
        {content.warning ? <div className={styles.warning}>{content.warning}</div> : null}
        <div className={styles.field}>
          <Typography.Text strong>
            <label htmlFor={fieldId}>{content.fieldLabel ?? defaults.fieldLabel}</label>
          </Typography.Text>
          <Input.TextArea
            id={fieldId}
            className={styles.urlInput}
            readOnly
            value={url}
            autoSize={{ minRows: 2, maxRows: 5 }}
            onFocus={(event) => {
              event.currentTarget.select();
            }}
          />
        </div>
        <Typography.Text
          className={styles.feedback}
          type={currentFeedback?.kind === "error" ? "danger" : currentFeedback?.kind === "success" ? "success" : undefined}
          role="status"
          aria-live="polite"
        >
          {currentFeedback?.message ?? ""}
        </Typography.Text>
      </div>
    </Modal>
  );
}
