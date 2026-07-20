import { Button, DatePicker, Form, Modal, Space, Typography } from "antd";
import type { Dayjs } from "dayjs";
import type { Client } from "@/api/types";
import { DATE_FORMAT } from "@/utils/date";

export type ClientVacationsFormValues = {
  vacations?: Array<{ period?: [Dayjs, Dayjs] }>;
};

export function ClientVacationsModal({ client, form, saving, onCancel, onSubmit }: {
  client: Client | null;
  form: ReturnType<typeof Form.useForm<ClientVacationsFormValues>>[0];
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: ClientVacationsFormValues) => void;
}) {
  return (
    <Modal open={client !== null} title="Отпуск клиента" onCancel={onCancel} onOk={() => { form.submit(); }} confirmLoading={saving}>
      <Typography.Paragraph type="secondary">Встречи в эти даты не будут показаны или созданы.</Typography.Paragraph>
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.List name="vacations">
          {(fields, { add, remove }) => (
            <Space orientation="vertical" className="wide">
              {fields.map((field) => (
                <Space key={field.key} className="wide">
                  <Form.Item name={[field.name, "period"]} rules={[{ required: true, message: "Укажите период отсутствия" }]} noStyle>
                    <DatePicker.RangePicker format={DATE_FORMAT} />
                  </Form.Item>
                  <Button danger onClick={() => { remove(field.name); }}>Удалить</Button>
                </Space>
              ))}
              <Button onClick={() => { add({ period: undefined }); }}>Добавить отпуск</Button>
            </Space>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
