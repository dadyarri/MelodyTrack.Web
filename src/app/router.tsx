import { createBrowserRouter, Navigate } from "react-router";

import { AdminRoute } from "../layout/AdminRoute";
import { AppLayout } from "../layout/AppLayout";
import { ProtectedRoute } from "../layout/ProtectedRoute";
import { SuperuserRoute } from "../layout/SuperuserRoute";

export const router = createBrowserRouter([
  {
    path: "/invite/:inviteCode",
    lazy: async () => {
      const { InviteRedirect } = await import("@/pages/invite-redirect");

      return {
        Component: InviteRedirect,
      };
    },
  },
  {
    path: "/login",
    lazy: async () => {
      const { AuthPage } = await import("@/pages/auth");

      return {
        Component: AuthPage,
      };
    },
  },
  {
    path: "/restore",
    lazy: async () => {
      const { RestorePasswordPage } = await import("@/pages/restore-password");

      return {
        Component: RestorePasswordPage,
      };
    },
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        lazy: async () => {
          const { DashboardPage } = await import("@/pages/dashboard");

          return {
            Component: DashboardPage,
          };
        },
      },
      {
        path: "clients",
        lazy: async () => {
          const { ClientsPage } = await import("@/pages/clients");

          return {
            Component: ClientsPage,
          };
        },
      },
      {
        path: "audit",
        lazy: async () => {
          const { AuditPage } = await import("@/pages/audit");

          return {
            Component: () => (
              <SuperuserRoute>
                <AuditPage />
              </SuperuserRoute>
            ),
          };
        },
      },
      {
        path: "services",
        lazy: async () => {
          const { ServicesPage } = await import("@/pages/services");

          return {
            Component: ServicesPage,
          };
        },
      },
      {
        path: "payments",
        lazy: async () => {
          const { PaymentsPage } = await import("@/pages/payments");

          return {
            Component: PaymentsPage,
          };
        },
      },
      {
        path: "expenses",
        lazy: async () => {
          const { ExpensesPage } = await import("@/pages/expenses");

          return {
            Component: ExpensesPage,
          };
        },
      },
      {
        path: "expense-categories",
        lazy: async () => {
          const { ExpenseCategoriesPage } = await import("@/pages/expense-categories");

          return {
            Component: ExpenseCategoriesPage,
          };
        },
      },
      {
        path: "client-sources",
        lazy: async () => {
          const { ClientSourcesPage } = await import("@/pages/client-sources");

          return {
            Component: ClientSourcesPage,
          };
        },
      },
      {
        path: "schedule",
        lazy: async () => {
          const { SchedulePage } = await import("@/pages/schedule");

          return {
            Component: SchedulePage,
          };
        },
      },
      {
        path: "users",
        lazy: async () => {
          const { UsersPage } = await import("@/pages/users");

          return {
            Component: () => (
              <AdminRoute>
                <UsersPage />
              </AdminRoute>
            ),
          };
        },
      },
      {
        path: "profile",
        lazy: async () => {
          const { ProfilePage } = await import("@/pages/profile");

          return {
            Component: ProfilePage,
          };
        },
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
