import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { useRoleList } from "@/hooks/useRoles";
import { useDeleteUser, useUpdateUserRole, useUserList } from "@/hooks/useUsers";
import { roleLevel } from "@/lib/roles";

const ALL_ROLES = ["super_admin", "admin", "editor", "guest"] as const;

function rolesBelow(currentRole: string | null): string[] {
  const level = roleLevel(currentRole);
  return ALL_ROLES.filter((role) => roleLevel(role) < level);
}

export function UsersPage() {
  // TODO(Phase 2 / Task 2.3): role is now a live RoleItem object, not a slug
  // string — this shim keeps the file compiling against the still-hardcoded
  // ALL_ROLES/roleLevel model below until that task replaces both.
  const { role: myRoleObj, userId } = useAuth();
  const myRole = myRoleObj?.slug ?? null;
  const [page, setPage] = useState(1);

  const { data: usersData, isLoading } = useUserList(page);
  const { data: rolesData } = useRoleList();
  const updateRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();

  const users = usersData?.items ?? [];
  const total = usersData?.total ?? 0;
  const hasNext = page * 20 < total;
  const hasPrev = page > 1;
  const availableRoles = rolesBelow(myRole);
  const roleNameBySlug = new Map((rolesData ?? []).map((role) => [role.slug, role.name]));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Users</h1>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Display Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isMe = user.id === userId;
              const canManage = !isMe && roleLevel(myRole) > roleLevel(user.role);
              return (
                <TableRow key={user.id} className={isMe ? "bg-accent/30" : undefined}>
                  <TableCell>
                    {user.email}
                    {isMe && <span className="text-muted-foreground ml-2 text-xs">(you)</span>}
                  </TableCell>
                  <TableCell>{user.displayName}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{roleNameBySlug.get(user.role) ?? user.role}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage && (
                      <div className="flex justify-end gap-2">
                        <Select
                          onValueChange={(role: string | null) => {
                            if (role) updateRole.mutate({ id: user.id, role });
                          }}>
                          <SelectTrigger className="h-8 w-32 text-xs">
                            <SelectValue placeholder="Change role" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRoles.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Delete user ${user.email}?`)) {
                              deleteUser.mutate(user.id);
                            }
                          }}>
                          Delete
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">
          {total} user{total !== 1 ? "s" : ""}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((currentPage) => currentPage - 1)} disabled={!hasPrev}>
            Prev
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage((currentPage) => currentPage + 1)} disabled={!hasNext}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
