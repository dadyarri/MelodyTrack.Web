import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Form } from "antd";
import { useEffect, useState } from "react";
import * as v from "valibot";

import { normalizePhone, normalizeSocialLink } from "@/entities/client";
import { authApi, type CreateInviteInput, hasAdminAccess, useAuth } from "@/entities/session";
import { type User, userQueryKeys, usersApi } from "@/entities/user";
import type { UserFormValues } from "@/features/edit-user";
import type { Ulid } from "@/shared/api";
import { getApiErrorMessages } from "@/shared/api";
import { findItemInQueryData, handleStaleEntityConflict, isActivityStale } from "@/shared/lib";
import { isShortcutTarget, matchesPlainKey } from "@/shared/lib";
import { jsonDurableFormCodec, useDurableForm } from "@/shared/lib/react";

const inviteDraftSchema = v.object({ email: v.optional(v.string()), role: v.string() });
const userDraftSchema = v.object({
  firstName: v.string(),
  lastName: v.string(),
  phone: v.optional(v.nullable(v.string())),
  telegram: v.optional(v.nullable(v.string())),
  vk: v.optional(v.nullable(v.string())),
});
const inviteDraftCodec = jsonDurableFormCodec<CreateInviteInput>();
const userDraftCodec = jsonDurableFormCodec<UserFormValues>();

export function useUsersPageController() {
  const auth = useAuth();
  const [isInviteOpen, setInviteOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [passwordResetUser, setPasswordResetUser] = useState<User | null>(null);
  const [passwordResetUrl, setPasswordResetUrl] = useState("");
  const [editing, setEditing] = useState<User | null>(null);
  const [editingBaselineActivityId, setEditingBaselineActivityId] = useState<Ulid | null | undefined>();
  const [form] = Form.useForm<CreateInviteInput>();
  const [editForm] = Form.useForm<UserFormValues>();
  const inviteDraft = useDurableForm({
    key: "draft:users:invite",
    schema: inviteDraftSchema,
    form,
    codec: inviteDraftCodec,
    enabled: isInviteOpen && !inviteUrl,
  });
  const editDraft = useDurableForm({
    key: editing ? `draft:users:edit:${editing.id}` : null,
    schema: userDraftSchema,
    form: editForm,
    codec: userDraftCodec,
    enabled: editing !== null,
    entity: editing ? { id: editing.id, baselineVersion: editingBaselineActivityId ?? null } : undefined,
  });
  const queryClient = useQueryClient();
  const { message, modal } = AntdApp.useApp();
  const canManageUsers = hasAdminAccess(auth.user);
  const showErrors = (error: unknown) => {
    for (const errorMessage of getApiErrorMessages(error)) {
      void message.error(errorMessage);
    }
  };
  const query = useQuery({
    queryKey: userQueryKeys.all,
    queryFn: () => usersApi.list(),
  });
  const currentEditingUser = editing ? (query.data?.find((user) => user.id === editing.id) ?? editing) : null;
  const isEditingUserStale = currentEditingUser
    ? isActivityStale(currentEditingUser.lastActivity?.id, editingBaselineActivityId) || editDraft.isStale
    : false;

  const createInviteMutation = useMutation({
    mutationFn: (input: CreateInviteInput) => authApi.createInvite(input),
    onSuccess: async (data) => {
      await inviteDraft.clearAfterSuccess();
      setInviteUrl(data.url);
      message.success("Приглашение создано");
    },
    onError: showErrors,
  });

  const createPasswordResetLinkMutation = useMutation({
    mutationFn: (user: User) => authApi.createPasswordResetLink(user.id),
    onSuccess: (data, user) => {
      setPasswordResetUser(user);
      setPasswordResetUrl(data.url);
      message.success("Ссылка на восстановление создана");
    },
    onError: showErrors,
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, values, expectedActivityId }: { id: Ulid; values: UserFormValues; expectedActivityId?: Ulid }) => {
      return usersApi.update(
        id,
        {
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          phone: normalizePhone(values.phone),
          telegram: normalizeSocialLink(values.telegram, "telegram"),
          vk: normalizeSocialLink(values.vk, "vk"),
        },
        { expectedActivityId },
      );
    },
    onSuccess: async () => {
      message.success("Данные пользователя сохранены");
      await editDraft.clearAfterSuccess();
      setEditing(null);
      setEditingBaselineActivityId(undefined);
      editForm.resetFields();
      await queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
    },
    onError: async (error, variables) => {
      await handleStaleEntityConflict({
        error,
        modal,
        queryClient,
        invalidateQueryKey: userQueryKeys.all,
        showErrors,
        title: "Пользователь уже изменен",
        okText: "Сохранить все равно",
        cancelText: "Обновить данные",
        onConfirm: (conflict) => {
          updateUserMutation.mutate({
            id: variables.id,
            values: variables.values,
            expectedActivityId: conflict.currentActivity?.id,
          });
        },
        onReload: () => {
          const freshUser =
            findItemInQueryData(queryClient, userQueryKeys.all, (data) => data as User[] | undefined, variables.id) ?? currentEditingUser;
          if (!freshUser) {
            return;
          }

          setEditing(freshUser);
          setEditingBaselineActivityId(freshUser.lastActivity?.id ?? null);
          editForm.setFieldsValue({
            firstName: freshUser.firstName,
            lastName: freshUser.lastName,
            phone: freshUser.phone ?? undefined,
            telegram: freshUser.telegram ?? undefined,
            vk: freshUser.vk ?? undefined,
          });
        },
      });
    },
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || isShortcutTarget(event.target)) {
        return;
      }

      if (!matchesPlainKey(event, "a") || !canManageUsers) {
        return;
      }

      event.preventDefault();
      setInviteOpen(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canManageUsers]);

  return {
    canManageUsers,
    query,
    editing,
    currentEditingUser,
    isEditingUserStale,
    editForm,
    editDraft,
    inviteDraft,
    updateUserMutation,
    isInviteOpen,
    setInviteOpen,
    inviteUrl,
    form,
    createInviteMutation,
    createPasswordResetLinkMutation,
    passwordResetUser,
    passwordResetUrl,
    closeInviteModal: () => {
      setInviteOpen(false);
      setInviteUrl("");
    },
    closePasswordResetModal: () => {
      setPasswordResetUser(null);
      setPasswordResetUrl("");
    },
    copyInviteUrl: async () => {
      await navigator.clipboard.writeText(inviteUrl);
      message.success("Ссылка скопирована");
    },
    copyPasswordResetUrl: async () => {
      await navigator.clipboard.writeText(passwordResetUrl);
      message.success("Ссылка скопирована");
    },
    onInviteSubmit: (values: CreateInviteInput) => {
      createInviteMutation.mutate({
        ...values,
        email: values.email?.trim() || undefined,
      });
    },
    createPasswordResetLink: (user: User) => {
      createPasswordResetLinkMutation.mutate(user);
    },
    openEditor: (user: User) => {
      setEditing(user);
      setEditingBaselineActivityId(user.lastActivity?.id ?? null);
      editForm.setFieldsValue({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone ?? undefined,
        telegram: user.telegram ?? undefined,
        vk: user.vk ?? undefined,
      });
    },
    closeEditor: () => {
      setEditing(null);
      setEditingBaselineActivityId(undefined);
      editForm.resetFields();
    },
    onEditSubmit: (values: UserFormValues) => {
      if (!editing) {
        return;
      }

      updateUserMutation.mutate({
        id: editing.id,
        values,
        expectedActivityId: editingBaselineActivityId ?? undefined,
      });
    },
    onInviteValuesChange: inviteDraft.formProps.onValuesChange,
    onEditValuesChange: editDraft.formProps.onValuesChange,
  };
}
