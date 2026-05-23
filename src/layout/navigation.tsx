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
import { canAccessAudience, type AccessAudience, type AppUser } from "@/features/auth/access";

type NavGroup = "stats" | "reference-books";

export type AppNavItem = {
  key: string;
  icon: ReactNode;
  label: string;
  shortcut: string;
  visibility: AccessAudience;
  group?: NavGroup;
};

export const appNavItems: AppNavItem[] = [
  { key: "/", icon: <DashboardOutlined />, label: "Обзор", shortcut: "1", visibility: "all" },
  { key: "/revenue", icon: <LineChartOutlined />, label: "Выручка", shortcut: "R", visibility: "stats", group: "stats" },
  { key: "/price-changes", icon: <LineChartOutlined />, label: "Изменения цен", shortcut: "P", visibility: "stats", group: "stats" },
  { key: "/appointments-stats", icon: <LineChartOutlined />, label: "Записи", shortcut: "A", visibility: "stats", group: "stats" },
  { key: "/clients-stats", icon: <LineChartOutlined />, label: "Клиенты", shortcut: "C", visibility: "stats", group: "stats" },
  { key: "/payments-stats", icon: <LineChartOutlined />, label: "Платежи", shortcut: "M", visibility: "stats", group: "stats" },
  { key: "/expenses-dashboard", icon: <LineChartOutlined />, label: "Расходы", shortcut: "E", visibility: "stats", group: "stats" },
  { key: "/schedule", icon: <CalendarOutlined />, label: "Расписание", shortcut: "2", visibility: "all" },
  { key: "/clients", icon: <TeamOutlined />, label: "Клиенты", shortcut: "3", visibility: "admin" },
  { key: "/services", icon: <ToolOutlined />, label: "Услуги", shortcut: "4", visibility: "admin" },
  { key: "/payments", icon: <CreditCardOutlined />, label: "Платежи", shortcut: "5", visibility: "admin" },
  { key: "/expenses", icon: <WalletOutlined />, label: "Расходы", shortcut: "6", visibility: "admin" },
  { key: "/audit", icon: <FileSearchOutlined />, label: "Аудит", shortcut: "7", visibility: "superuser" },
  { key: "/users", icon: <UserOutlined />, label: "Пользователи", shortcut: "8", visibility: "admin" },
  {
    key: "/expense-categories",
    icon: <FolderOpenOutlined />,
    label: "Статьи расходов",
    shortcut: "9",
    visibility: "admin",
    group: "reference-books",
  },
  {
    key: "/client-sources",
    icon: <FolderOpenOutlined />,
    label: "Источники клиентов",
    shortcut: "0",
    visibility: "admin",
    group: "reference-books",
  },
];

export function getAvailableNavItems(user: AppUser) {
  return appNavItems.filter((item) => canAccessAudience(user, item.visibility));
}
