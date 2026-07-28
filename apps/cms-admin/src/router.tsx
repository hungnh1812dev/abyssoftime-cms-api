import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/pages/admin/layout/AdminLayout";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { VerifyOtpPage } from "@/pages/auth/VerifyOtpPage";

import { AdminPage } from "./pages/admin/AdminPage";

const ContentTypePage = lazy(() =>
  import("@/pages/admin/panels/ContentTypePage").then((module) => ({
    default: module.ContentTypePage,
  })),
);

const CollectionDetailPage = lazy(() =>
  import("@/pages/admin/panels/collection-type/CollectionDetailPage").then((module) => ({
    default: module.CollectionDetailPage,
  })),
);

const MediaLibraryPage = lazy(() =>
  import("@/pages/admin/settings/MediaLibraryPage").then((module) => ({
    default: module.MediaLibraryPage,
  })),
);

const UsersPage = lazy(() =>
  import("@/pages/admin/settings/UsersPage").then((module) => ({
    default: module.UsersPage,
  })),
);

const AccessTokensPage = lazy(() =>
  import("@/pages/admin/settings/AccessTokensPage").then((module) => ({
    default: module.AccessTokensPage,
  })),
);

const RolesPage = lazy(() =>
  import("@/pages/admin/settings/RolesPage").then((module) => ({
    default: module.RolesPage,
  })),
);

const PermissionsPage = lazy(() =>
  import("@/pages/admin/settings/PermissionsPage").then((module) => ({
    default: module.PermissionsPage,
  })),
);

const InternationalizePage = lazy(() =>
  import("@/pages/admin/settings/InternationalizePage").then((module) => ({
    default: module.InternationalizePage,
  })),
);

function PanelFallback() {
  return <div className="text-muted-foreground p-4">Loading…</div>;
}

// Floor thresholds for ProtectedRoute's minLevel gate, matching this API's
// seeded roles' level values. Roles are a fully dynamic catalog (any custom
// role can exist at any level 0-100) — these are just the well-known floors
// this app's own settings routes gate on, not an exhaustive role list.
const ROLE_LEVEL = {
  ADMIN: 50,
  SUPER_ADMIN: 100,
} as const;

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-otp" element={<VerifyOtpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/403"
        element={
          <div className="flex min-h-screen items-center justify-center">
            <p className="text-muted-foreground">403 — Forbidden</p>
          </div>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }>
        <Route index element={<AdminPage />} />

        <Route
          path="content-type/single-type/:slug"
          element={
            <Suspense fallback={<PanelFallback />}>
              <ContentTypePage />
            </Suspense>
          }
        />
        <Route
          path="content-type/collection-type/:slug"
          element={
            <Suspense fallback={<PanelFallback />}>
              <ContentTypePage />
            </Suspense>
          }
        />
        <Route
          path="content-type/collection-type/:slug/new"
          element={
            <Suspense fallback={<PanelFallback />}>
              <CollectionDetailPage />
            </Suspense>
          }
        />
        <Route
          path="content-type/collection-type/:slug/:id"
          element={
            <Suspense fallback={<PanelFallback />}>
              <CollectionDetailPage />
            </Suspense>
          }
        />
        <Route
          path="settings/media"
          element={
            <Suspense fallback={<PanelFallback />}>
              <MediaLibraryPage />
            </Suspense>
          }
        />
        <Route
          path="settings/users"
          element={
            <ProtectedRoute minLevel={ROLE_LEVEL.ADMIN}>
              <Suspense fallback={<PanelFallback />}>
                <UsersPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="settings/access-tokens"
          element={
            <ProtectedRoute minLevel={ROLE_LEVEL.SUPER_ADMIN}>
              <Suspense fallback={<PanelFallback />}>
                <AccessTokensPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="settings/roles"
          element={
            <ProtectedRoute minLevel={ROLE_LEVEL.SUPER_ADMIN}>
              <Suspense fallback={<PanelFallback />}>
                <RolesPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="settings/permissions"
          element={
            <ProtectedRoute minLevel={ROLE_LEVEL.SUPER_ADMIN}>
              <Suspense fallback={<PanelFallback />}>
                <PermissionsPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="settings/internationalize"
          element={
            <ProtectedRoute minLevel={ROLE_LEVEL.SUPER_ADMIN}>
              <Suspense fallback={<PanelFallback />}>
                <InternationalizePage />
              </Suspense>
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
