import { SyncOutlined, WarningOutlined } from "@/components/icons";
import { Tag } from "antd";
import styles from "./OfflineSyncStateTag.module.css";

type OfflineSyncState = "syncing" | "error" | "synced";

export function OfflineSyncStateTag({ syncState, errorMessage }: { syncState: OfflineSyncState; errorMessage?: string }) {
  if (syncState === "syncing") {
    return (
      <Tag icon={<SyncOutlined spin />} color="processing">
        Синхронизация
      </Tag>
    );
  }

  if (syncState === "error") {
    return (
      <Tag icon={<WarningOutlined />} color="error" className={styles.errorTag}>
        <span className={styles.errorText}>{errorMessage ? `Ошибка: ${errorMessage}` : "Ошибка синхронизации"}</span>
      </Tag>
    );
  }

  return null;
}
