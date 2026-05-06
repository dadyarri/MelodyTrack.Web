import { createBrowserRouter, Navigate } from "react-router";
import { AppLayout } from "../layout/AppLayout";
import { ProtectedRoute } from "../layout/ProtectedRoute";
import { AuthPage } from "../pages/AuthPage";
import { ClientsPage } from "../pages/ClientsPage";
import { DashboardPage } from "../pages/DashboardPage";
import { ExpensesPage } from "../pages/ExpensesPage";
import { InviteRedirect } from "../pages/InviteRedirect";
import { PaymentsPage } from "../pages/PaymentsPage";
import { SchedulePage } from "../pages/SchedulePage";
import { ServicesPage } from "../pages/ServicesPage";
import { UsersPage } from "../pages/UsersPage";

export const router = createBrowserRouter([
  { path: "/invite/:inviteCode", element: <InviteRedirect /> },
  { path: "/login", element: <AuthPage /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "clients", element: <ClientsPage /> },
      { path: "services", element: <ServicesPage /> },
      { path: "payments", element: <PaymentsPage /> },
      { path: "expenses", element: <ExpensesPage /> },
      { path: "schedule", element: <SchedulePage /> },
      { path: "users", element: <UsersPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
