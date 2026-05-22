import { LogoutOutlined, MenuOutlined, MoonOutlined, SettingOutlined, SunOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Divider, Drawer, Layout, Menu, Popover, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { useTheme } from "../app/useTheme";
import { OfflineQueueIndicator } from "../components/OfflineQueueIndicator";
import { useAuth } from "../features/auth/useAuth";
import { AppOnboarding } from "../features/onboarding/AppOnboarding";
import { isShortcutTarget, matchesPlainKey } from "../utils/shortcuts";
import { getAvailableNavItems } from "./navigation";
import { buildNavMenuItems, buildShellActionItems, getSelectedNavKey, renderUserName, type ShellActionKey } from "./shellMenus";
import styles from "./AppLayout.module.css";

export function AppLayout() {
  const auth = useAuth();
  const { mode, toggleMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const availableNavItems = getAvailableNavItems(auth.user);
  const menuItems = buildNavMenuItems(availableNavItems);
  const mobileActionItems = buildShellActionItems({ isDarkMode: mode === "dark" });
  const mobileDrawerActionItems = [
    { key: "profile", icon: <SettingOutlined />, label: "Профиль" },
    { key: "theme", icon: mode === "dark" ? <SunOutlined /> : <MoonOutlined />, label: mode === "dark" ? "Светлая тема" : "Темная тема" },
    { key: "logout", icon: <LogoutOutlined />, label: "Выйти", danger: true },
  ];
  const handleUserAction = (key: ShellActionKey) => {
    if (key === "profile") {
      void navigate("/profile");
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
        void navigate(navItem.key);
        return;
      }

      if (matchesPlainKey(event, "u")) {
        event.preventDefault();
        void navigate("/profile");
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
  }, [availableNavItems, location.pathname, navigate, toggleMode]);

  return (
    <Layout className={styles.shell}>
      <Layout.Sider width={296} className={styles.sider} breakpoint="lg" collapsedWidth={0}>
        <div className={styles.brand} data-onboarding-id="shell-brand">
          MelodyTrack
        </div>
        <div data-onboarding-id="shell-navigation">
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            onClick={({ key }) => {
              void navigate(key);
            }}
          />
        </div>
      </Layout.Sider>
      <Layout>
        <Layout.Header className={styles.header}>
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
            <button type="button" className={styles.headerUserTrigger} aria-label="Открыть меню пользователя" data-onboarding-id="shell-profile-menu">
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
            <Outlet />
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
            items={availableNavItems.map((item) => ({
              key: item.key,
              icon: item.icon,
              label: item.label,
            }))}
            onClick={({ key }) => {
              void navigate(key);
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
      <AppOnboarding />
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
