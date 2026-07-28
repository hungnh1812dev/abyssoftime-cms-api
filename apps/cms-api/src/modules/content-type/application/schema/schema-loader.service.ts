import { ContentTypeDefinition } from "../../domain/entities/content-type.entity";
import { readdir, readFile } from "node:fs/promises";
import * as path from "node:path";

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { type EnvironmentVariables } from "@/config/env.validation";

import { validateContentTypeDefinition } from "./schema-validator";

const DEFAULT_LIST_FIELDS_COUNT = 3;

export class ContentTypesDirectoryNotFoundError extends Error {
  constructor(dir: string) {
    super(`Content types directory not found: "${dir}"`);
    this.name = "ContentTypesDirectoryNotFoundError";
  }
}

@Injectable()
export class SchemaLoaderService {
  constructor(private readonly configService: ConfigService<EnvironmentVariables, true>) {}

  async load(): Promise<ContentTypeDefinition[]> {
    const configuredDir = this.configService.get("CONTENT_TYPES_DIR", { infer: true });
    return this.loadFromDir(path.join(process.cwd(), configuredDir));
  }

  async loadFromDir(dir: string): Promise<ContentTypeDefinition[]> {
    let fileNames: string[];
    try {
      fileNames = await readdir(dir);
    } catch {
      throw new ContentTypesDirectoryNotFoundError(dir);
    }

    const jsonFileNames = fileNames.filter((fileName) => fileName.endsWith(".json")).sort();

    const definitions: ContentTypeDefinition[] = [];
    for (const fileName of jsonFileNames) {
      const raw = await readFile(path.join(dir, fileName), "utf8");
      const parsed = JSON.parse(raw) as ContentTypeDefinition;

      const definition: ContentTypeDefinition = {
        ...parsed,
        listFields: parsed.listFields ?? parsed.fields.slice(0, DEFAULT_LIST_FIELDS_COUNT).map((field) => field.name),
      };

      validateContentTypeDefinition(definition);
      definitions.push(definition);
    }

    return definitions;
  }
}
