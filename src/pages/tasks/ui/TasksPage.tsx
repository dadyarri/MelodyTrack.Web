import { Button, Card, Empty, Select, Space, Tag, Typography } from "antd";
import {
  CalendarCheckOutlined,
  CheckOutlined,
  CloseOutlined,
  CopyOutlined,
  DownloadOutlined,
  LinkOutlined,
  PhoneOutlined,
  SendOutlined,
} from "@/components/icons";
import { getPhoneUri, getSocialHandle } from "@/entities/client";
import { useTasksPageController } from "@/features/tasks/useTasksPageController";
import type { RecurringTask, RecurringTaskListStatus, RecurringTaskType } from "@/api/types";
import { PageLayout } from "@/shared/ui";

const statusOptions: { label: string; value: RecurringTaskListStatus }[] = [
  { label: "Открытые", value: "open" },
  { label: "Завершённые", value: "completed" },
  { label: "Пропущенные", value: "skipped" },
];

const typeOptions: { label: string; value: RecurringTaskType | "all" }[] = [
  { label: "Все типы", value: "all" },
  { label: "Напоминания о записи", value: "appointment-reminder" },
  { label: "Поздравления с днём рождения", value: "birthday-greeting" },
  { label: "После пробного занятия", value: "trial-follow-up" },
  { label: "Вернуть клиента", value: "inactive-client-reminder" },
  { label: "Расписание преподавателя", value: "teacher-daily-schedule" },
];

export function TasksPage() {
  const controller = useTasksPageController();

  return (
    <PageLayout title="Задачи">
      <Space orientation="vertical" size={16} className="wide">
        <Card>
          <Space wrap size={12}>
            <Select
              value={controller.status}
              options={statusOptions}
              style={{ minWidth: 200 }}
              onChange={(value) => {
                controller.setStatus(value);
              }}
            />
            <Select
              value={controller.type}
              options={typeOptions}
              style={{ minWidth: 280 }}
              onChange={(value) => {
                controller.setType(value);
              }}
            />
          </Space>
        </Card>

        {controller.tasks.length === 0 && !controller.query.isLoading ? (
          <Card>
            <Empty image={<CalendarCheckOutlined size={28} />} description={getEmptyDescription(controller.status)} />
          </Card>
        ) : null}

        {controller.tasks.map((task) => (
          <TaskCard
            key={task.deduplicationKey}
            task={task}
            completePending={
              controller.completeMutation.isPending && controller.completeMutation.variables.deduplicationKey === task.deduplicationKey
            }
            skipPending={controller.skipMutation.isPending && controller.skipMutation.variables.deduplicationKey === task.deduplicationKey}
            listStatus={controller.status}
            onComplete={() => {
              controller.completeTask(task);
            }}
            onSkip={() => {
              controller.skipTask(task);
            }}
            onDownloadSchedule={() => {
              void controller.downloadTeacherSchedule(task);
            }}
            onOpenTeacherScheduleMessenger={(messengerUrl) => {
              void controller.openTeacherScheduleMessenger(task, messengerUrl);
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
  listStatus,
  onComplete,
  onSkip,
  onDownloadSchedule,
  onOpenTeacherScheduleMessenger,
}: {
  task: RecurringTask;
  completePending: boolean;
  skipPending: boolean;
  listStatus: RecurringTaskListStatus;
  onComplete: () => void;
  onSkip: () => void;
  onDownloadSchedule: () => void;
  onOpenTeacherScheduleMessenger: (messengerUrl: string) => void;
}) {
  const telegramLink = task.telegram ? buildTelegramLink(task.telegram, task.preparedMessage) : undefined;
  const vkLink = task.vk ? buildVkLink(task.vk) : undefined;
  const isOpenTask = listStatus === "open";
  const isTeacherSchedule = task.type === "teacher-daily-schedule";

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
          <Space orientation="vertical" size={8} style={{ alignItems: "flex-end" }}>
            <Space wrap style={{ justifyContent: "flex-end" }}>
              <Tag>{getTypeLabel(task.type)}</Tag>
              {task.relevantAtUtc ? (
                <Tag>{formatRelevantDate(task.relevantAtUtc)}</Tag>
              ) : (
                <Tag>{formatBusinessDate(task.businessDate)}</Tag>
              )}
              {isOpenTask ? null : <Tag color={listStatus === "completed" ? "success" : "default"}>{getStatusLabel(listStatus)}</Tag>}
            </Space>
          </Space>
        </Space>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <Space wrap>
            {task.phone && !isTeacherSchedule ? (
              <Button icon={<PhoneOutlined />} href={getPhoneUri(task.phone)}>
                Позвонить
              </Button>
            ) : null}
            {telegramLink ? (
              <Button
                icon={<SendOutlined />}
                onClick={
                  isTeacherSchedule
                    ? () => {
                        onOpenTeacherScheduleMessenger(telegramLink);
                      }
                    : () => {
                        window.location.href = telegramLink;
                      }
                }
              >
                Telegram
              </Button>
            ) : null}
            {vkLink ? (
              <Button
                icon={<LinkOutlined />}
                onClick={() => {
                  if (isTeacherSchedule) {
                    onOpenTeacherScheduleMessenger(vkLink);
                    return;
                  }

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
            {task.type === "teacher-daily-schedule" && task.teacherId ? (
              <Button icon={<DownloadOutlined />} onClick={onDownloadSchedule}>
                Скачать PNG
              </Button>
            ) : null}
          </Space>
          {isOpenTask ? (
            <Space wrap>
              <Button type="primary" icon={<CheckOutlined />} loading={completePending} onClick={onComplete}>
                Завершить
              </Button>
              <Button icon={<CloseOutlined />} loading={skipPending} onClick={onSkip}>
                Пропустить
              </Button>
            </Space>
          ) : null}
        </div>
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
      return "Вернуть клиента";
    case "teacher-daily-schedule":
      return "Расписание";
  }
}

function getStatusLabel(status: RecurringTaskListStatus) {
  switch (status) {
    case "completed":
      return "Завершена";
    case "skipped":
      return "Пропущена";
    case "open":
      return "Открыта";
  }
}

function getEmptyDescription(status: RecurringTaskListStatus) {
  switch (status) {
    case "completed":
      return "Завершённых задач пока нет";
    case "skipped":
      return "Пропущенных задач пока нет";
    case "open":
      return "Открытых задач пока нет";
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
