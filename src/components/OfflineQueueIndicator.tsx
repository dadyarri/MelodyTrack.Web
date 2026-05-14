import { CheckCircleOutlined, CloudOutlined, CloudSyncOutlined, CloseCircleOutlined, HourglassOutlined } from "@ant-design/icons";
import { Badge, Button, Popover, Space, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { formatOfflineQueueItem, loadOfflineQueue, offlineQueueChangedEventName } from "../utils/offlineQueue";
import { getOfflineSyncStatus, offlineSyncStateChangedEventName } from "../utils/offlineSyncState";

export function OfflineQueueIndicator() {
  const [queue, setQueue] = useState(() => loadOfflineQueue());
  const [syncStatus, setSyncStatus] = useState(() => getOfflineSyncStatus());

  useEffect(() => {
    const updateQueue = () => setQueue(loadOfflineQueue());
    const updateStatus = () => setSyncStatus(getOfflineSyncStatus());
    updateQueue();
    updateStatus();
    window.addEventListener(offlineQueueChangedEventName, updateQueue);
    window.addEventListener(offlineSyncStateChangedEventName, updateStatus);
    window.addEventListener("online", updateQueue);
    window.addEventListener("offline", updateQueue);
    return () => {
      window.removeEventListener(offlineQueueChangedEventName, updateQueue);
      window.removeEventListener(offlineSyncStateChangedEventName, updateStatus);
      window.removeEventListener("online", updateQueue);
      window.removeEventListener("offline", updateQueue);
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
      <Space direction="vertical" size={8} className="offline-queue-popover">
        <Space size={8}>
          {queue.length > 0 ? icon : <CheckCircleOutlined />}
          <Typography.Text strong>{label}</Typography.Text>
        </Space>
        {queue.length > 0 ? (
          queue.map((item) => (
            <Typography.Text key={item.id} className="offline-queue-item">
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
        <Button type="text" shape="circle" className="app-sync-button" icon={icon} aria-label={label} />
      </Badge>
    </Popover>
  );
}
