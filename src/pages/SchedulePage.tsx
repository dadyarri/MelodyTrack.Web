import { CheckOutlined, CloseOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Button, DatePicker, Form, Modal, Space, Table, Tag } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { scheduleApi } from "../api/crm";
import { getApiErrorMessages } from "../api/http";
import { PageHeader } from "../components/PageHeader";
import { ClientSelect, ServiceSelect, UserSelect } from "../components/RemoteSelect";

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function SchedulePage() {
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().startOf("week"), dayjs().endOf("week")]);
  const [isOpen, setOpen] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { message, modal } = AntdApp.useApp();
  const showErrors = (error: unknown) => getApiErrorMessages(error).forEach((errorMessage) => message.error(errorMessage));

  const query = useQuery({
    queryKey: ["appointments", range[0].toISOString(), range[1].toISOString()],
    queryFn: () => scheduleApi.list({ timezone, startDate: range[0].toISOString(), endDate: range[1].toISOString() }),
  });

  const createMutation = useMutation({
    mutationFn: (values: { clientId: string; serviceId: string; providerId?: string; startDate: dayjs.Dayjs }) =>
      scheduleApi.create({ ...values, startDate: values.startDate.toISOString() }),
    onSuccess: async () => {
      message.success("Запись создана");
      setOpen(false);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: showErrors,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { isCompleted?: boolean; isCanceled?: boolean } }) => scheduleApi.update(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: showErrors,
  });

  const deleteMutation = useMutation({
    mutationFn: scheduleApi.remove,
    onSuccess: async () => {
      message.success("Запись удалена");
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: showErrors,
  });

  return (
    <>
      <PageHeader
        title="Расписание"
        actions={
          <>
            <DatePicker.RangePicker value={range} onChange={(value) => value?.[0] && value[1] && setRange([value[0], value[1]])} />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Добавить</Button>
          </>
        }
      />
      <Table
        rowKey="id"
        loading={query.isLoading}
        dataSource={query.data}
        pagination={false}
        columns={[
          { title: "Начало", dataIndex: "startDate", render: (value: string) => dayjs(value).format("DD.MM.YYYY HH:mm") },
          { title: "Клиент", render: (_, row) => `${row.client.lastName} ${row.client.firstName}` },
          { title: "Услуга", render: (_, row) => row.service.name },
          { title: "Специалист", render: (_, row) => row.provider ? `${row.provider.lastName} ${row.provider.firstName}` : null },
          { title: "Статус", render: (_, row) => row.isCanceled ? <Tag color="red">Отменена</Tag> : row.isCompleted ? <Tag color="green">Завершена</Tag> : <Tag>Запланирована</Tag> },
          {
            title: "",
            width: 144,
            render: (_, row) => (
              <Space>
                <Button icon={<CheckOutlined />} onClick={() => updateMutation.mutate({ id: row.id, input: { isCompleted: true, isCanceled: false } })} />
                <Button icon={<CloseOutlined />} onClick={() => updateMutation.mutate({ id: row.id, input: { isCanceled: true } })} />
                <Button danger icon={<DeleteOutlined />} onClick={() => modal.confirm({ title: "Удалить запись?", onOk: () => deleteMutation.mutate(row.id) })} />
              </Space>
            ),
          },
        ]}
      />
      <Modal open={isOpen} title="Новая запись" onCancel={() => setOpen(false)} onOk={() => form.submit()} confirmLoading={createMutation.isPending}>
        <Form form={form} layout="vertical" requiredMark={false} initialValues={{ startDate: dayjs() }} onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item name="clientId" label="Клиент" rules={[{ required: true }]}>
            <ClientSelect />
          </Form.Item>
          <Form.Item name="serviceId" label="Услуга" rules={[{ required: true }]}>
            <ServiceSelect allowClear={false} />
          </Form.Item>
          <Form.Item name="providerId" label="Специалист">
            <UserSelect />
          </Form.Item>
          <Form.Item name="startDate" label="Начало" rules={[{ required: true }]}>
            <DatePicker showTime className="wide" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
