import { Form, Modal, Select, Typography } from "antd";
import type { Ulid } from "@/api/types";

type CourseEnrollmentCreateValues = {
  courseId?: Ulid;
};

type CourseEnrollmentCreateModalProps = {
  open: boolean;
  clientName?: string;
  options: Array<{ value: Ulid; label: string }>;
  confirmLoading: boolean;
  onCancel: () => void;
  onSubmit: (courseId: Ulid) => void;
};

export function CourseEnrollmentCreateModal({
  open,
  clientName,
  options,
  confirmLoading,
  onCancel,
  onSubmit,
}: CourseEnrollmentCreateModalProps) {
  const [form] = Form.useForm<CourseEnrollmentCreateValues>();

  return (
    <Modal
      open={open}
      title={clientName ? `Записать на курс: ${clientName}` : "Записать на курс"}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={() => {
        form.submit();
      }}
      okText="Записать"
      okButtonProps={{ disabled: options.length === 0 }}
      confirmLoading={confirmLoading}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) => {
          if (values.courseId) {
            onSubmit(values.courseId);
            form.resetFields();
          }
        }}
      >
        <Form.Item
          name="courseId"
          label="Курс"
          rules={[
            {
              required: true,
              message: "Выберите курс.",
            },
          ]}
        >
          <Select
            showSearch={{
              filterOption: (input, option) =>
                (typeof option?.label === "string" ? option.label : "").toLowerCase().includes(input.trim().toLowerCase()),
            }}
            placeholder="Выберите курс"
            options={options}
            disabled={options.length === 0}
          />
        </Form.Item>
        {options.length === 0 ? (
          <Typography.Text type="secondary">Этот клиент уже записан на все доступные курсы.</Typography.Text>
        ) : null}
      </Form>
    </Modal>
  );
}
