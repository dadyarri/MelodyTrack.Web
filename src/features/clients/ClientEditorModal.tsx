import { Button, Form, Input, Modal, type InputProps, type InputRef } from "antd";
import type { FormInstance } from "antd";
import { IMaskMixin, type IMaskInputProps } from "react-imask";
import type { Client } from "../../api/types";
import { DraftModalTitle } from "../../components/DraftModalTitle";
import { StatusBanner } from "../../components/StatusBanner";
import { formatRecordActivitySummary } from "../../utils/staleEntity";
import { getRussianPhoneMask, getRussianPhoneDigits, hasRussianPhoneDigits, normalizeSocialLink } from "./clientContactUtils";

export type ClientFormValues = Client & { telegram?: string | null; vk?: string | null; phone?: string | null };
const russianPhoneMask = getRussianPhoneMask();

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

export function ClientEditorModal({
  open,
  editing,
  draftRestored,
  form,
  savePending,
  isStale,
  staleActivity,
  phoneInputKey,
  onCancel,
  onClearDraft,
  onSubmit,
  onValuesChange,
}: {
  open: boolean;
  editing: boolean;
  draftRestored: boolean;
  form: FormInstance<ClientFormValues>;
  savePending: boolean;
  isStale: boolean;
  staleActivity?: Client["lastActivity"];
  phoneInputKey: number;
  onCancel: () => void;
  onClearDraft: () => void;
  onSubmit: (values: ClientFormValues) => void;
  onValuesChange: (_: Partial<ClientFormValues>, values: ClientFormValues) => void;
}) {
  return (
    <Modal
      open={open}
      title={editing ? "Редактировать клиента" : <DraftModalTitle title="Новый клиент" restored={draftRestored} />}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={savePending}
      footer={editing ? undefined : (_, { CancelBtn, OkBtn }) => (
        <>
          <Button onClick={onClearDraft}>Очистить черновик</Button>
          <CancelBtn />
          <OkBtn />
        </>
      )}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={onSubmit}
        onValuesChange={onValuesChange}
      >
        {editing && isStale ? (
          <StatusBanner
            type="warning"
            message="Карточка клиента изменилась в другом окне"
            description={formatRecordActivitySummary(staleActivity)}
          />
        ) : null}
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
          <RussianPhoneInput key={`create-phone-${phoneInputKey}`} />
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
