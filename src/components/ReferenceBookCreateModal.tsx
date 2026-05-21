import { Form, Input, Modal } from "antd";

type ReferenceBookCreateModalProps = {
  open: boolean;
  title: string;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: { name: string }) => void;
};

export function ReferenceBookCreateModal({ open, title, confirmLoading = false, onCancel, onSubmit }: ReferenceBookCreateModalProps) {
  const [form] = Form.useForm<{ name: string }>();

  return (
    <Modal
      open={open}
      title={title}
      afterOpenChange={(isOpen) => {
        if (!isOpen) {
          form.resetFields();
        }
      }}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={() => {
        form.submit();
      }}
      confirmLoading={confirmLoading}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) => {
          onSubmit(values);
        }}
      >
        <Form.Item name="name" label="Название" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}
