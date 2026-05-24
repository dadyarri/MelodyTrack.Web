import { useMutation } from "@tanstack/react-query";
import { App as AntdApp, Form, Modal } from "antd";
import { useEffect, useRef, useState } from "react";
import { normalizePhone, normalizeSocialLink } from "@/entities/client/lib/contact";
import { createOrQueueOffline, isQueuedClientCreate } from "@/features/offline/createOrQueueOffline";
import { clientSourcesApi, clientsApi } from "../api/crm";
import { getApiErrorMessages } from "../api/http";
import { ClientFormFields } from "../features/clients/ClientFormFields";
import { useCreatedReferenceOptions } from "../features/reference-books/useCreatedReferenceOptions";
import { ReferenceBookCreateModal } from "./ReferenceBookCreateModal";
import { createReplayKey } from "../utils/drafts";
import { createOfflineTempId } from "../utils/offlineQueue";

type ClientQuickCreateValues = {
  firstName: string;
  lastName: string;
  patronymic?: string;
  phone?: string;
  telegram?: string;
  vk?: string;
  sourceId?: string;
};

type ClientQuickCreateModalProps = {
  open: boolean;
  onCancel: () => void;
  onCreated: (client: { id: string; displayName: string; isOffline?: boolean }) => void;
};

export function ClientQuickCreateModal({ open, onCancel, onCreated }: ClientQuickCreateModalProps) {
  const [form] = Form.useForm<ClientQuickCreateValues>();
  const [isSourceCreateOpen, setSourceCreateOpen] = useState(false);
  const createdSourceOptions = useCreatedReferenceOptions("client-source");
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
    mutationFn: (values: ClientQuickCreateValues) => {
      const tempId = createOfflineTempId("client");
      return createOrQueueOffline({
        input: {
          firstName: values.firstName,
          lastName: values.lastName,
          patronymic: values.patronymic?.trim() || undefined,
          phone: normalizePhone(values.phone),
          telegram: normalizeSocialLink(values.telegram, "telegram"),
          vk: normalizeSocialLink(values.vk, "vk"),
          sourceId: values.sourceId,
        },
        replayKey: replayKeyRef.current,
        create: (input) => clientsApi.create(input, { replayKey: replayKeyRef.current }),
        buildQueueItem: (input, replayKey) => ({
          kind: "clients:create",
          replayKey,
          tempId,
          payload: input,
        }),
      });
    },
    onSuccess: (result, values) => {
      message.success(result.offline ? "Клиент сохранен локально" : "Клиент создан");
      form.resetFields();
      replayKeyRef.current = createReplayKey();
      const createdId = result.offline && isQueuedClientCreate(result.queuedItem) ? result.queuedItem.tempId : (result.response?.id ?? "");
      onCreated({
        id: createdId,
        displayName: formatClientName(values),
        isOffline: result.offline,
      });
    },
    onError: showErrors,
  });

  const createSourceMutation = useMutation({
    mutationFn: (values: { name: string }) => clientSourcesApi.create(values),
    onSuccess: (result, values) => {
      message.success("Источник создан");
      createdSourceOptions.addCreatedOption({ id: result.id, label: values.name.trim() });
      form.setFieldValue("sourceId", result.id);
      setSourceCreateOpen(false);
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
        <ClientFormFields
          sourceOptions={createdSourceOptions.createdOptions}
          onCreateSource={() => {
            setSourceCreateOpen(true);
          }}
        />
      </Form>
      <ReferenceBookCreateModal
        open={isSourceCreateOpen}
        title="Новый источник клиента"
        confirmLoading={createSourceMutation.isPending}
        onCancel={() => {
          setSourceCreateOpen(false);
        }}
        onSubmit={(values) => {
          createSourceMutation.mutate(values);
        }}
      />
    </Modal>
  );
}

function formatClientName(values: ClientQuickCreateValues) {
  return [values.lastName, values.firstName, values.patronymic].filter(Boolean).join(" ");
}
