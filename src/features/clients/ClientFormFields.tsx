import { Button, Form, Input, Space } from "antd";
import type { DefaultOptionType } from "antd/es/select";
import { ClientSourceSelect } from "@/components/RemoteSelect";
import { formatPhone, formatPhoneInput, isValidPhone, normalizePhone, normalizeSocialLink } from "@/entities/client";

export function ClientFormFields({
  sourceOptions,
  onCreateSource,
  onSourceLabelChange,
}: {
  sourceOptions?: DefaultOptionType[];
  onCreateSource?: () => void;
  onSourceLabelChange?: (label?: string) => void;
}) {
  const form = Form.useFormInstance();

  return (
    <>
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
              !value?.trim() || isValidPhone(value) ? Promise.resolve() : Promise.reject(new Error("Введите корректный номер телефона")),
          },
        ]}
      >
        <PhoneInput />
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
      <Form.Item label="Источник">
        <Space.Compact className="wide">
          <Form.Item name="sourceId" noStyle>
            <ClientSourceSelect extraOptions={sourceOptions} onResolvedLabelChange={onSourceLabelChange} />
          </Form.Item>
          {onCreateSource ? <Button onClick={onCreateSource}>Новый источник</Button> : null}
        </Space.Compact>
      </Form.Item>
    </>
  );

  function PhoneInput({ value, onChange }: { value?: string | null; onChange?: (value?: string) => void }) {
    return (
      <Input
        value={value ?? ""}
        inputMode="tel"
        autoComplete="tel"
        placeholder="+49 1512 3456789"
        onChange={(event) => {
          const nextValue = formatPhoneInput(event.target.value);
          if (onChange) {
            onChange(nextValue || undefined);
          } else {
            form.setFieldValue("phone", nextValue || undefined);
          }
        }}
        onBlur={(event) => {
          const normalized = normalizePhone(event.target.value);
          if (normalized) {
            const formatted = formatPhone(normalized);
            if (onChange) {
              onChange(formatted || undefined);
            } else {
              form.setFieldValue("phone", formatted || undefined);
            }
            return;
          }

          const formatted = formatPhoneInput(event.target.value);
          if (onChange) {
            onChange(formatted || undefined);
          } else {
            form.setFieldValue("phone", formatted || undefined);
          }
        }}
      />
    );
  }
}
