import { MenuOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Divider, Drawer, Layout, Menu, Popover, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { OfflineQueueIndicator } from "../components/OfflineQueueIndicator";
import { useTheme } from "../app/useTheme";
import { useAuth } from "../features/auth/useAuth";
import { getAvailableNavItems } from "./navigation";
import { buildNavMenuItems, buildShellActionItems, getSelectedNavKey, renderUserName, type ShellActionKey } from "./shellMenus";
import { isShortcutTarget, matchesPlainKey } from "../utils/shortcuts";

export function AppLayout() {
  const auth = useAuth();
  const { mode, toggleMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const availableNavItems = getAvailableNavItems(auth.user);
  const menuItems = buildNavMenuItems(availableNavItems);
  const mobileActionItems = buildShellActionItems({ isDarkMode: mode === "dark" });
  const handleUserAction = (key: ShellActionKey) => {
    if (key === "profile") {
      navigate("/profile");
      return;
    }

    if (key === "theme") {
      toggleMode();
      return;
    }

    if (key === "logout") {
      void auth.logout();
    }
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
        navigate(navItem.key);
        return;
      }

      if (matchesPlainKey(event, "p")) {
        event.preventDefault();
        navigate("/profile");
        return;
      }

      if (matchesPlainKey(event, "t")) {
        event.preventDefault();
        toggleMode();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [auth, availableNavItems, navigate, toggleMode]);

  return (
    <Layout className="app-shell">
      <Layout.Sider width={236} className="app-sider" breakpoint="lg" collapsedWidth={0}>
        <div className="brand">MelodyTrack</div>
        <Menu mode="inline" selectedKeys={[selectedKey]} items={menuItems} onClick={({ key }) => navigate(key)} />
      </Layout.Sider>
      <Layout>
        <Layout.Header className="app-header">
          <Button
            type="text"
            className="app-mobile-menu-button"
            icon={<MenuOutlined />}
            aria-label="Открыть навигацию"
            onClick={() => setMobileNavOpen(true)}
          />
          <div className="app-header-spacer" />
          <OfflineQueueIndicator />
          <Popover
            trigger={["hover", "click"]}
            placement="bottomRight"
            overlayClassName="header-user-popover"
            content={
              <Menu
                mode="inline"
                className="header-user-menu"
                selectable={false}
                items={mobileActionItems}
                onClick={({ key }) => handleUserAction(key as ShellActionKey)}
              />
            }
          >
            <Button type="text" className="header-user-trigger" aria-label="Открыть меню пользователя">
              <Space size={8}>
                <UserOutlined />
                <Typography.Text>{renderUserName(auth.user?.firstName, auth.user?.lastName)}</Typography.Text>
              </Space>
            </Button>
          </Popover>
          <Typography.Text className="header-user-mobile">
            <Space size={6}>
              <UserOutlined />
              <span>{renderUserName(auth.user?.firstName, auth.user?.lastName)}</span>
            </Space>
          </Typography.Text>
        </Layout.Header>
        <Layout.Content className="app-content">
          <Space direction="vertical" size={18} className="content-stack">
            <Outlet />
          </Space>
        </Layout.Content>
      </Layout>
      <Drawer
        open={mobileNavOpen}
        placement="left"
        width={280}
        onClose={() => setMobileNavOpen(false)}
        className="mobile-nav-drawer"
      >
        <Space direction="vertical" size={16} className="wide">
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            onClick={({ key }) => {
              navigate(key);
              setMobileNavOpen(false);
            }}
          />
          <Divider className="mobile-nav-divider" />
          <Menu
            mode="inline"
            className="mobile-nav-actions-menu"
            selectable={false}
            items={mobileActionItems}
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
