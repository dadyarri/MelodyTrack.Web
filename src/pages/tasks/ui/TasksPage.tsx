import { useRef } from "react";
import { Button, Card, Empty, Form, Input, InputNumber, Modal, Select, Space, Switch, Tabs, Tag, Typography } from "antd";
import {
  CalendarCheckOutlined,
  CheckOutlined,
  CloseOutlined,
  CopyOutlined,
  DownloadOutlined,
  EditOutlined,
  LinkOutlined,
  PhoneOutlined,
  SendOutlined,
} from "@/components/icons";
import { getPhoneUri, getSocialHandle } from "@/entities/client";
import { type RecurringTaskRuleFormValues, useTasksPageController } from "@/features/tasks/useTasksPageController";
import type { RecurringTask, RecurringTaskListStatus, RecurringTaskRule, RecurringTaskType } from "@/api/types";
import { PageLayout } from "@/shared/ui";
import { formatRecordActivitySummary } from "@/utils/staleEntity";
import type { TextAreaRef } from "antd/es/input/TextArea";

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
      <Tabs
        activeKey={controller.activeTab}
        onChange={(key) => {
          controller.setActiveTab(key as "tasks" | "rules");
        }}
        items={[
          {
            key: "tasks",
            label: "Задачи",
            children: (
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
            ),
          },
          {
            key: "rules",
            label: "Правила",
            children: (
              <Space orientation="vertical" size={16} className="wide">
                {controller.rules.length === 0 && !controller.rulesQuery.isLoading ? (
                  <Card>
                    <Empty image={<CalendarCheckOutlined size={28} />} description="Правил пока нет" />
                  </Card>
                ) : null}

                {controller.rules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    onEdit={() => {
                      controller.openRuleEditor(rule);
                    }}
                  />
                ))}
              </Space>
            ),
          },
        ]}
      />
      <RuleEditorModal
        open={Boolean(controller.editingRule)}
        form={controller.ruleForm}
        rule={controller.currentEditingRule}
        savePending={controller.updateRuleMutation.isPending}
        isStale={controller.isEditingRuleStale}
        onCancel={controller.closeRuleEditor}
        onSubmit={controller.submitRuleEditor}
      />
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

function RuleCard({ rule, onEdit }: { rule: RecurringTaskRule; onEdit: () => void }) {
  return (
    <Card
      extra={
        <Button icon={<EditOutlined />} onClick={onEdit}>
          Редактировать
        </Button>
      }
    >
      <Space orientation="vertical" size={12} className="wide">
        <Space align="start" className="wide" style={{ justifyContent: "space-between" }} wrap>
          <div>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {rule.name}
            </Typography.Title>
            <Typography.Text type="secondary">{getTypeLabel(rule.type)}</Typography.Text>
          </div>
          <Space wrap>
            <Tag color={rule.isEnabled ? "success" : "default"}>{rule.isEnabled ? "Включено" : "Выключено"}</Tag>
            {rule.offsetMinutes != null ? <Tag>Смещение: {rule.offsetMinutes} мин</Tag> : null}
            {rule.cooldownDays != null ? <Tag>Повтор: {rule.cooldownDays} дн</Tag> : null}
          </Space>
        </Space>
        <Typography.Paragraph style={{ marginBottom: 0 }}>{rule.messageTemplate}</Typography.Paragraph>
      </Space>
    </Card>
  );
}

function RuleEditorModal({
  open,
  form,
  rule,
  savePending,
  isStale,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  form: ReturnType<typeof Form.useForm<RecurringTaskRuleFormValues>>[0];
  rule?: RecurringTaskRule | null;
  savePending: boolean;
  isStale: boolean;
  onCancel: () => void;
  onSubmit: (values: RecurringTaskRuleFormValues) => void;
}) {
  const messageTemplateInputRef = useRef<TextAreaRef>(null);
  const availableTokens = rule ? getAvailableTemplateTokens(rule.type) : [];

  const insertToken = (token: string) => {
    const textarea = messageTemplateInputRef.current?.resizableTextArea?.textArea;
    const currentValue = (form.getFieldValue("messageTemplate") as string | undefined) ?? "";

    if (!textarea) {
      form.setFieldValue("messageTemplate", `${currentValue}${token}`);
      return;
    }

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const nextValue = `${currentValue.slice(0, selectionStart)}${token}${currentValue.slice(selectionEnd)}`;

    form.setFieldValue("messageTemplate", nextValue);

    requestAnimationFrame(() => {
      const nextCursorPosition = selectionStart + token.length;
      textarea.focus();
      textarea.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  };

  return (
    <Modal
      open={open}
      title={rule ? `Правило: ${rule.name}` : "Правило"}
      onCancel={onCancel}
      onOk={() => {
        form.submit();
      }}
      confirmLoading={savePending}
      okText="Сохранить"
      cancelText="Отмена"
    >
      <Form form={form} layout="vertical" requiredMark={false} onFinish={onSubmit}>
        <Space orientation="vertical" size={12} className="wide">
          {isStale && rule?.lastActivity ? (
            <Typography.Text type="warning">{formatRecordActivitySummary(rule.lastActivity)}</Typography.Text>
          ) : null}
          <Form.Item name="isEnabled" label="Включено" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="messageTemplate" label="Шаблон сообщения" rules={[{ required: true }]}>
            <Input.TextArea ref={messageTemplateInputRef} rows={5} />
          </Form.Item>
          {availableTokens.length > 0 ? (
            <Space orientation="vertical" size={8} className="wide">
              <Typography.Text type="secondary">Доступные шаблоны для быстрой вставки:</Typography.Text>
              <Space wrap>
                {availableTokens.map((item) => (
                  <Button
                    key={item.token}
                    size="small"
                    onClick={() => {
                      insertToken(item.token);
                    }}
                  >
                    {item.token}
                  </Button>
                ))}
              </Space>
              <Space orientation="vertical" size={4} className="wide">
                {availableTokens.map((item) => (
                  <Typography.Text key={`${item.token}:hint`} type="secondary">
                    <strong>{item.token}</strong>: {item.description}
                  </Typography.Text>
                ))}
              </Space>
            </Space>
          ) : null}
          {rule && supportsOffsetMinutes(rule.type) ? (
            <Form.Item name="offsetMinutes" label="Смещение, минут" rules={[{ type: "number", min: 1 }]}>
              <InputNumber min={1} step={15} className="wide" />
            </Form.Item>
          ) : null}
          {rule && supportsCooldownDays(rule.type) ? (
            <Form.Item name="cooldownDays" label="Период повтора, дней" rules={[{ type: "number", min: 1 }]}>
              <InputNumber min={1} className="wide" />
            </Form.Item>
          ) : null}
        </Space>
      </Form>
    </Modal>
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

function supportsOffsetMinutes(type: RecurringTaskType) {
  return type === "appointment-reminder" || type === "trial-follow-up";
}

function supportsCooldownDays(type: RecurringTaskType) {
  return type === "birthday-greeting" || type === "inactive-client-reminder" || type === "teacher-daily-schedule";
}

function getAvailableTemplateTokens(type: RecurringTaskType) {
  const clientTokens = [
    { token: "{Client.FirstName}", description: "Имя клиента" },
    { token: "{Client.LastName}", description: "Фамилия клиента" },
    { token: "{Client.Patronymic}", description: "Отчество клиента" },
  ];

  switch (type) {
    case "appointment-reminder":
      return [
        ...clientTokens,
        { token: "{When}", description: "Слово вроде «сегодня» или «завтра»" },
        { token: "{Appointment.StartTime}", description: "Время начала записи" },
        { token: "{Appointment.Date}", description: "Дата записи" },
        { token: "{Date}", description: "Дата записи" },
      ];
    case "birthday-greeting":
      return [...clientTokens, { token: "{Date}", description: "Текущая бизнес-дата" }];
    case "trial-follow-up":
      return [...clientTokens, { token: "{Date}", description: "Дата формирования задачи" }];
    case "inactive-client-reminder":
      return [...clientTokens, { token: "{Date}", description: "Дата текущего периода напоминания" }];
    case "teacher-daily-schedule":
      return [
        { token: "{Teacher.FirstName}", description: "Имя преподавателя" },
        { token: "{Teacher.LastName}", description: "Фамилия преподавателя" },
        { token: "{Date}", description: "Дата расписания" },
      ];
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
