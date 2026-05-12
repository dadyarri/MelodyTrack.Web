import { CalendarOutlined, CreditCardOutlined, DashboardOutlined, FileSearchOutlined, LogoutOutlined, MenuOutlined, MoonOutlined, SettingOutlined, SunOutlined, TeamOutlined, ToolOutlined, UserOutlined, WalletOutlined } from "@ant-design/icons";
import { Button, Drawer, Layout, Menu, Popover, Space, Typography } from "antd";
import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { useTheme } from "../app/useTheme";
import { useAuth } from "../features/auth/useAuth";

const navItems = [
  { key: "/", icon: <DashboardOutlined />, label: "Обзор" },
  { key: "/schedule", icon: <CalendarOutlined />, label: "Расписание" },
  { key: "/clients", icon: <TeamOutlined />, label: "Клиенты" },
  { key: "/services", icon: <ToolOutlined />, label: "Услуги" },
  { key: "/payments", icon: <CreditCardOutlined />, label: "Платежи" },
  { key: "/expenses", icon: <WalletOutlined />, label: "Расходы" },
  { key: "/audit", icon: <FileSearchOutlined />, label: "Аудит", superuserOnly: true },
  { key: "/users", icon: <UserOutlined />, label: "Пользователи", adminOnly: true },
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
  const selectedKey = availableNavItems.find((item) => item.key !== "/" && location.pathname.startsWith(item.key))?.key ?? "/";

  return (
    <Layout className="app-shell">
      <Layout.Sider width={236} className="app-sider" breakpoint="lg" collapsedWidth={0}>
        <div className="brand">MelodyTrack</div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={availableNavItems}
          onClick={({ key }) => navigate(key)}
        />
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
            trigger="click"
            placement="bottomRight"
            content={
              <Space direction="vertical" className="header-user-pane">
                <Button block icon={<SettingOutlined />} onClick={() => navigate("/profile")}>
                  Профиль
                </Button>
                <Button block icon={mode === "dark" ? <SunOutlined /> : <MoonOutlined />} onClick={toggleMode}>
                  {mode === "dark" ? "Светлая тема" : "Темная тема"}
                </Button>
                <Button block danger icon={<LogoutOutlined />} onClick={() => void auth.logout()}>
                  Выйти
                </Button>
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
        title="Навигация"
        className="mobile-nav-drawer"
      >
        <Space direction="vertical" size={16} className="wide">
          <div className="brand">MelodyTrack</div>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={availableNavItems}
            onClick={({ key }) => {
              navigate(key);
              setMobileNavOpen(false);
            }}
          />
          <Space direction="vertical" className="wide mobile-nav-actions">
            <Button block icon={<SettingOutlined />} onClick={() => {
              setMobileNavOpen(false);
              navigate("/profile");
            }}>
              Профиль
            </Button>
            <Button
              block
              icon={mode === "dark" ? <SunOutlined /> : <MoonOutlined />}
              onClick={() => {
                toggleMode();
                setMobileNavOpen(false);
              }}
            >
              {mode === "dark" ? "Светлая тема" : "Темная тема"}
            </Button>
            <Button
              block
              danger
              icon={<LogoutOutlined />}
              onClick={() => {
                setMobileNavOpen(false);
                void auth.logout();
              }}
            >
              Выйти
            </Button>
          </Space>
        </Space>
      </Drawer>
    </Layout>
  );
}
