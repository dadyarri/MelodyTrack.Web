import { Button, Card, Empty, Segmented, Space, Tag, Typography } from "antd";
import { CalendarCheckOutlined, CheckOutlined, CloseOutlined, CopyOutlined, LinkOutlined, PhoneOutlined, SendOutlined } from "@/components/icons";
import { getPhoneUri, getSocialHandle } from "@/entities/client";
import { useTasksPageController } from "@/features/tasks/useTasksPageController";
import type { RecurringTask, RecurringTaskType } from "@/api/types";
import { PageLayout } from "@/shared/ui";

const typeOptions: { label: string; value: RecurringTaskType | "all" }[] = [
  { label: "Все", value: "all" },
  { label: "Записи", value: "appointment-reminder" },
  { label: "Дни рождения", value: "birthday-greeting" },
  { label: "После пробного", value: "trial-follow-up" },
  { label: "Неактивные", value: "inactive-client-reminder" },
];

export function TasksPage() {
  const controller = useTasksPageController();

  return (
    <PageLayout title="Задачи">
      <Space orientation="vertical" size={16} className="wide">
        <Card>
          <Segmented
            block
            options={typeOptions}
            value={controller.type}
            onChange={(value) => {
              controller.setType(value);
            }}
          />
        </Card>

        {controller.tasks.length === 0 && !controller.query.isLoading ? (
          <Card>
            <Empty image={<CalendarCheckOutlined size={28} />} description="Задач пока нет" />
          </Card>
        ) : null}

        {controller.tasks.map((task) => (
          <TaskCard
            key={task.deduplicationKey}
            task={task}
            completePending={controller.completeMutation.isPending && controller.completeMutation.variables.deduplicationKey === task.deduplicationKey}
            skipPending={controller.skipMutation.isPending && controller.skipMutation.variables.deduplicationKey === task.deduplicationKey}
            onComplete={() => {
              controller.completeTask(task);
            }}
            onSkip={() => {
              controller.skipTask(task);
            }}
          />
        ))}
      </Space>
    </PageLayout>
  );
}

function TaskCard({
  task,
  completePending,
  skipPending,
  onComplete,
  onSkip,
}: {
  task: RecurringTask;
  completePending: boolean;
  skipPending: boolean;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const telegramLink = task.telegram ? buildTelegramLink(task.telegram, task.preparedMessage) : undefined;
  const vkLink = task.vk ? buildVkLink(task.vk) : undefined;

  return (
    <Card loading={completePending || skipPending}>
      <Space orientation="vertical" size={12} className="wide">
        <Space align="start" className="wide" style={{ justifyContent: "space-between" }} wrap>
          <div>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {task.title}
            </Typography.Title>
            <Typography.Text strong>{task.relatedPersonDisplayName}</Typography.Text>
          </div>
          <Space wrap>
            <Tag>{getTypeLabel(task.type)}</Tag>
            {task.relevantAtUtc ? <Tag>{formatRelevantDate(task.relevantAtUtc)}</Tag> : <Tag>{formatBusinessDate(task.businessDate)}</Tag>}
          </Space>
        </Space>

        <Space wrap>
          {task.phone ? (
            <Button icon={<PhoneOutlined />} href={getPhoneUri(task.phone)}>
              Позвонить
            </Button>
          ) : null}
          {telegramLink ? (
            <Button icon={<SendOutlined />} href={telegramLink}>
              Telegram
            </Button>
          ) : null}
          {vkLink ? (
            <Button
              icon={<LinkOutlined />}
              onClick={() => {
                void copyPreparedMessage(task.preparedMessage).then(() => {
                  window.open(vkLink, "_blank", "noopener,noreferrer");
                });
              }}
            >
              VK
            </Button>
          ) : null}
          <Button
            icon={<CopyOutlined />}
            onClick={() => {
              void copyPreparedMessage(task.preparedMessage);
            }}
          >
            Скопировать текст
          </Button>
          <Button type="primary" icon={<CheckOutlined />} loading={completePending} onClick={onComplete}>
            Завершить
          </Button>
          <Button icon={<CloseOutlined />} loading={skipPending} onClick={onSkip}>
            Пропустить
          </Button>
        </Space>
      </Space>
    </Card>
  );
}

function getTypeLabel(type: RecurringTaskType) {
  switch (type) {
    case "appointment-reminder":
      return "Напоминание";
    case "birthday-greeting":
      return "День рождения";
    case "trial-follow-up":
      return "После пробного";
    case "inactive-client-reminder":
      return "Неактивный клиент";
  }
}

function formatRelevantDate(value: string) {
  const formatter = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return formatter.format(new Date(value));
}

function formatBusinessDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function buildTelegramLink(value: string, message: string) {
  const handle = getSocialHandle(value, "telegram");
  return handle ? `tg://resolve?domain=${encodeURIComponent(handle)}&text=${encodeURIComponent(message)}` : undefined;
}

function buildVkLink(value: string) {
  const handle = getSocialHandle(value, "vk");
  return handle ? `https://vk.me/${handle}` : undefined;
}

async function copyPreparedMessage(message: string) {
  await navigator.clipboard.writeText(message);
}
