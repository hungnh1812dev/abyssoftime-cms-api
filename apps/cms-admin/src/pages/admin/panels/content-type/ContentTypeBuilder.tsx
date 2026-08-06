import type { UseQueryOptions } from "@tanstack/react-query";

import { FormProvider, useCmsFormState } from "@/components/form";
import { PermissionTooltip } from "@/components/permissions/PermissionTooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { FieldDefinition } from "@/types/cms";

import { renderSchemaField } from "./renderSchemaField";

interface ContentTypeBuilderProps {
  contentTypeSlug: string;
  schema: FieldDefinition[];
  query?: UseQueryOptions;
  mutationFn: (data: Record<string, unknown>) => Promise<unknown>;
  renderActions?: (formState: { isDirty: boolean; submitting: boolean }) => React.ReactNode;
  onDirtyChange?: (isDirty: boolean) => void;
  requiredPermission: string;
}

function FormActions({
  renderActions,
  requiredPermission,
  contentTypeSlug,
}: {
  renderActions?: ContentTypeBuilderProps["renderActions"];
  requiredPermission: string;
  contentTypeSlug: string;
}) {
  const { isDirty, submitting } = useCmsFormState();

  return (
    <div className="flex items-center gap-2">
      <PermissionTooltip required={requiredPermission} contentTypeSlug={contentTypeSlug}>
        <Button type="submit" variant={isDirty ? "default" : "secondary"} disabled={!isDirty || submitting} loading={submitting} loadingText="Saving...">
          Save
        </Button>
      </PermissionTooltip>
      {renderActions?.({ isDirty, submitting })}
    </div>
  );
}

export function ContentTypeBuilder({ contentTypeSlug, schema, query, mutationFn, renderActions, onDirtyChange, requiredPermission }: ContentTypeBuilderProps) {
  const keyPrefix = `${contentTypeSlug}_`;
  return (
    <FormProvider query={query} mutationFn={mutationFn} onDirtyChange={onDirtyChange}>
      <div className="space-y-6">
        <FormActions renderActions={renderActions} requiredPermission={requiredPermission} contentTypeSlug={contentTypeSlug} />
        <Card>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">{schema.map((field, index) => renderSchemaField(field, "", keyPrefix, index))}</div>
          </CardContent>
        </Card>
      </div>
    </FormProvider>
  );
}
