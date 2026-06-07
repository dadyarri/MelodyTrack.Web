import {
  CalendarCheckOutlined,
  CalendarOutlined,
  CoinsOutlined,
  CreditCardOutlined,
  DashboardOutlined,
  DollarOutlined,
  FolderOpenOutlined,
  FunnelTargetOutlined,
  LineChartOutlined,
  ListTodoOutlined,
  PieChartOutlined,
  TagsOutlined,
  TeamOutlined,
  TeamStatsOutlined,
  ToolOutlined,
  UserBadgeOutlined,
  WalletOutlined,
  WalletStatsOutlined,
} from "@/components/icons";
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

export const navGroupLabels = {
  stats: "Статистика",
  "reference-books": "Справочники",
} as const;

export const navGroupIcons: Record<NavGroup, ReactNode> = {
  stats: <PieChartOutlined />,
  "reference-books": <FolderOpenOutlined />,
};

export const appNavItems: AppNavItem[] = [
  {
    key: "/",
    icon: <DashboardOutlined />,
    label: "Обзор",
    shortcut: "1",
    visibility: "all",
  },
  {
    key: "/tasks",
    icon: <ListTodoOutlined />,
    label: "Задачи",
    shortcut: "2",
    visibility: "admin",
  },
  {
    key: "/revenue",
    icon: <LineChartOutlined />,
    label: "Выручка",
    shortcut: "R",
    visibility: "stats",
    group: "stats",
  },
  {
    key: "/price-changes",
    icon: <DollarOutlined />,
    label: "Изменения цен",
    shortcut: "P",
    visibility: "stats",
    group: "stats",
  },
  {
    key: "/appointments-stats",
    icon: <CalendarCheckOutlined />,
    label: "Записи",
    shortcut: "Z",
    visibility: "stats",
    group: "stats",
  },
  {
    key: "/clients-stats",
    icon: <TeamStatsOutlined />,
    label: "Клиенты",
    shortcut: "C",
    visibility: "stats",
    group: "stats",
  },
  {
    key: "/payments-stats",
    icon: <WalletStatsOutlined />,
    label: "Платежи",
    shortcut: "M",
    visibility: "stats",
    group: "stats",
  },
  {
    key: "/expenses-dashboard",
    icon: <CoinsOutlined />,
    label: "Расходы",
    shortcut: "E",
    visibility: "stats",
    group: "stats",
  },
  {
    key: "/schedule",
    icon: <CalendarOutlined />,
    label: "Расписание",
    shortcut: "3",
    visibility: "all",
  },
  {
    key: "/clients",
    icon: <TeamOutlined />,
    label: "Клиенты",
    shortcut: "4",
    visibility: "admin",
  },
  {
    key: "/services",
    icon: <ToolOutlined />,
    label: "Услуги",
    shortcut: "7",
    visibility: "admin",
    group: "reference-books",
  },
  {
    key: "/payments",
    icon: <CreditCardOutlined />,
    label: "Платежи",
    shortcut: "5",
    visibility: "admin",
  },
  {
    key: "/expenses",
    icon: <WalletOutlined />,
    label: "Расходы",
    shortcut: "6",
    visibility: "admin",
  },
  {
    key: "/users",
    icon: <UserBadgeOutlined />,
    label: "Пользователи",
    shortcut: "8",
    visibility: "admin",
    group: "reference-books",
  },
  {
    key: "/expense-categories",
    icon: <TagsOutlined />,
    label: "Статьи расходов",
    shortcut: "9",
    visibility: "admin",
    group: "reference-books",
  },
  {
    key: "/client-sources",
    icon: <FunnelTargetOutlined />,
    label: "Источники клиентов",
    shortcut: "0",
    visibility: "admin",
    group: "reference-books",
  },
];

export function getAvailableNavItems(user: AppUser) {
  return appNavItems.filter((item) => canAccessAudience(user, item.visibility));
}
