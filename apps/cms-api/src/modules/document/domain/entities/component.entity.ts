import { DocumentVersion } from "./document.entity";

export class ComponentEntity {
  constructor(
    public readonly componentId: string,
    public readonly documentId: string,
    public readonly version: DocumentVersion,
    public readonly parentComponentId: string | null,
    public readonly fields: Record<string, unknown>,
    public readonly children: Record<string, ComponentEntity[]>,
  ) {}
}
