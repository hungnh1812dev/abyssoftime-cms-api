import { useQuery } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export function ProtectedRoute({ children, minLevel }: { children: ReactNode; minLevel?: number }) {
  const { user, role, loading } = useAuth();

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
  return <>{children}</>;
}
