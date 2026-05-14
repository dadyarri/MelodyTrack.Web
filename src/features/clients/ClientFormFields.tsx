import { Form, Input, type InputProps, type InputRef } from "antd";
import { type IMaskInputProps, IMaskMixin } from "react-imask";
import { getRussianPhoneDigits, getRussianPhoneMask, hasRussianPhoneDigits, normalizeSocialLink } from "./clientContactUtils";

const russianPhoneMask = getRussianPhoneMask();

type MaskedAntdInputProps = IMaskInputProps<HTMLInputElement> &
  Pick<InputProps, "placeholder" | "inputMode" | "autoComplete" | "disabled" | "status" | "size">;
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

export function ClientFormFields({ phoneInputKey }: { phoneInputKey?: number }) {
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
              !hasRussianPhoneDigits(value) || getRussianPhoneDigits(value).length === 10
                ? Promise.resolve()
                : Promise.reject(new Error("Введите телефон полностью")),
          },
        ]}
      >
        <RussianPhoneInput key={phoneInputKey ? `phone-${phoneInputKey}` : undefined} />
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
    </>
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
