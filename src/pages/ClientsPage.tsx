import { DeleteOutlined, EditOutlined, PlusOutlined, ProfileOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Button, Drawer, Form, Input, Modal, Space, Tag, Typography, type InputProps, type InputRef } from "antd";
import IMask from "imask";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { IMaskMixin, type IMaskInputProps } from "react-imask";
import { useNavigate } from "react-router";
import { clientsApi } from "../api/crm";
import { Client } from "../api/types";
import { getApiErrorMessages } from "../api/http";
import { ClientHistoryPanel } from "../components/ClientHistoryPanel";
import { DraftModalTitle } from "../components/DraftModalTitle";
import { ListFilters } from "../components/ListFilters";
import { ListTable } from "../components/ListTable";
import { PageHeader } from "../components/PageHeader";
import { ShortcutButton } from "../components/ShortcutButton";
import { clearDraft, createReplayKey, loadDraft, saveDraft } from "../utils/drafts";
import { formatMoney } from "../utils/money";
import { isShortcutTarget, matchesPlainKey } from "../utils/shortcuts";

type ClientFormValues = Client & { telegram?: string | null; vk?: string | null; phone?: string | null };
type ClientRow = Client & { telegram?: string | null; vk?: string | null; phone?: string | null };
type ClientSubmitInput = {
  firstName: string;
  lastName: string;
  patronymic?: string | null;
  telegram?: string;
  vk?: string;
  phone?: string;
};

const russianPhoneMask = {
  mask: "+{7} (000) 000-00-00",
};
const formatRussianPhone = IMask.createPipe(russianPhoneMask, IMask.PIPE_TYPE.UNMASKED, IMask.PIPE_TYPE.MASKED);
type MaskedAntdInputProps = IMaskInputProps<HTMLInputElement> & Pick<InputProps, "placeholder" | "inputMode" | "autoComplete" | "disabled" | "status" | "size">;
const MaskedAntdInput = IMaskMixin<HTMLInputElement, MaskedAntdInputProps>(({ inputRef, ...props }) => (
  <Input
    {...props}
    ref={(node: InputRef | null) => {
      const input = node?.input ?? null;
      if (typeof inputRef === "function") {
        inputRef(input);
      } else if (inputRef) {
        inputRef.current = input;
      }
    }}
  />
));

export function ClientsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Client | null>(null);
  const hasCreateDraft = Boolean(loadDraft<ClientDraftValues>(CLIENT_CREATE_DRAFT_KEY));
  const [isCreateOpen, setCreateOpen] = useState(() => hasCreateDraft);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const draftReplayKeyRef = useRef(loadDraft<ClientDraftValues>(CLIENT_CREATE_DRAFT_KEY)?.replayKey ?? createReplayKey());
  const isDraftHydratingRef = useRef(false);
  const [createPhoneInputKey, setCreatePhoneInputKey] = useState(() => (hasCreateDraft ? 1 : 0));
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message, modal } = AntdApp.useApp();
  const showErrors = (error: unknown) => getApiErrorMessages(error).forEach((errorMessage) => message.error(errorMessage));
  const query = useQuery({
    queryKey: ["clients", page, search],
    queryFn: () => clientsApi.list({ page, page_size: 10, search: search.trim() || undefined }),
  });
  const historyQuery = useQuery({
    queryKey: ["clients", "history", historyClient?.id],
    queryFn: () => clientsApi.history(historyClient!.id),
    enabled: Boolean(historyClient),
  });

  const saveMutation = useMutation({
    mutationFn: (values: ClientFormValues) => {
      const input = prepareClientInput(values);
      return editing ? clientsApi.update(editing.id, input) : clientsApi.create(input, { replayKey: draftReplayKeyRef.current });
    },
    onSuccess: async () => {
      message.success("Клиент сохранен");
      setCreateOpen(false);
      setEditing(null);
      clearDraft(CLIENT_CREATE_DRAFT_KEY);
      draftReplayKeyRef.current = createReplayKey();
      pauseDraftHydration(isDraftHydratingRef, () => form.resetFields());
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: showErrors,
  });

  const deleteMutation = useMutation({
    mutationFn: clientsApi.remove,
    onSuccess: async () => {
      message.success("Клиент удален");
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: showErrors,
  });

  const openEditor = useCallback(
    (client?: Client) => {
      if (client) {
        setEditing(client);
        setCreateOpen(true);
        pauseDraftHydration(isDraftHydratingRef, () => {
          form.resetFields();
          form.setFieldsValue({
            ...client,
            telegram: getContactValue(client, "telegram"),
            vk: getContactValue(client, "vk"),
            phone: getRussianPhoneDigits(getContactValue(client, "phone")),
          });
        });
        return;
      }

      const draft = loadDraft<ClientDraftValues>(CLIENT_CREATE_DRAFT_KEY);
      setEditing(null);
      setCreateOpen(true);
      draftReplayKeyRef.current = draft?.replayKey ?? createReplayKey();
      setCreatePhoneInputKey((current) => current + 1);
      pauseDraftHydration(isDraftHydratingRef, () => {
        form.resetFields();
        form.setFieldsValue(draft?.values ?? {});
      });
    },
    [form],
  );

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  useLayoutEffect(() => {
    if (isCreateOpen && !editing) {
      const draft = loadDraft<ClientDraftValues>(CLIENT_CREATE_DRAFT_KEY);
      if (draft) {
        pauseDraftHydration(isDraftHydratingRef, () => {
          form.setFieldsValue(draft.values);
        });
      }
    }
  }, [editing, form, isCreateOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || isShortcutTarget(event.target)) {
        return;
      }

      if (matchesPlainKey(event, "a")) {
        event.preventDefault();
        openEditor();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openEditor]);

  return (
    <>
      <PageHeader
        title="Клиенты"
        actions={<ShortcutButton shortcut="A" type="primary" leadingIcon={<PlusOutlined />} label="Добавить" onClick={() => openEditor()} />}
      />
      <ListFilters>
        <div className="filter-field filter-field-wide">
          <Input.Search
            allowClear
            placeholder="Поиск по ФИО"
            onSearch={handleSearch}
            onChange={(event) => {
              if (!event.target.value) {
                handleSearch("");
              }
            }}
          />
        </div>
      </ListFilters>
      <ListTable
        rowKey="id"
        loading={query.isLoading}
        dataSource={query.data?.data}
        pagination={{
          current: query.data?.info.page ?? page,
          pageSize: query.data?.info.pageSize ?? 10,
          total: query.data?.info.total,
          onChange: setPage,
        }}
        columns={[
          {
            title: "ФИО",
            render: (_, row) => (
              <Button type="link" className="table-link-button" onClick={() => setHistoryClient(row)}>
                {formatClientName(row)}
              </Button>
            ),
          },
          { title: "Баланс", dataIndex: "balance", render: (_, row) => <Tag color={row.balance < 0 ? "red" : "green"}>{formatMoney(row.balance)}</Tag> },
          { title: "Телефон", render: (_, row) => renderPhoneLink(getContactValue(row, "phone")) },
          { title: "Telegram", render: (_, row) => renderSocialLink(getContactValue(row, "telegram"), "telegram") },
          { title: "VK", render: (_, row) => renderSocialLink(getContactValue(row, "vk"), "vk") },
          {
            title: "",
            width: 112,
            render: (_, row) => (
              <Space>
                <Button icon={<ProfileOutlined />} onClick={() => setHistoryClient(row)} />
                <Button icon={<EditOutlined />} onClick={() => openEditor(row)} />
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => modal.confirm({ title: "Удалить клиента?", onOk: () => deleteMutation.mutate(row.id) })}
                />
              </Space>
            ),
          },
        ]}
      />
      <Modal
        open={isCreateOpen}
        title={editing ? "Редактировать клиента" : <DraftModalTitle title="Новый клиент" restored={hasCreateDraft && isCreateOpen} />}
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={(values) => saveMutation.mutate(values)}
          onValuesChange={(_, values) => {
            if (editing || isDraftHydratingRef.current) {
              return;
            }

            saveDraft<ClientDraftValues>(CLIENT_CREATE_DRAFT_KEY, {
              replayKey: draftReplayKeyRef.current,
              updatedAtUtc: new Date().toISOString(),
              values,
            });
          }}
        >
          <Form.Item name="lastName" label="Фамилия" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="firstName" label="Имя" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="patronymic" label="Отчество">
            <Input />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Телефон"
            rules={[
              {
                validator: (_, value?: string) =>
                  !hasRussianPhoneDigits(value) || getRussianPhoneDigits(value).length === 10
                    ? Promise.resolve()
                    : Promise.reject(new Error("Введите телефон полностью")),
              },
            ]}
          >
            <RussianPhoneInput key={`create-phone-${createPhoneInputKey}`} />
          </Form.Item>
          <Form.Item
            name="telegram"
            label="Telegram"
            rules={[
              {
                validator: (_, value?: string) =>
                  !value?.trim() || normalizeSocialLink(value, "telegram")
                    ? Promise.resolve()
                    : Promise.reject(new Error("Введите Telegram как @nickname, nickname или ссылку t.me")),
              },
            ]}
          >
            <Input placeholder="@nickname или https://t.me/nickname" />
          </Form.Item>
          <Form.Item
            name="vk"
            label="VK"
            rules={[
              {
                validator: (_, value?: string) =>
                  !value?.trim() || normalizeSocialLink(value, "vk")
                    ? Promise.resolve()
                    : Promise.reject(new Error("Введите VK как nickname или ссылку vk.com/vk.ru")),
              },
            ]}
          >
            <Input placeholder="nickname или https://vk.com/nickname" />
          </Form.Item>
        </Form>
      </Modal>
      <Drawer
        title={historyClient ? `История клиента: ${formatClientName(historyClient)}` : "История клиента"}
        width={720}
        open={Boolean(historyClient)}
        onClose={() => setHistoryClient(null)}
        destroyOnHidden
      >
        {historyQuery.data ? (
          <ClientHistoryPanel
            data={historyQuery.data}
            onCreateAppointment={(client) => navigate("/schedule", { state: { openCreate: true, clientId: client.id } })}
            onCreatePayment={(client) => navigate("/payments", { state: { openCreate: true, clientId: client.id } })}
          />
        ) : null}
        {historyQuery.isLoading ? <Typography.Text type="secondary">Загрузка истории...</Typography.Text> : null}
      </Drawer>
    </>
  );
}

type ClientDraftValues = {
  firstName?: string;
  lastName?: string;
  patronymic?: string | null;
  telegram?: string | null;
  vk?: string | null;
  phone?: string | null;
};

const CLIENT_CREATE_DRAFT_KEY = "draft:clients:create";

function RussianPhoneInput({ value, onChange }: { value?: string | null; onChange?: (value: string) => void }) {
  return (
    <MaskedAntdInput
      {...russianPhoneMask}
      value={getRussianPhoneDigits(value)}
      unmask
      onAccept={(nextValue) => onChange?.(String(nextValue))}
      inputMode="tel"
      autoComplete="tel"
      placeholder="+7 (999) 123-45-67"
    />
  );
}

function formatClientName(client: Pick<Client, "firstName" | "lastName" | "patronymic">) {
  return [client.lastName, client.firstName, client.patronymic].filter(Boolean).join(" ");
}

function getContactValue(client: ClientRow, key: "telegram" | "vk" | "phone") {
  return client.contacts?.[key] ?? client[key] ?? undefined;
}

function renderPhoneLink(value?: string | null) {
  const normalized = normalizeRussianPhone(value);
  if (!normalized) {
    return null;
  }

  return <a href={`tel:${normalized}`}>{formatRussianPhone(getRussianPhoneDigits(normalized))}</a>;
}

function renderSocialLink(value: string | null | undefined, type: "telegram" | "vk") {
  const normalized = normalizeSocialLink(value, type);
  if (!normalized) {
    return null;
  }

  return (
    <a href={normalized} target="_blank" rel="noreferrer">
      @{getSocialHandle(normalized)}
    </a>
  );
}

function getSocialHandle(value: string) {
  return value.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[1] ?? "";
}

function prepareClientInput(values: ClientFormValues): ClientSubmitInput {
  const input: ClientSubmitInput = {
    firstName: values.firstName,
    lastName: values.lastName,
    patronymic: values.patronymic,
    phone: normalizeRussianPhone(values.phone),
    telegram: normalizeSocialLink(values.telegram, "telegram"),
    vk: normalizeSocialLink(values.vk, "vk"),
  };

  return omitEmptyContacts(input);
}

function omitEmptyContacts(input: ClientSubmitInput) {
  const result = { ...input };
  if (!result.phone) {
    delete result.phone;
  }
  if (!result.telegram) {
    delete result.telegram;
  }
  if (!result.vk) {
    delete result.vk;
  }

  return result;
}

function pauseDraftHydration(ref: { current: boolean }, action: () => void) {
  ref.current = true;
  action();
  queueMicrotask(() => {
    ref.current = false;
  });
}

function normalizeSocialLink(value: string | null | undefined, type: "telegram" | "vk") {
  const raw = value?.trim();
  if (!raw) {
    return undefined;
  }

  const withoutProtocol = raw.replace(/^https?:\/\//i, "").replace(/^@/, "");
  const withoutWww = withoutProtocol.replace(/^www\./i, "");
  const hostPattern = type === "telegram" ? /^(?:t\.me|telegram\.me)\//i : /^(?:vk\.com|vk\.ru)\//i;
  const path = withoutWww.replace(hostPattern, "").split(/[?#]/)[0].replace(/^@/, "");
  const handle = path.split("/")[0]?.trim();

  if (!handle || !isValidSocialHandle(handle, type)) {
    return undefined;
  }

  return type === "telegram" ? `https://t.me/${handle}` : `https://vk.com/${handle}`;
}

function isValidSocialHandle(handle: string, type: "telegram" | "vk") {
  return type === "telegram" ? /^[a-zA-Z0-9_]{5,32}$/.test(handle) : /^[a-zA-Z0-9_.]{3,64}$/.test(handle);
}

function normalizeRussianPhone(value?: string | null) {
  const digits = getRussianPhoneDigits(value);
  return digits.length > 0 ? `+7${digits}` : undefined;
}

function hasRussianPhoneDigits(value?: string | null) {
  return getRussianPhoneDigits(value).length > 0;
}

function getRussianPhoneDigits(value?: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  const withoutCountryCode = digits.startsWith("8") || digits.startsWith("7") ? digits.slice(1) : digits;
  return withoutCountryCode.slice(0, 10);
}
