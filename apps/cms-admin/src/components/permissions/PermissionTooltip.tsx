import * as React from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePermissionGate } from "@/lib/permissions";

interface PermissionTooltipProps {
  required: string;
  contentTypeSlug?: string;
  children: React.ReactElement<{ disabled?: boolean }>;
}

/**
 * Base UI's Tooltip doesn't reliably fire hover/focus events on a truly
 * `disabled` DOM element in most browsers, so the disabled child is nested
 * inside a focusable, non-disabled `<span>` that acts as the actual
 * tooltip trigger.
 */
export function PermissionTooltip({ required, contentTypeSlug, children }: PermissionTooltipProps) {
  const { allowed, reason } = usePermissionGate(required, contentTypeSlug);

  if (allowed) return children;

  return (
    <Tooltip>
      <TooltipTrigger render={<span tabIndex={0} />}>{React.cloneElement(children, { disabled: true })}</TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}
