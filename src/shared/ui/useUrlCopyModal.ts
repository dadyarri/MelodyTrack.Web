import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { UrlCopyModalContent, UrlCopyModalProps } from "./UrlCopyModal";

type StoredUrlModal = {
  ownerKey: string | null;
  content: UrlCopyModalContent;
};

export function useUrlCopyModal(ownerKey?: string | null) {
  const normalizedOwnerKey = ownerKey ?? null;
  const [storedModal, setStoredModal] = useState<StoredUrlModal | null>(null);
  const activeOwnerKeyRef = useRef(normalizedOwnerKey);

  useLayoutEffect(() => {
    activeOwnerKeyRef.current = normalizedOwnerKey;
  }, [normalizedOwnerKey]);

  const openUrlModal = useCallback(
    (content: UrlCopyModalContent) => {
      if (activeOwnerKeyRef.current !== normalizedOwnerKey) {
        return;
      }
      setStoredModal({ ownerKey: normalizedOwnerKey, content });
    },
    [normalizedOwnerKey],
  );
  const closeUrlModal = useCallback(() => {
    setStoredModal(null);
  }, []);

  useEffect(() => {
    const cleanupTimer = window.setTimeout(() => {
      setStoredModal((current) => (current?.ownerKey === normalizedOwnerKey ? current : null));
    }, 0);
    return () => {
      window.clearTimeout(cleanupTimer);
    };
  }, [normalizedOwnerKey]);

  const content = storedModal?.ownerKey === normalizedOwnerKey ? storedModal.content : null;
  const urlModalProps = useMemo<UrlCopyModalProps>(
    () => ({
      content,
      open: content !== null,
      onClose: closeUrlModal,
    }),
    [closeUrlModal, content],
  );

  return { openUrlModal, closeUrlModal, urlModalProps };
}
