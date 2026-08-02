import { useState } from "react";
import { type Control, Controller } from "react-hook-form";

import { MediaLibrary } from "@/components/media/MediaLibrary";
import { useMediaList } from "@/hooks/useMedia";
import { displayFileName } from "@/lib/media";
import type { MediaAsset } from "@/types/cms";

interface MediaInputProps {
  name?: string;
  control?: Control;
  "aria-label"?: string;
}

export function MediaInput({ name, control, "aria-label": ariaLabel }: MediaInputProps) {
  return <Controller name={name ?? ""} control={control} defaultValue={null} render={({ field }) => <MediaInputInner field={field} ariaLabel={ariaLabel ?? name} />} />;
}

interface MediaInputInnerProps {
  field: { value: unknown; onChange: (value: unknown) => void };
  ariaLabel?: string;
}

function MediaInputInner({ field, ariaLabel }: MediaInputInnerProps) {
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const { data: mediaItems, isLoading } = useMediaList();

  const documentId = typeof field.value === "string" && field.value ? field.value : null;
  const asset = documentId ? (mediaItems?.find((item) => item.documentId === documentId) ?? null) : null;
  const isMissing = documentId !== null && !isLoading && asset === null;
  const isResolving = documentId !== null && isLoading;
  const displayUrl = asset ? asset.thumbnailUrl || asset.url : null;
  const displayName = asset ? displayFileName(asset) : null;

  function handleSelect(selected: MediaAsset) {
    field.onChange(selected.documentId);
  }

  function handleRemove(event: React.MouseEvent) {
    event.stopPropagation();
    field.onChange(null);
  }

  return (
    <>
      <div
        data-testid="media-upload-zone"
        aria-label={ariaLabel}
        role="button"
        tabIndex={0}
        className="border-input hover:border-ring relative cursor-pointer overflow-hidden rounded-md border transition-colors"
        onClick={() => setIsLibraryOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") setIsLibraryOpen(true);
        }}>
        {displayUrl ? (
          <>
            <img src={displayUrl} alt={displayName ?? "media preview"} className="h-auto max-h-40 w-full object-contain" />
            {displayName && <span className="text-muted-foreground block truncate border-t px-2 py-1 text-center text-[11px]">{displayName}</span>}
            <button
              type="button"
              aria-label="Remove image"
              className="bg-background/80 text-muted-foreground hover:text-destructive absolute top-1 right-1 rounded-full p-1 transition-colors"
              onClick={handleRemove}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <line x1="18" x2="6" y1="6" y2="18" />
                <line x1="6" x2="18" y1="6" y2="18" />
              </svg>
            </button>
          </>
        ) : isResolving ? (
          <div className="text-muted-foreground flex h-28 flex-col items-center justify-center gap-2">
            <span className="text-sm">Loading…</span>
          </div>
        ) : isMissing ? (
          <div className="text-destructive flex h-28 flex-col items-center justify-center gap-2">
            <span className="text-2xl">⚠</span>
            <span className="text-sm">Media asset not found</span>
          </div>
        ) : (
          <div className="text-muted-foreground flex h-28 flex-col items-center justify-center gap-2">
            <span className="text-2xl">↑</span>
            <span className="text-sm">Click to select media</span>
          </div>
        )}
      </div>
      <MediaLibrary isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} onSelect={handleSelect} />
    </>
  );
}
