import { Button, Divider, Drawer, Layout, Menu, Popover, Space, Typography } from "antd";
import { lazy, type ReactNode, Suspense, useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { hasSuperuserAccess, useAuth } from "@/entities/session";
import { OfflineQueueIndicator } from "@/features/offline";
import { useTheme } from "@/shared/config";
import { clearNavigationIntent, isShortcutTarget, matchesPlainKey, recoverableImport, rememberNavigationIntent } from "@/shared/lib";
import {
  FileSearchOutlined,
  LeftOutlined,
  LogoutOutlined,
  MenuOutlined,
  MoonOutlined,
  RightOutlined,
  SettingOutlined,
  SunOutlined,
  UserOutlined,
} from "@/shared/ui/icons";

import styles from "./AppShell.module.css";
import { getAvailableNavItems } from "./navigation";
import { buildNavMenuItems, buildShellActionItems, getSelectedNavKey, renderUserName, type ShellActionKey } from "./shellMenus";

const AppOnboarding = lazy(async () => {
  const module = await recoverableImport(() => import("@/features/onboarding"));

  return { default: module.AppOnboarding };
});

export function AppShell({ children }: { children?: ReactNode }) {
  const auth = useAuth();
  const { mode, toggleMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [desktopNavOpen, setDesktopNavOpen] = useState(true);
  const availableNavItems = getAvailableNavItems(auth.user);
  const canViewAudit = hasSuperuserAccess(auth.user);
  const menuItems = buildNavMenuItems(availableNavItems, {
    showShortcuts: true,
    groupedPopupLabels: !desktopNavOpen,
    submenuPopupClassName: !desktopNavOpen ? styles.desktopNavSubmenuPopup : undefined,
  });
  const mobileMenuItems = buildNavMenuItems(availableNavItems, {
    showShortcuts: false,
  });
  const mobileActionItems = buildShellActionItems({
    canViewAudit,
    isDarkMode: mode === "dark",
  });
  const mobileDrawerActionItems = [
    { key: "profile", icon: <SettingOutlined />, label: "Профиль" },
    ...(canViewAudit ? [{ key: "audit", icon: <FileSearchOutlined />, label: "Аудит" }] : []),
    {
      key: "theme",
      icon: mode === "dark" ? <SunOutlined /> : <MoonOutlined />,
      label: mode === "dark" ? "Светлая тема" : "Темная тема",
    },
    { key: "logout", icon: <LogoutOutlined />, label: "Выйти", danger: true },
  ];
  const navigateTo = useCallback(
    (path: string) => {
      rememberNavigationIntent(path);
      void navigate(path);
    },
    [navigate],
  );
  const handleUserAction = (key: ShellActionKey) => {
    if (key === "profile") {
      navigateTo("/profile");
      return;
    }

    if (key === "audit") {
      navigateTo("/audit");
      return;
    }

    if (key === "theme") {
      toggleMode();
      return;
    }

    void auth.logout();
  };
  const selectedKey = getSelectedNavKey(availableNavItems, location.pathname);

  useEffect(() => {
    clearNavigationIntent(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || isShortcutTarget(event.target)) {
        return;
      }

      if (isShellShortcutReserved(location.pathname, event.key)) {
        return;
      }

      const navItem = availableNavItems.find((item) => matchesPlainKey(event, item.shortcut));
      if (navItem) {
        event.preventDefault();
        navigateTo(navItem.key);
        return;
      }

      if (matchesPlainKey(event, "u")) {
        event.preventDefault();
        navigateTo("/profile");
        return;
      }

      if (canViewAudit && matchesPlainKey(event, "i")) {
        event.preventDefault();
        navigateTo("/audit");
        return;
      }

      if (matchesPlainKey(event, "t")) {
        event.preventDefault();
        toggleMode();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [availableNavItems, canViewAudit, location.pathname, navigateTo, toggleMode]);

  return (
    <Layout className={styles.shell}>
      <Layout.Sider
        width={296}
        collapsedWidth={88}
        className={styles.sider}
        breakpoint="lg"
        collapsible
        trigger={null}
        collapsed={!desktopNavOpen}
        onCollapse={(collapsed) => {
          setDesktopNavOpen(!collapsed);
        }}
      >
        {/* <div className={styles.brand} data-onboarding-id="shell-brand">
          MelodyTrack
        </div> */}
        <div data-onboarding-id="shell-navigation">
          <Menu
            mode="inline"
            inlineCollapsed={!desktopNavOpen}
            selectedKeys={[selectedKey]}
            items={menuItems}
            onClick={({ key }) => {
              navigateTo(key);
            }}
          />
        </div>
      </Layout.Sider>
      <Layout>
        <Layout.Header className={styles.header}>
          <Button
            type="text"
            className={styles.desktopCollapseButton}
            icon={desktopNavOpen ? <LeftOutlined /> : <RightOutlined />}
            aria-label={desktopNavOpen ? "Свернуть навигацию" : "Развернуть навигацию"}
            onClick={() => {
              setDesktopNavOpen((current) => !current);
            }}
          />
          <Typography.Text className={styles.headerBrand} data-onboarding-id="shell-brand">
            MelodyTrack
          </Typography.Text>
          <Button
            type="text"
            className={styles.mobileMenuButton}
            icon={<MenuOutlined />}
            aria-label="Открыть навигацию"
            onClick={() => {
              setMobileNavOpen(true);
            }}
          />
          <div className={styles.headerSpacer} />
          <OfflineQueueIndicator />
          <Popover
            trigger={["hover", "click"]}
            placement="bottomRight"
            classNames={{ root: styles.headerUserPopover }}
            content={
              <Menu
                mode="inline"
                className={styles.headerUserMenu}
                selectable={false}
                items={mobileActionItems}
                onClick={({ key }) => {
                  handleUserAction(key as ShellActionKey);
                }}
              />
            }
          >
            <button
              type="button"
              className={styles.headerUserTrigger}
              aria-label="Открыть меню пользователя"
              data-onboarding-id="shell-profile-menu"
            >
              <Space size={8}>
                <UserOutlined />
                <Typography.Text>{renderUserName(auth.user?.firstName, auth.user?.lastName)}</Typography.Text>
              </Space>
            </button>
          </Popover>
          <Typography.Text className={styles.headerUserMobile}>
            <Space size={6}>
              <UserOutlined />
              <span>{renderUserName(auth.user?.firstName, auth.user?.lastName)}</span>
            </Space>
          </Typography.Text>
        </Layout.Header>
        <Layout.Content className={styles.content}>
          <Space orientation="vertical" className={styles.contentStack}>
            {children}
          </Space>
        </Layout.Content>
      </Layout>
      <Drawer
        open={mobileNavOpen}
        placement="left"
        size="large"
        onClose={() => {
          setMobileNavOpen(false);
        }}
        className={styles.mobileNavDrawer}
      >
        <Space orientation="vertical" size={16} className="wide">
          <Menu
            mode="inline"
            className={styles.mobileNavMenu}
            selectedKeys={[selectedKey]}
            items={mobileMenuItems}
            onClick={({ key }) => {
              navigateTo(key);
              setMobileNavOpen(false);
            }}
          />
          <Divider className="mobile-nav-divider" />
          <Menu
            mode="inline"
            className={styles.mobileNavActionsMenu}
            selectable={false}
            items={mobileDrawerActionItems}
            onClick={({ key }) => {
              setMobileNavOpen(false);
              handleUserAction(key as ShellActionKey);
            }}
          />
        </Space>
      </Drawer>
      <Suspense fallback={null}>
        <AppOnboarding />
      </Suspense>
    </Layout>
  );
}

function isShellShortcutReserved(pathname: string, key: string) {
  const normalizedKey = key.toLowerCase();

  if (pathname.startsWith("/schedule")) {
    return ["a", "m", "arrowleft", "arrowright", "home"].includes(normalizedKey);
  }

  if (pathname.startsWith("/profile")) {
    return ["r", "g", "o", "f", "w"].includes(normalizedKey);
  }

  if (pathname.startsWith("/payments") && !pathname.startsWith("/payments-stats")) {
    return ["a", "x"].includes(normalizedKey);
  }

  if (pathname.startsWith("/expenses") && pathname !== "/expenses-dashboard") {
    return ["a", "x"].includes(normalizedKey);
  }

  if (pathname.startsWith("/services")) {
    return normalizedKey === "a";
  }

  if (pathname.startsWith("/clients") && !pathname.startsWith("/clients-stats")) {
    return normalizedKey === "a";
  }

  if (pathname.startsWith("/users")) {
    return normalizedKey === "a";
  }

  if (pathname.startsWith("/expense-categories")) {
    return normalizedKey === "a";
  }

  if (pathname.startsWith("/client-sources")) {
    return normalizedKey === "a";
  }

  if (pathname === "/") {
    return normalizedKey === "x";
  }

  return false;
}
