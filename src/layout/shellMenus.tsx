import { LogoutOutlined, MoonOutlined, SettingOutlined, SunOutlined } from "@ant-design/icons";
import type { ItemType } from "antd/es/menu/interface";
import type { ReactNode } from "react";
import type { AppNavItem } from "./navigation";
import { Shortcut } from "@/shared/ui/Shortcut";

export type ShellActionKey = "profile" | "theme" | "logout";

type ShellActionItemOptions = {
  isDarkMode: boolean;
};

type BuildNavMenuItemsOptions = {
  showShortcuts?: boolean;
};

const navGroupLabels = {
  stats: "Статистика",
  "reference-books": "Справочники",
} as const;

export function buildNavMenuItems(items: AppNavItem[], options: BuildNavMenuItemsOptions = {}): ItemType[] {
  const { showShortcuts = true } = options;
  const ungroupedItems = items.filter((item) => !item.group).map((item) => buildNavItem(item, showShortcuts));
  const statsItems = items.filter((item) => item.group === "stats").map((item) => buildNavItem(item, showShortcuts));
  const referenceBookItems = items.filter((item) => item.group === "reference-books").map((item) => buildNavItem(item, showShortcuts));

  return [
    ...ungroupedItems,
    ...(statsItems.length > 0 ? [{ key: "group:stats", label: navGroupLabels.stats, children: statsItems }] : []),
    ...(referenceBookItems.length > 0
      ? [{ key: "group:reference-books", label: navGroupLabels["reference-books"], children: referenceBookItems }]
      : []),
  ];
}

function buildNavItem(item: AppNavItem, showShortcuts: boolean): ItemType {
  return {
    key: item.key,
    icon: item.icon,
    label: (
      <span className="app-nav-label">
        <span>{item.label}</span>
        {showShortcuts ? <Shortcut keyb={item.shortcut} /> : null}
      </span>
    ),
  };
}

export function buildShellActionItems({ isDarkMode }: ShellActionItemOptions): ItemType[] {
  return [
    {
      key: "profile",
      icon: <SettingOutlined />,
      label: (
        <span className="app-nav-label">
          <span>Профиль</span>
          <Shortcut keyb={"U"} />
        </span>
      ),
    },
    {
      key: "theme",
      icon: isDarkMode ? <SunOutlined /> : <MoonOutlined />,
      label: (
        <span className="app-nav-label">
          <span>{isDarkMode ? "Светлая тема" : "Темная тема"}</span>
          <Shortcut keyb={"T"} />
        </span>
      ),
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: (
        <span className="app-nav-label">
          <span>Выйти</span>
        </span>
      ),
      danger: true,
    },
  ];
}

export function getSelectedNavKey(items: Pick<AppNavItem, "key">[], pathname: string) {
  return items.find((item) => item.key !== "/" && pathname.startsWith(item.key))?.key ?? "/";
}

export function renderUserName(firstName?: string | null, lastName?: string | null): ReactNode {
  return (
    <>
      {firstName} {lastName}
    </>
  );
}
