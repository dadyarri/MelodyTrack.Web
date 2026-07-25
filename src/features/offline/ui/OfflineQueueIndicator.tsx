import { Badge, Button, Popover, Space, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";

import {
  formatOfflineQueueItem,
  getOfflineSyncStatus,
  loadOfflineQueue,
  offlineQueueChangedEventName,
  type OfflineQueuedCreate,
  offlineSyncStateChangedEventName,
} from "@/entities/offline-queue";
import { CheckCircleOutlined, CloseCircleOutlined, CloudOutlined, CloudSyncOutlined, HourglassOutlined } from "@/shared/ui/icons";

import styles from "./OfflineQueueIndicator.module.css";

export function OfflineQueueIndicator() {
  const [queue, setQueue] = useState<OfflineQueuedCreate[]>([]);
  const [syncStatus, setSyncStatus] = useState(() => getOfflineSyncStatus());

  useEffect(() => {
    const updateQueue = async () => {
      setQueue(await loadOfflineQueue());
    };
    const updateStatus = () => {
      setSyncStatus(getOfflineSyncStatus());
    };
    void updateQueue();
    updateStatus();
    const handleQueueChange = () => void updateQueue();
    window.addEventListener(offlineQueueChangedEventName, handleQueueChange);
    window.addEventListener(offlineSyncStateChangedEventName, updateStatus);
    window.addEventListener("online", handleQueueChange);
    window.addEventListener("offline", handleQueueChange);
    return () => {
      window.removeEventListener(offlineQueueChangedEventName, handleQueueChange);
      window.removeEventListener(offlineSyncStateChangedEventName, updateStatus);
      window.removeEventListener("online", handleQueueChange);
      window.removeEventListener("offline", handleQueueChange);
    };
  }, []);

  const icon = useMemo(() => {
    if (queue.length === 0) {
      return <CloudOutlined />;
    }

    if (syncStatus === "syncing") {
      return <CloudSyncOutlined />;
    }

    if (syncStatus === "error") {
      return <CloseCircleOutlined />;
    }

    if (syncStatus === "pending") {
      return <HourglassOutlined />;
    }

    return <CloudOutlined />;
  }, [queue.length, syncStatus]);

  const label = useMemo(() => {
    if (queue.length === 0) {
      return "Синхронизировано";
    }

    if (syncStatus === "syncing") {
      return "Синхронизация";
    }

    if (syncStatus === "error") {
      return "Ошибка синхронизации";
    }

    return "Ожидает синхронизации";
  }, [queue.length, syncStatus]);

  const content = useMemo(
    () => (
      <Space orientation="vertical" size={8} className={styles.popoverContent}>
        <Space size={8}>
          {queue.length > 0 ? icon : <CheckCircleOutlined />}
          <Typography.Text strong>{label}</Typography.Text>
        </Space>
        {queue.length > 0 ? (
          queue.map((item) => (
            <Typography.Text key={item.id} className={styles.queueItem}>
              {formatOfflineQueueItem(item)}
            </Typography.Text>
          ))
        ) : (
          <Typography.Text type="secondary">Очередь пуста</Typography.Text>
        )}
      </Space>
    ),
    [icon, label, queue],
  );

  return (
    <Popover trigger={["hover", "click"]} placement="bottomRight" content={content}>
      <Badge count={queue.length > 0 ? queue.length : undefined} size="small" offset={[-2, 2]}>
        <Button type="text" shape="circle" className={styles.syncButton} icon={icon} aria-label={label} />
      </Badge>
    </Popover>
  );
}
