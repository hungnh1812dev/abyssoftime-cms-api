import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type PermissionItem, useCreatePermission, useDeletePermission, usePermissions, useUpdatePermission } from "@/hooks/usePermissions";

const SLUG_PATTERN = /^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$/;

function extractErrorMessage(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    return response?.data?.error;
  }
  return undefined;
}

interface PermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permission: PermissionItem | null;
}

function PermissionDialog({ open, onOpenChange, permission }: PermissionDialogProps) {
  const isEdit = permission !== null;
  const [slug, setSlug] = useState(permission?.slug ?? "");
  const [name, setName] = useState(permission?.name ?? "");
  const [description, setDescription] = useState(permission?.description ?? "");
  const createPermission = useCreatePermission();
  const updatePermission = useUpdatePermission();

  const slugValid = slug === "" || SLUG_PATTERN.test(slug);
  const saving = createPermission.isPending || updatePermission.isPending;

  function handleSave() {
    if (isEdit && permission) {
      updatePermission.mutate({ documentId: permission.documentId, data: { name, description } }, { onSuccess: () => onOpenChange(false) });
      return;
    }
    if (!slug || !name || !SLUG_PATTERN.test(slug)) return;
    createPermission.mutate({ slug, name, description }, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit Permission: ${permission.slug}` : "Create Permission"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="permission-slug">Slug</Label>
            <Input id="permission-slug" value={slug} onChange={(event) => setSlug(event.target.value)} disabled={isEdit} placeholder="e.g. reports:generate" />
            {!slugValid && <p className="text-destructive text-xs">Slug must match resource:action format (lowercase, e.g. "document:read")</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="permission-name">Name</Label>
            <Input id="permission-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="permission-description">Description</Label>
            <Input id="permission-description" value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
          {!isEdit && (
            <p className="text-muted-foreground text-xs">
              Creating a permission here does not grant any new capability by itself — a developer must add a matching check in the backend code before this permission has any
              effect.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name || (!isEdit && (!slug || !slugValid))}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Permission"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PermissionsPage() {
  const { data: permissions, isLoading, isError } = usePermissions();
  const deletePermission = useDeletePermission();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<PermissionItem | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});

  function openCreate() {
    setEditingPermission(null);
    setDialogOpen(true);
  }

  function openEdit(permission: PermissionItem) {
    setEditingPermission(permission);
    setDialogOpen(true);
  }

  function handleDelete(permission: PermissionItem) {
    setDeleteErrors((prev) => ({ ...prev, [permission.slug]: "" }));
    deletePermission.mutate(permission.documentId, {
      onError: (error: unknown) => {
        const message = extractErrorMessage(error) ?? "Failed to delete permission";
        setDeleteErrors((prev) => ({ ...prev, [permission.slug]: message }));
      },
    });
  }

  const sorted = [...(permissions ?? [])].sort((a, b) => a.slug.localeCompare(b.slug));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Permissions</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage the permission catalog. Roles select which of these to grant.</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          Create Permission
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : isError ? (
        <p className="text-destructive">Failed to load permissions.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Slug</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((permission) => (
              <TableRow key={permission.documentId}>
                <TableCell className="font-mono text-sm">{permission.slug}</TableCell>
                <TableCell>{permission.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{permission.description}</TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(permission)}>
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete permission "${permission.slug}"?`)) {
                            handleDelete(permission);
                          }
                        }}>
                        Delete
                      </Button>
                    </div>
                    {deleteErrors[permission.slug] && <p className="text-destructive text-xs">{deleteErrors[permission.slug]}</p>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <PermissionDialog key={editingPermission?.documentId ?? "create"} open={dialogOpen} onOpenChange={setDialogOpen} permission={editingPermission} />
    </div>
  );
}
