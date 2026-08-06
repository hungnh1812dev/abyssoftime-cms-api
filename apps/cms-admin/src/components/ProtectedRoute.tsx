import { useQuery } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";

export function ProtectedRoute({
  children,
  minLevel,
  requiredPermission,
}: {
  children: ReactNode;
  minLevel?: number;
  requiredPermission?: string;
}) {
  const { user, role, permissions, loading } = useAuth();

  const { data: hasUsersData, isLoading: hasUsersLoading } = useQuery({
    queryKey: ["auth-has-users"],
    queryFn: () => api.get<{ hasUsers: boolean }>("/auth/has-users").then((response) => response.data),
    enabled: !loading && !user,
    staleTime: 30_000,
  });

  if (loading || hasUsersLoading) return null;
  if (!user) {
    const hasUsers = hasUsersData?.hasUsers ?? true;
    return <Navigate to={hasUsers ? "/login" : "/register"} replace />;
  }
  if (minLevel !== undefined && (role?.level ?? 0) < minLevel) {
    return <Navigate to="/403" replace />;
  }
  if (requiredPermission !== undefined && !hasPermission(permissions, requiredPermission)) {
    return <Navigate to="/403" replace />;
  }
  return <>{children}</>;
}
