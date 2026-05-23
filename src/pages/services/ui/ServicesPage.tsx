import { DollarOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Form, Input, InputNumber, Modal } from "antd";
import { useServicesPageController } from "@/features/services/useServicesPageController";
import { DraftFormModal, ListPageScaffold, ListTable, PageLayout, ShortcutButton } from "@/shared/ui";
import { formatMoney } from "@/utils/money";

export function ServicesPage() {
  const controller = useServicesPageController();

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
            pagination={{ current: controller.page, pageSize: 10, total: controller.query.data?.info.total, onChange: controller.setPage }}
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
                    disabled={!controller.canManageServices}
                    onClick={() => {
                      if (!controller.canManageServices) {
                        return;
                      }

                      controller.setPricing(row);
                      controller.priceForm.setFieldValue("price", row.price);
                    }}
                  />
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
          <Form.Item name="description" label="Описание">
            <Input />
          </Form.Item>
          <Form.Item name="price" label="Цена" rules={[{ required: true }]}>
            <InputNumber min={0} className="wide" />
          </Form.Item>
        </Form>
      </DraftFormModal>
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
