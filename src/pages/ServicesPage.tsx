import { DollarOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Button, Form, Input, InputNumber, Modal } from "antd";
import { useEffect, useState } from "react";
import { servicesApi } from "../api/crm";
import { Service } from "../api/types";
import { getApiErrorMessages } from "../api/http";
import { ListTable } from "../components/ListTable";
import { PageHeader } from "../components/PageHeader";
import { ShortcutButton } from "../components/ShortcutButton";
import { formatMoney } from "../utils/money";
import { isShortcutTarget, matchesPlainKey } from "../utils/shortcuts";

export function ServicesPage() {
  const [page, setPage] = useState(1);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [pricing, setPricing] = useState<Service | null>(null);
  const [form] = Form.useForm();
  const [priceForm] = Form.useForm();
  const queryClient = useQueryClient();
  const { message } = AntdApp.useApp();
  const showErrors = (error: unknown) => getApiErrorMessages(error).forEach((errorMessage) => message.error(errorMessage));
  const query = useQuery({ queryKey: ["services", page], queryFn: () => servicesApi.list({ page, page_size: 10 }) });

  const createMutation = useMutation({
    mutationFn: servicesApi.create,
    onSuccess: async () => {
      message.success("Услуга создана");
      setCreateOpen(false);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ["services"] });
    },
    onError: showErrors,
  });

  const priceMutation = useMutation({
    mutationFn: ({ id, price }: { id: string; price: number }) => servicesApi.updatePrice(id, price),
    onSuccess: async () => {
      message.success("Цена обновлена");
      setPricing(null);
      await queryClient.invalidateQueries({ queryKey: ["services"] });
    },
    onError: showErrors,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || isShortcutTarget(event.target)) {
        return;
      }

      if (matchesPlainKey(event, "a")) {
        event.preventDefault();
        setCreateOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <PageHeader
        title="Услуги"
        actions={<ShortcutButton shortcut="A" type="primary" leadingIcon={<PlusOutlined />} label="Добавить" onClick={() => setCreateOpen(true)} />}
      />
      <ListTable
        rowKey="id"
        loading={query.isLoading}
        dataSource={query.data?.data}
        pagination={{ current: page, pageSize: 10, total: query.data?.info.total, onChange: setPage }}
        columns={[
          { title: "Название", dataIndex: "name" },
          { title: "Описание", dataIndex: "description" },
          { title: "Цена", dataIndex: "price", render: (value: number) => formatMoney(value) },
          { title: "", width: 72, render: (_, row) => <Button icon={<DollarOutlined />} onClick={() => { setPricing(row); priceForm.setFieldValue("price", row.price); }} /> },
        ]}
      />
      <Modal open={isCreateOpen} title="Новая услуга" onCancel={() => setCreateOpen(false)} onOk={() => form.submit()} confirmLoading={createMutation.isPending}>
        <Form form={form} layout="vertical" requiredMark={false} onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item name="name" label="Название" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input />
          </Form.Item>
          <Form.Item name="price" label="Цена" rules={[{ required: true }]}>
            <InputNumber min={0} className="wide" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal open={Boolean(pricing)} title="Обновить цену" onCancel={() => setPricing(null)} onOk={() => priceForm.submit()} confirmLoading={priceMutation.isPending}>
        <Form form={priceForm} layout="vertical" onFinish={(values) => pricing && priceMutation.mutate({ id: pricing.id, price: values.price })}>
          <Form.Item name="price" label="Цена" rules={[{ required: true }]}>
            <InputNumber min={0} className="wide" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
