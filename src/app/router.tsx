import { createBrowserRouter, Navigate } from "react-router";
import { AuditPage } from "@/pages/audit";
import { AuthPage } from "@/pages/auth";
import { ClientsPage } from "@/pages/clients";
import { DashboardPage } from "@/pages/dashboard";
import { ExpensesPage } from "@/pages/expenses";
import { InviteRedirect } from "@/pages/invite-redirect";
import { PaymentsPage } from "@/pages/payments";
import { ProfilePage } from "@/pages/profile";
import { RestorePasswordPage } from "@/pages/restore-password";
import { SchedulePage } from "@/pages/schedule";
import { ServicesPage } from "@/pages/services";
import { UsersPage } from "@/pages/users";
import { AdminRoute } from "../layout/AdminRoute";
import { AppLayout } from "../layout/AppLayout";
import { ProtectedRoute } from "../layout/ProtectedRoute";
import { SuperuserRoute } from "../layout/SuperuserRoute";

export const router = createBrowserRouter([
  { path: "/invite/:inviteCode", element: <InviteRedirect /> },
  { path: "/login", element: <AuthPage /> },
  { path: "/restore", element: <RestorePasswordPage /> },
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
      {
        path: "audit",
        element: (
          <SuperuserRoute>
            <AuditPage />
          </SuperuserRoute>
        ),
      },
      { path: "services", element: <ServicesPage /> },
      { path: "payments", element: <PaymentsPage /> },
      { path: "expenses", element: <ExpensesPage /> },
      { path: "schedule", element: <SchedulePage /> },
      {
        path: "users",
        element: (
          <AdminRoute>
            <UsersPage />
          </AdminRoute>
        ),
      },
      { path: "profile", element: <ProfilePage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
