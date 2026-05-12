import { App as AntdApp, Form, Input, Modal, type InputProps, type InputRef } from "antd";
import { useMutation } from "@tanstack/react-query";
import { IMaskMixin, type IMaskInputProps } from "react-imask";
import { clientsApi } from "../api/crm";
import { getApiErrorMessages } from "../api/http";

type ClientQuickCreateValues = {
  firstName: string;
  lastName: string;
  patronymic?: string;
  phone?: string;
  telegram?: string;
  vk?: string;
};

type ClientQuickCreateModalProps = {
  open: boolean;
  onCancel: () => void;
  onCreated: (client: { id: string; displayName: string }) => void;
};

const russianPhoneMask = {
  mask: "+{7} (000) 000-00-00",
};

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

export function ClientQuickCreateModal({ open, onCancel, onCreated }: ClientQuickCreateModalProps) {
  const [form] = Form.useForm<ClientQuickCreateValues>();
  const { message } = AntdApp.useApp();
  const showErrors = (error: unknown) => getApiErrorMessages(error).forEach((errorMessage) => message.error(errorMessage));

  const createMutation = useMutation({
    mutationFn: async (values: ClientQuickCreateValues) => {
      const input = {
        firstName: values.firstName,
        lastName: values.lastName,
        patronymic: values.patronymic?.trim() || undefined,
        phone: normalizeRussianPhone(values.phone),
        telegram: normalizeSocialLink(values.telegram, "telegram"),
        vk: normalizeSocialLink(values.vk, "vk"),
      };

      return clientsApi.create(input);
    },
    onSuccess: (created, values) => {
      message.success("Клиент создан");
      form.resetFields();
      onCreated({
        id: created.id,
        displayName: formatClientName(values),
      });
    },
    onError: showErrors,
  });

  return (
    <Modal
      open={open}
      title="Новый клиент"
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={() => form.submit()}
      confirmLoading={createMutation.isPending}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" requiredMark={false} onFinish={(values) => createMutation.mutate(values)}>
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
          <RussianPhoneInput />
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
  );
}

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

function formatClientName(values: ClientQuickCreateValues) {
  return [values.lastName, values.firstName, values.patronymic].filter(Boolean).join(" ");
}

function hasRussianPhoneDigits(value?: string | null) {
  return getRussianPhoneDigits(value).length > 0;
}

function getRussianPhoneDigits(value?: string | null) {
  return value?.replace(/\D/g, "") ?? "";
}

function normalizeRussianPhone(value?: string | null) {
  const digits = getRussianPhoneDigits(value);
  if (!digits) {
    return undefined;
  }

  const normalizedDigits = digits.startsWith("7")
    ? digits.slice(1)
    : digits.startsWith("8")
      ? digits.slice(1)
      : digits;

  return normalizedDigits.length === 10 ? `+7${normalizedDigits}` : undefined;
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

  const baseUrl = type === "telegram" ? "https://t.me/" : "https://vk.com/";
  return `${baseUrl}${handle}`;
}

function isValidSocialHandle(handle: string, type: "telegram" | "vk") {
  const pattern = type === "telegram"
    ? /^[a-zA-Z0-9_]{5,}$/
    : /^[a-zA-Z0-9_.-]{2,}$/;

  return pattern.test(handle);
}
