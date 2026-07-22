import { DeleteOutlined, DollarOutlined, EditOutlined, PlusOutlined } from "@/components/icons";
import { App as AntdApp, Button, Form, Input, InputNumber, Modal, Space, Switch, Tag } from "antd";
import { useServicesPageController } from "@/features/services/useServicesPageController";
import { DraftFormModal, ListPageScaffold, ListTable, PageLayout, ShortcutButton } from "@/shared/ui";
import { formatMoney } from "@/utils/money";

export function ServicesPage() {
  const controller = useServicesPageController();
  const { modal } = AntdApp.useApp();

  return (
    <PageLayout
      title="Услуги"
      actions={
        controller.canManageServices ? (
          <ShortcutButton
            data-onboarding-id="services-actions"
            shortcut="A"
            type="primary"
            leadingIcon={<PlusOutlined />}
            label="Добавить"
            onClick={() => {
              controller.setCreateOpen(true);
            }}
          />
        ) : undefined
      }
    >
      <ListPageScaffold
        contentOnboardingId="services-page-content"
        table={
          <ListTable
            rowKey="id"
            loading={controller.query.isLoading}
            dataSource={controller.query.data?.data}
            pagination={{
              current: controller.page,
              pageSize: 10,
              total: controller.query.data?.info.total,
              onChange: controller.setPage,
            }}
            columns={[
              { title: "Название", dataIndex: "name" },
              { title: "Название для клиента", dataIndex: "publicName", render: (value?: string | null) => value || "—" },
              {
                title: "Тип",
                width: 132,
                render: (_, row) => (row.isConsultation ? <Tag color="blue">Консультация</Tag> : null),
              },
              { title: "Описание", dataIndex: "description" },
              {
                title: "Цена",
                dataIndex: "price",
                render: (value: number) => formatMoney(value),
              },
              {
                title: "",
                width: 132,
                render: (_, row) => (
                  <Space>
                    <Button
                      icon={<EditOutlined />}
                      disabled={!controller.canManageServices}
                      onClick={() => {
                        if (!controller.canManageServices) {
                          return;
                        }

                        controller.setEditing(row);
                      }}
                    />
                    <Button
                      icon={<DollarOutlined />}
                      disabled={!controller.canManageServices}
                      onClick={() => {
                        if (!controller.canManageServices) {
                          return;
                        }

                        controller.setPricing(row);
                        controller.priceForm.setFieldValue("price", row.price);
                      }}
                    />
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      disabled={!controller.canManageServices}
                      onClick={() => {
                        if (!controller.canManageServices) {
                          return;
                        }

                        modal.confirm({
                          title: "Удалить услугу?",
                          content: "Услуга будет удалена только если она еще не использовалась в расписании или платежах.",
                          onOk: () => {
                            controller.deleteMutation.mutate(row.id);
                          },
                        });
                      }}
                    />
                  </Space>
                ),
              },
            ]}
          />
        }
      />
      <DraftFormModal
        open={controller.canManageServices && controller.isCreateOpen}
        title="Новая услуга"
        restored={controller.hasCreateDraft && controller.isCreateOpen}
        onClearDraft={controller.handleClearCreateDraft}
        onCancel={() => {
          controller.setCreateOpen(false);
        }}
        onOk={() => {
          controller.form.submit();
        }}
        confirmLoading={controller.createMutation.isPending}
      >
        <Form
          form={controller.form}
          layout="vertical"
          requiredMark={false}
          onFinish={controller.onCreateSubmit}
          onValuesChange={controller.onCreateValuesChange}
        >
          <Form.Item name="name" label="Название" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="publicName"
            label="Название для клиента"
            extra="Будет показано в клиентском календаре. Если не указано, используется внутреннее название."
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input />
          </Form.Item>
          <Form.Item name="isConsultation" label="Консультация" valuePropName="checked" initialValue={false}>
            <Switch />
          </Form.Item>
          <Form.Item name="price" label="Цена" rules={[{ required: true }]}>
            <InputNumber min={0} className="wide" />
          </Form.Item>
        </Form>
      </DraftFormModal>
      <Modal
        open={controller.canManageServices && Boolean(controller.editing)}
        title="Редактировать услугу"
        onCancel={() => {
          controller.setEditing(null);
        }}
        onOk={() => {
          controller.editForm.submit();
        }}
        confirmLoading={controller.updateMutation.isPending}
      >
        <Form form={controller.editForm} layout="vertical" requiredMark={false} onFinish={controller.onEditSubmit}>
          <Form.Item name="name" label="Название" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="publicName" label="Название для клиента" extra="Будет показано в клиентском календаре.">
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input />
          </Form.Item>
          <Form.Item name="isConsultation" label="Консультация" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        open={controller.canManageServices && Boolean(controller.pricing)}
        title="Обновить цену"
        onCancel={() => {
          controller.setPricing(null);
        }}
        onOk={() => {
          controller.priceForm.submit();
        }}
        confirmLoading={controller.priceMutation.isPending}
      >
        <Form form={controller.priceForm} layout="vertical" onFinish={controller.onPriceSubmit}>
          <Form.Item name="price" label="Цена" rules={[{ required: true }]}>
            <InputNumber min={0} className="wide" />
          </Form.Item>
        </Form>
      </Modal>
    </PageLayout>
  );
}
