import { useMutation } from "@tanstack/react-query";
import { App as AntdApp, Form, Modal } from "antd";
import { useEffect, useRef } from "react";
import { normalizeRussianPhone, normalizeSocialLink } from "@/entities/client";
import { clientsApi } from "../api/crm";
import { getApiErrorMessages } from "../api/http";
import { ClientFormFields } from "../features/clients/ClientFormFields";
import { createReplayKey } from "../utils/drafts";
import { createOfflineTempId, enqueueOfflineCreate, shouldQueueOfflineError } from "../utils/offlineQueue";

type ClientQuickCreateValues = {
  firstName: string;
  lastName: string;
  patronymic?: string;
  phone?: string;
  telegram?: string;
  vk?: string;
};

type ClientQuickCreateModalProps = {
  open: boolean;
  onCancel: () => void;
  onCreated: (client: { id: string; displayName: string; isOffline?: boolean }) => void;
};

export function ClientQuickCreateModal({ open, onCancel, onCreated }: ClientQuickCreateModalProps) {
  const [form] = Form.useForm<ClientQuickCreateValues>();
  const replayKeyRef = useRef(createReplayKey());
  const { message } = AntdApp.useApp();
  const showErrors = (error: unknown) => {
    for (const errorMessage of getApiErrorMessages(error)) {
      void message.error(errorMessage);
    }
  };

  useEffect(() => {
    if (open) {
      replayKeyRef.current = createReplayKey();
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: async (values: ClientQuickCreateValues) => {
      const input = {
        firstName: values.firstName,
        lastName: values.lastName,
        patronymic: values.patronymic?.trim() || undefined,
        phone: normalizeRussianPhone(values.phone),
        telegram: normalizeSocialLink(values.telegram, "telegram"),
        vk: normalizeSocialLink(values.vk, "vk"),
      };

      try {
        return {
          created: await clientsApi.create(input, { replayKey: replayKeyRef.current }),
          offline: false as const,
        };
      } catch (error) {
        if (!shouldQueueOfflineError(error)) {
          throw error;
        }

        const tempId = createOfflineTempId("client");
        enqueueOfflineCreate({
          kind: "clients:create",
          replayKey: replayKeyRef.current,
          tempId,
          payload: input,
        });
        return {
          created: { id: tempId },
          offline: true as const,
        };
      }
    },
    onSuccess: (result, values) => {
      message.success(result.offline ? "Клиент сохранен локально" : "Клиент создан");
      form.resetFields();
      replayKeyRef.current = createReplayKey();
      onCreated({
        id: result.created.id,
        displayName: formatClientName(values),
        isOffline: result.offline,
      });
    },
    onError: showErrors,
  });

  return (
    <Modal
      open={open}
      title="Новый клиент"
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={() => {
        form.submit();
      }}
      confirmLoading={createMutation.isPending}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) => {
          createMutation.mutate(values);
        }}
      >
        <ClientFormFields />
      </Form>
    </Modal>
  );
}

function formatClientName(values: ClientQuickCreateValues) {
  return [values.lastName, values.firstName, values.patronymic].filter(Boolean).join(" ");
}
