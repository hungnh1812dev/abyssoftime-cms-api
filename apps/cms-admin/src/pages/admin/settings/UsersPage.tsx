import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { type RoleItem, useRoleList } from "@/hooks/useRoles";
import { useDeleteUser, useUpdateUserRole, useUserList } from "@/hooks/useUsers";

export function UsersPage() {
  const { role: myRole, userId } = useAuth();

  const { data: users = [], isLoading } = useUserList();
  const { data: roles = [] } = useRoleList();
  const updateRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();

  const roleById = new Map(roles.map((role) => [role.documentId, role]));
  const myLevel = myRole?.level ?? 0;
  // A role can only be assigned by (and to a row managed by) a caller whose
  // own role level is strictly higher — mirrors the server-side hierarchy
  // check on PATCH /users/:id/role, done here against live role data instead
  // of a hardcoded role list.
  const availableRoles = roles.filter((role) => role.level < myLevel);

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
              const isMe = user.documentId === userId;
              const userRole: RoleItem | undefined = user.roleId ? roleById.get(user.roleId) : undefined;
              const canManage = !isMe && myLevel > (userRole?.level ?? 0);
              return (
                <TableRow key={user.documentId} className={isMe ? "bg-accent/30" : undefined}>
                  <TableCell>
                    {user.email}
                    {isMe && <span className="text-muted-foreground ml-2 text-xs">(you)</span>}
                  </TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{userRole?.name ?? "No role"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage && (
                      <div className="flex justify-end gap-2">
                        <Select
                          onValueChange={(roleId: string | null) => {
                            if (roleId) updateRole.mutate({ id: user.documentId, roleId });
                          }}>
                          <SelectTrigger className="h-8 w-32 text-xs">
                            <SelectValue placeholder="Change role" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRoles.map((role) => (
                              <SelectItem key={role.documentId} value={role.documentId}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Delete user ${user.email}?`)) {
                              deleteUser.mutate(user.documentId);
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

      <p className="text-muted-foreground text-sm">
        {users.length} user{users.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
