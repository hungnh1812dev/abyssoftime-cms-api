import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface DeleteConfirmDialogProps {
  open: boolean;
  bulkCount: number | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({ open, bulkCount, onOpenChange, onConfirm }: DeleteConfirmDialogProps) {
  const isBulk = bulkCount !== null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{isBulk ? `Delete ${bulkCount} entries` : "Delete entry"}</DialogTitle>
          <DialogDescription>
            {isBulk
              ? `Are you sure you want to delete ${bulkCount} selected entries? This action cannot be undone.`
              : "Are you sure you want to delete this entry? This action cannot be undone."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
