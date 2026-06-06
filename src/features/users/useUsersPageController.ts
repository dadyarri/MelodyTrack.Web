import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App as AntdApp, Form } from "antd";
import { useEffect, useState } from "react";
import { authApi, type CreateInviteInput } from "@/api/auth";
import { queryKeys } from "@/api/queryKeys";
import { usersApi } from "@/api/crm";
import { getApiErrorMessages } from "@/api/http";
import type { User, Ulid } from "@/api/types";
import { normalizePhone, normalizeSocialLink } from "@/entities/client";
import { hasAdminAccess } from "@/features/auth/access";
import { useAuth } from "@/features/auth/useAuth";
import { findItemInQueryData, handleStaleEntityConflict, isActivityStale } from "@/utils/staleEntity";
import { isShortcutTarget, matchesPlainKey } from "@/utils/shortcuts";
import type { UserFormValues } from "./UserEditorModal";

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
  const queryClient = useQueryClient();
  const { message, modal } = AntdApp.useApp();
  const canManageUsers = hasAdminAccess(auth.user);
  const showErrors = (error: unknown) => {
    for (const errorMessage of getApiErrorMessages(error)) {
      void message.error(errorMessage);
    }
  };
  const query = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: () => usersApi.list(),
  });
  const currentEditingUser = editing ? (query.data?.find((user) => user.id === editing.id) ?? editing) : null;
  const isEditingUserStale = currentEditingUser ? isActivityStale(currentEditingUser.lastActivity?.id, editingBaselineActivityId) : false;

  const createInviteMutation = useMutation({
    mutationFn: (input: CreateInviteInput) => authApi.createInvite(input),
    onSuccess: (data) => {
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
      setEditing(null);
      setEditingBaselineActivityId(undefined);
      editForm.resetFields();
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: async (error, variables) => {
      await handleStaleEntityConflict({
        error,
        modal,
        queryClient,
        invalidateQueryKey: queryKeys.users.all,
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
            findItemInQueryData(queryClient, queryKeys.users.all, (data) => data as User[] | undefined, variables.id) ?? currentEditingUser;
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
      form.resetFields();
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
  };
}
