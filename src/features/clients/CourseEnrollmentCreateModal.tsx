import { Form, Modal, Select, Switch, Typography } from "antd";
import type { Ulid } from "@/api/types";

type CourseEnrollmentCreateValues = {
  courseId?: Ulid;
  openProgress?: boolean;
};

type CourseEnrollmentCreateModalProps = {
  open: boolean;
  clientName?: string;
  options: Array<{
    value: Ulid;
    label: string;
    description?: string | null;
    blockCount: number;
    themeCount: number;
  }>;
  confirmLoading: boolean;
  onCancel: () => void;
  onSubmit: (values: { courseId: Ulid; openProgress: boolean }) => void;
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
  const selectedCourseId = Form.useWatch("courseId", form);
  const selectedCourse = options.find((option) => option.value === selectedCourseId) ?? null;

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
        initialValues={{ openProgress: true }}
        onFinish={(values) => {
          if (values.courseId) {
            onSubmit({ courseId: values.courseId, openProgress: values.openProgress ?? true });
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
            options={options.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            disabled={options.length === 0}
          />
        </Form.Item>
        {selectedCourse ? (
          <div>
            <Typography.Text type="secondary">
              {selectedCourse.blockCount} блоков · {selectedCourse.themeCount} тем
            </Typography.Text>
            {selectedCourse.description ? (
              <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0 }}>{selectedCourse.description}</Typography.Paragraph>
            ) : null}
          </div>
        ) : null}
        <Form.Item name="openProgress" label="После назначения" valuePropName="checked" style={{ marginTop: 16, marginBottom: 0 }}>
          <Switch checkedChildren="Открыть прогресс" unCheckedChildren="Только назначить" />
        </Form.Item>
        {options.length === 0 ? <Typography.Text type="secondary">Этот клиент уже записан на все доступные курсы.</Typography.Text> : null}
      </Form>
    </Modal>
  );
}
