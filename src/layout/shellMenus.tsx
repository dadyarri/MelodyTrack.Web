import { LogoutOutlined, MoonOutlined, SettingOutlined, SunOutlined } from "@ant-design/icons";
import type { ItemType } from "antd/es/menu/interface";
import type { ReactNode } from "react";
import type { AppNavItem } from "./navigation";

export type ShellActionKey = "profile" | "theme" | "logout";

type ShellActionItemOptions = {
  isDarkMode: boolean;
};

export function buildNavMenuItems(items: AppNavItem[]): ItemType[] {
  return items.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: (
      <span className="app-nav-label">
        <span>{item.label}</span>
        <span className="app-nav-shortcut">{item.shortcut}</span>
      </span>
    ),
  }));
}

export function buildShellActionItems({ isDarkMode }: ShellActionItemOptions): ItemType[] {
  return [
    {
      key: "profile",
      icon: <SettingOutlined />,
      label: (
        <span className="app-nav-label">
          <span>Профиль</span>
          <span className="app-nav-shortcut">P</span>
        </span>
      ),
    },
    {
      key: "theme",
      icon: isDarkMode ? <SunOutlined /> : <MoonOutlined />,
      label: (
        <span className="app-nav-label">
          <span>{isDarkMode ? "Светлая тема" : "Темная тема"}</span>
          <span className="app-nav-shortcut">T</span>
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
