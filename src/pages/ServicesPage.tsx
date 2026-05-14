import { DollarOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Button, Form, Input, InputNumber, Modal } from "antd";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { servicesApi } from "../api/crm";
import { Service } from "../api/types";
import { getApiErrorMessages } from "../api/http";
import { DraftModalFooter } from "../components/DraftModalFooter";
import { DraftModalTitle } from "../components/DraftModalTitle";
import { ListTable } from "../components/ListTable";
import { PageLayout } from "../components/PageLayout";
import { ShortcutButton } from "../components/ShortcutButton";
import { getDraftReplayKey, hasDraft, loadDraft, resetDraft, saveDraftValues, withDraftHydration } from "../utils/drafts";
import { enqueueOfflineCreate, shouldQueueOfflineError } from "../utils/offlineQueue";
import { formatMoney } from "../utils/money";
import { isShortcutTarget, matchesPlainKey } from "../utils/shortcuts";

export function ServicesPage() {
  const [page, setPage] = useState(1);
  const hasCreateDraft = hasDraft(SERVICE_CREATE_DRAFT_KEY);
  const [isCreateOpen, setCreateOpen] = useState(() => hasCreateDraft);
  const draftReplayKeyRef = useRef(getDraftReplayKey<ServiceDraftValues>(SERVICE_CREATE_DRAFT_KEY));
  const isDraftHydratingRef = useRef(false);
  const [pricing, setPricing] = useState<Service | null>(null);
  const [form] = Form.useForm<ServiceDraftValues>();
  const [priceForm] = Form.useForm();
  const queryClient = useQueryClient();
  const { message } = AntdApp.useApp();
  const showErrors = (error: unknown) => getApiErrorMessages(error).forEach((errorMessage) => message.error(errorMessage));
  const query = useQuery({ queryKey: ["services", page], queryFn: () => servicesApi.list({ page, page_size: 10 }) });

  const createMutation = useMutation({
    mutationFn: async (values: ServiceCreateInput) => {
      try {
        return { offline: false as const, response: await servicesApi.create(values, { replayKey: draftReplayKeyRef.current }) };
      } catch (error) {
        if (!shouldQueueOfflineError(error)) {
          throw error;
        }

        enqueueOfflineCreate({
          kind: "services:create",
          replayKey: draftReplayKeyRef.current,
          payload: values,
        });
        return { offline: true as const, response: null };
      }
    },
    onSuccess: async (result) => {
      message.success(result.offline ? "Услуга сохранена локально" : "Услуга создана");
      setCreateOpen(false);
      resetDraft(SERVICE_CREATE_DRAFT_KEY, draftReplayKeyRef);
      withDraftHydration(isDraftHydratingRef, () => form.resetFields());
      if (!result.offline) {
        await queryClient.invalidateQueries({ queryKey: ["services"] });
      }
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

  useLayoutEffect(() => {
    if (!isCreateOpen) {
      return;
    }

    const draft = loadDraft<ServiceDraftValues>(SERVICE_CREATE_DRAFT_KEY);
    draftReplayKeyRef.current = draft?.replayKey ?? getDraftReplayKey<ServiceDraftValues>(SERVICE_CREATE_DRAFT_KEY);
    withDraftHydration(isDraftHydratingRef, () => {
      form.setFieldsValue(draft?.values ?? {});
    });
  }, [form, isCreateOpen]);

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

  function handleClearCreateDraft() {
    resetDraft(SERVICE_CREATE_DRAFT_KEY, draftReplayKeyRef);
    withDraftHydration(isDraftHydratingRef, () => form.resetFields());
  }

  return (
    <PageLayout
      title="Услуги"
      actions={
        <ShortcutButton shortcut="A" type="primary" leadingIcon={<PlusOutlined />} label="Добавить" onClick={() => setCreateOpen(true)} />
      }
    >
      <ListTable
        rowKey="id"
        loading={query.isLoading}
        dataSource={query.data?.data}
        pagination={{ current: page, pageSize: 10, total: query.data?.info.total, onChange: setPage }}
        columns={[
          { title: "Название", dataIndex: "name" },
          { title: "Описание", dataIndex: "description" },
          { title: "Цена", dataIndex: "price", render: (value: number) => formatMoney(value) },
          {
            title: "",
            width: 72,
            render: (_, row) => (
              <Button
                icon={<DollarOutlined />}
                onClick={() => {
                  setPricing(row);
                  priceForm.setFieldValue("price", row.price);
                }}
              />
            ),
          },
        ]}
      />
      <Modal
        open={isCreateOpen}
        title={<DraftModalTitle title="Новая услуга" restored={hasCreateDraft && isCreateOpen} />}
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        footer={(_, { CancelBtn, OkBtn }) => <DraftModalFooter onClearDraft={handleClearCreateDraft} CancelBtn={CancelBtn} OkBtn={OkBtn} />}
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={(values) => createMutation.mutate(values as ServiceCreateInput)}
          onValuesChange={(_, values) => {
            if (isDraftHydratingRef.current) {
              return;
            }

            saveDraftValues<ServiceDraftValues>(SERVICE_CREATE_DRAFT_KEY, draftReplayKeyRef.current, values);
          }}
        >
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
      <Modal
        open={Boolean(pricing)}
        title="Обновить цену"
        onCancel={() => setPricing(null)}
        onOk={() => priceForm.submit()}
        confirmLoading={priceMutation.isPending}
      >
        <Form
          form={priceForm}
          layout="vertical"
          onFinish={(values) => pricing && priceMutation.mutate({ id: pricing.id, price: values.price })}
        >
          <Form.Item name="price" label="Цена" rules={[{ required: true }]}>
            <InputNumber min={0} className="wide" />
          </Form.Item>
        </Form>
      </Modal>
    </PageLayout>
  );
}

type ServiceDraftValues = {
  name?: string;
  description?: string;
  price?: number;
};

type ServiceCreateInput = {
  name: string;
  description?: string;
  price: number;
};

const SERVICE_CREATE_DRAFT_KEY = "draft:services:create";
