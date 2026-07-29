import { useQuery } from "@tanstack/react-query";
import { Empty, Modal, Skeleton, Space, Typography } from "antd";

import { getReleaseHistory, type ReleaseChanges, releaseQueryKeys } from "@/entities/release";

const changeLabels: Array<[keyof ReleaseChanges, string]> = [
  ["new", "Добавлено"],
  ["improved", "Улучшения"],
  ["fixed", "Исправления"],
  ["security", "Безопасность"],
];

function useReleaseHistory() {
  return useQuery({
    queryKey: releaseQueryKeys.history(),
    queryFn: () => getReleaseHistory(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    meta: { suppressErrorNotification: true },
  });
}

export function ReleaseVersion({ compact = false }: { compact?: boolean }) {
  const query = useReleaseHistory();
  const version = query.data?.currentVersion;
  const label = version ? (compact ? `v${version}` : `Версия ${version}`) : compact ? "—" : "Версия недоступна";

  return (
    <Typography.Text type="secondary" title={version ? `Версия ${version}` : "Версия недоступна"}>
      {label}
    </Typography.Text>
  );
}

export function ReleaseNotesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const query = useReleaseHistory();

  return (
    <Modal open={open} title="Что нового" footer={null} onCancel={onClose}>
      {query.isPending ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : query.isError ? (
        <Empty description="Не удалось загрузить историю обновлений" />
      ) : (
        <Space orientation="vertical" size={24} className="wide">
          {query.data.releases.map((release) => (
            <section key={release.version}>
              <Typography.Title level={4}>
                {release.parentVersion ? "Исправление " : ""}
                {release.version} — {release.codename}
              </Typography.Title>
              <br />
              <Typography.Text type="secondary">
                {new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(new Date(`${release.date}T00:00:00`))}
              </Typography.Text>
              {changeLabels.map(([key, label]) =>
                release.changes[key].length > 0 ? (
                  <div key={key}>
                    <Typography.Text strong>{label}</Typography.Text>
                    <ul>
                      {release.changes[key].map((change) => (
                        <li key={change}>{change}</li>
                      ))}
                    </ul>
                  </div>
                ) : null,
              )}
            </section>
          ))}
        </Space>
      )}
    </Modal>
  );
}
