import { createBrowserRouter, Navigate } from "react-router";

import { AdminRoute } from "../layout/AdminRoute";
import { AppLayout } from "../layout/AppLayout";
import { ProtectedRoute } from "../layout/ProtectedRoute";
import { StatsRoute } from "../layout/StatsRoute";
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
        path: "revenue",
        lazy: async () => {
          const { RevenuePage } = await import("@/pages/revenue");

          return {
            Component: () => (
              <StatsRoute>
                <RevenuePage />
              </StatsRoute>
            ),
          };
        },
      },
      {
        path: "price-changes",
        lazy: async () => {
          const { PriceChangesPage } = await import("@/pages/price-changes");

          return {
            Component: () => (
              <StatsRoute>
                <PriceChangesPage />
              </StatsRoute>
            ),
          };
        },
      },
      {
        path: "appointments-stats",
        lazy: async () => {
          const { AppointmentsStatsPage } = await import("@/pages/appointments-stats");

          return {
            Component: () => (
              <StatsRoute>
                <AppointmentsStatsPage />
              </StatsRoute>
            ),
          };
        },
      },
      {
        path: "clients-stats",
        lazy: async () => {
          const { ClientsStatsPage } = await import("@/pages/clients-stats");

          return {
            Component: () => (
              <StatsRoute>
                <ClientsStatsPage />
              </StatsRoute>
            ),
          };
        },
      },
      {
        path: "payments-stats",
        lazy: async () => {
          const { PaymentsStatsPage } = await import("@/pages/payments-stats");

          return {
            Component: () => (
              <StatsRoute>
                <PaymentsStatsPage />
              </StatsRoute>
            ),
          };
        },
      },
      {
        path: "expenses-dashboard",
        lazy: async () => {
          const { ExpensesStatsPage } = await import("@/pages/expenses-stats");

          return {
            Component: () => (
              <StatsRoute>
                <ExpensesStatsPage />
              </StatsRoute>
            ),
          };
        },
      },
      {
        path: "expenses-stats",
        element: <Navigate to="/expenses-dashboard" replace />,
      },
      {
        path: "clients",
        lazy: async () => {
          const { ClientsPage } = await import("@/pages/clients");

          return {
            Component: () => (
              <AdminRoute>
                <ClientsPage />
              </AdminRoute>
            ),
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
            Component: () => (
              <AdminRoute>
                <ServicesPage />
              </AdminRoute>
            ),
          };
        },
      },
      {
        path: "payments",
        lazy: async () => {
          const { PaymentsPage } = await import("@/pages/payments");

          return {
            Component: () => (
              <AdminRoute>
                <PaymentsPage />
              </AdminRoute>
            ),
          };
        },
      },
      {
        path: "expenses",
        lazy: async () => {
          const { ExpensesPage } = await import("@/pages/expenses");

          return {
            Component: () => (
              <AdminRoute>
                <ExpensesPage />
              </AdminRoute>
            ),
          };
        },
      },
      {
        path: "expense-categories",
        lazy: async () => {
          const { ExpenseCategoriesPage } = await import("@/pages/expense-categories");

          return {
            Component: () => (
              <AdminRoute>
                <ExpenseCategoriesPage />
              </AdminRoute>
            ),
          };
        },
      },
      {
        path: "client-sources",
        lazy: async () => {
          const { ClientSourcesPage } = await import("@/pages/client-sources");

          return {
            Component: () => (
              <AdminRoute>
                <ClientSourcesPage />
              </AdminRoute>
            ),
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
