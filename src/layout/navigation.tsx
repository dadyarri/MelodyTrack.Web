import {
  CalendarOutlined,
  CreditCardOutlined,
  DashboardOutlined,
  FileSearchOutlined,
  FolderOpenOutlined,
  LineChartOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";

type NavVisibility = "all" | "admin" | "superuser";
type NavGroup = "stats" | "reference-books";

export type AppNavItem = {
  key: string;
  icon: ReactNode;
  label: string;
  shortcut: string;
  visibility: NavVisibility;
  group?: NavGroup;
};

export type NavigationUser =
  | {
      isAdmin?: boolean;
      isSuperuser?: boolean;
    }
  | null
  | undefined;

export const appNavItems: AppNavItem[] = [
  { key: "/", icon: <DashboardOutlined />, label: "Обзор", shortcut: "1", visibility: "all" },
  { key: "/revenue", icon: <LineChartOutlined />, label: "Выручка", shortcut: "R", visibility: "all", group: "stats" },
  { key: "/schedule", icon: <CalendarOutlined />, label: "Расписание", shortcut: "2", visibility: "all" },
  { key: "/clients", icon: <TeamOutlined />, label: "Клиенты", shortcut: "3", visibility: "all" },
  { key: "/services", icon: <ToolOutlined />, label: "Услуги", shortcut: "4", visibility: "all" },
  { key: "/payments", icon: <CreditCardOutlined />, label: "Платежи", shortcut: "5", visibility: "all" },
  { key: "/expenses", icon: <WalletOutlined />, label: "Расходы", shortcut: "6", visibility: "all" },
  { key: "/audit", icon: <FileSearchOutlined />, label: "Аудит", shortcut: "7", visibility: "superuser" },
  { key: "/users", icon: <UserOutlined />, label: "Пользователи", shortcut: "8", visibility: "admin" },
  { key: "/expense-categories", icon: <FolderOpenOutlined />, label: "Статьи расходов", shortcut: "9", visibility: "all", group: "reference-books" },
  { key: "/client-sources", icon: <FolderOpenOutlined />, label: "Источники клиентов", shortcut: "0", visibility: "all", group: "reference-books" },
];

export function getAvailableNavItems(user: NavigationUser) {
  return appNavItems.filter((item) => {
    if (item.visibility === "superuser") {
      return Boolean(user?.isSuperuser);
    }

    if (item.visibility === "admin") {
      return Boolean(user?.isAdmin);
    }

    return true;
  });
}
