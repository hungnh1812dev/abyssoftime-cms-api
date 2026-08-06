import { Copy, Pencil, Trash2 } from "lucide-react";

import { PermissionTooltip } from "@/components/permissions/PermissionTooltip";
import { Button } from "@/components/ui/button";

interface RowActionsProps {
  contentTypeSlug: string;
  onEdit: (event: React.MouseEvent) => void;
  onDuplicate: (event: React.MouseEvent) => void;
  onDelete: (event: React.MouseEvent) => void;
}

export function RowActions({ contentTypeSlug, onEdit, onDuplicate, onDelete }: RowActionsProps) {
  return (
    <div className="flex justify-end gap-1">
      <Button variant="outline" size="icon-xs" className="hover:bg-accent-foreground/10" aria-label="Edit" onClick={onEdit}>
        <Pencil className="h-3 w-3" />
      </Button>
      <PermissionTooltip required="create" contentTypeSlug={contentTypeSlug}>
        <Button variant="outline" size="icon-xs" className="hover:bg-accent-foreground/10" aria-label="Duplicate" onClick={onDuplicate}>
          <Copy className="h-3 w-3" />
        </Button>
      </PermissionTooltip>
      <PermissionTooltip required="delete" contentTypeSlug={contentTypeSlug}>
        <Button variant="destructive" size="icon-xs" aria-label="Delete" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </PermissionTooltip>
    </div>
  );
}
