import { CalendarOutlined, CreditCardOutlined, DashboardOutlined, LogoutOutlined, MoonOutlined, SettingOutlined, SunOutlined, TeamOutlined, ToolOutlined, UserOutlined, WalletOutlined } from "@ant-design/icons";
import { Button, Layout, Menu, Popover, Space, Typography } from "antd";
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
  { key: "/users", icon: <UserOutlined />, label: "Пользователи" },
];

export function AppLayout() {
  const auth = useAuth();
  const { mode, toggleMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const selectedKey = navItems.find((item) => item.key !== "/" && location.pathname.startsWith(item.key))?.key ?? "/";

  return (
    <Layout className="app-shell">
      <Layout.Sider width={236} className="app-sider" breakpoint="lg" collapsedWidth={0}>
        <div className="brand">MelodyTrack</div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={navItems}
          onClick={({ key }) => navigate(key)}
        />
      </Layout.Sider>
      <Layout>
        <Layout.Header className="app-header">
          <Popover
            trigger="hover"
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
            <Button type="text" className="header-user-trigger">
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
    </Layout>
  );
}
