import { LogoutOutlined, MenuOutlined, MoonOutlined, SettingOutlined, SunOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Divider, Drawer, Layout, Menu, Popover, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { useTheme } from "../app/useTheme";
import { OfflineQueueIndicator } from "../components/OfflineQueueIndicator";
import { useAuth } from "../features/auth/useAuth";
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

      const navItem = availableNavItems.find((item) => matchesPlainKey(event, item.shortcut));
      if (navItem) {
        event.preventDefault();
        void navigate(navItem.key);
        return;
      }

      if (matchesPlainKey(event, "p")) {
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
  }, [availableNavItems, navigate, toggleMode]);

  return (
    <Layout className={styles.shell}>
      <Layout.Sider width={296} className={styles.sider} breakpoint="lg" collapsedWidth={0}>
        <div className={styles.brand}>MelodyTrack</div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => {
            void navigate(key);
          }}
        />
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
            <button type="button" className={styles.headerUserTrigger} aria-label="Открыть меню пользователя">
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
    </Layout>
  );
}
