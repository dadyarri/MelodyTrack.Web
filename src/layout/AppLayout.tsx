import { CalendarOutlined, CreditCardOutlined, DashboardOutlined, FileSearchOutlined, LogoutOutlined, MenuOutlined, MoonOutlined, SettingOutlined, SunOutlined, TeamOutlined, ToolOutlined, UserOutlined, WalletOutlined } from "@ant-design/icons";
import { Button, Divider, Drawer, Layout, Menu, Popover, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { useTheme } from "../app/useTheme";
import { useAuth } from "../features/auth/useAuth";
import { ShortcutButton } from "../components/ShortcutButton";
import { isShortcutTarget, matchesPlainKey } from "../utils/shortcuts";

const navItems = [
  { key: "/", icon: <DashboardOutlined />, label: "Обзор", shortcut: "1" },
  { key: "/schedule", icon: <CalendarOutlined />, label: "Расписание", shortcut: "2" },
  { key: "/clients", icon: <TeamOutlined />, label: "Клиенты", shortcut: "3" },
  { key: "/services", icon: <ToolOutlined />, label: "Услуги", shortcut: "4" },
  { key: "/payments", icon: <CreditCardOutlined />, label: "Платежи", shortcut: "5" },
  { key: "/expenses", icon: <WalletOutlined />, label: "Расходы", shortcut: "6" },
  { key: "/audit", icon: <FileSearchOutlined />, label: "Аудит", shortcut: "7", superuserOnly: true },
  { key: "/users", icon: <UserOutlined />, label: "Пользователи", shortcut: "8", adminOnly: true },
];

export function AppLayout() {
  const auth = useAuth();
  const { mode, toggleMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const availableNavItems = navItems.filter((item) => {
    if (item.superuserOnly) {
      return auth.user?.isSuperuser;
    }

    return !item.adminOnly || auth.user?.isAdmin;
  });
  const menuItems = availableNavItems.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: (
      <span className="app-nav-label">
        <span>{item.label}</span>
        <span className="app-nav-shortcut">{item.shortcut}</span>
      </span>
    ),
  }));
  const mobileActionItems = [
    {
      key: "profile",
      icon: <SettingOutlined />,
      label: "Профиль",
    },
    {
      key: "theme",
      icon: mode === "dark" ? <SunOutlined /> : <MoonOutlined />,
      label: mode === "dark" ? "Светлая тема" : "Темная тема",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Выйти",
      danger: true,
    },
  ];
  const selectedKey = availableNavItems.find((item) => item.key !== "/" && location.pathname.startsWith(item.key))?.key ?? "/";

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

      if (matchesPlainKey(event, "l")) {
        event.preventDefault();
        void auth.logout();
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
          <Popover
            trigger={["hover", "click"]}
            placement="bottomRight"
            content={
              <Space direction="vertical" className="header-user-pane">
                <ShortcutButton shortcut="P" leadingIcon={<SettingOutlined />} label="Профиль" onClick={() => navigate("/profile")} />
                <ShortcutButton
                  shortcut="T"
                  leadingIcon={mode === "dark" ? <SunOutlined /> : <MoonOutlined />}
                  label={mode === "dark" ? "Светлая тема" : "Темная тема"}
                  onClick={toggleMode}
                />
                <ShortcutButton shortcut="L" danger leadingIcon={<LogoutOutlined />} label="Выйти" onClick={() => void auth.logout()} />
              </Space>
            }
          >
            <Button type="text" className="header-user-trigger" aria-label="Открыть меню пользователя">
              <Space size={8}>
                <UserOutlined />
                <Typography.Text>
                  {auth.user?.firstName} {auth.user?.lastName}
                </Typography.Text>
              </Space>
            </Button>
          </Popover>
          <Typography.Text className="header-user-mobile">
            <Space size={6}>
              <UserOutlined />
              <span>
                {auth.user?.firstName} {auth.user?.lastName}
              </span>
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
            }}
          />
        </Space>
      </Drawer>
    </Layout>
  );
}
