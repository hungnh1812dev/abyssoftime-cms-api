import { execSync } from "node:child_process";

import pluralize from "pluralize";

/** @param {import('plop').NodePlopAPI} plop */
export default function (plop) {
  plop.setHelper("pluralKebab", (name) => pluralize(plop.getHelper("kebabCase")(name)));
  plop.setHelper("pluralCamel", (name) => pluralize(plop.getHelper("camelCase")(name)));
  plop.setHelper("pluralPascal", (name) => plop.getHelper("pascalCase")(pluralize(plop.getHelper("kebabCase")(name))));

  plop.setGenerator("module", {
    description: "Scaffold a DDD-style module under src/modules",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "Module name, singular (e.g. permission, role, category):",
        validate: (input) => (/^[a-zA-Z][a-zA-Z0-9-]*$/.test(input) ? true : "Use a singular noun, letters/numbers/hyphens only"),
      },
    ],
    actions: [
      {
        type: "add",
        path: "src/modules/{{pluralKebab name}}/{{kebabCase name}}.module.ts",
        templateFile: "plop-templates/module/module.ts.hbs",
      },
      {
        type: "add",
        path: "src/modules/{{pluralKebab name}}/domain/entities/{{kebabCase name}}.entity.ts",
        templateFile: "plop-templates/module/entity.ts.hbs",
      },
      {
        type: "add",
        path: "src/modules/{{pluralKebab name}}/domain/repositories/{{kebabCase name}}.repository.ts",
        templateFile: "plop-templates/module/repository.ts.hbs",
      },
      {
        type: "add",
        path: "src/modules/{{pluralKebab name}}/application/dto/create-{{kebabCase name}}.dto.ts",
        templateFile: "plop-templates/module/create.dto.ts.hbs",
      },
      {
        type: "add",
        path: "src/modules/{{pluralKebab name}}/application/dto/update-{{kebabCase name}}.dto.ts",
        templateFile: "plop-templates/module/update.dto.ts.hbs",
      },
      {
        type: "add",
        path: "src/modules/{{pluralKebab name}}/application/services/create-{{kebabCase name}}.service.ts",
        templateFile: "plop-templates/module/create.service.ts.hbs",
      },
      {
        type: "add",
        path: "src/modules/{{pluralKebab name}}/application/services/update-{{kebabCase name}}.service.ts",
        templateFile: "plop-templates/module/update.service.ts.hbs",
      },
      {
        type: "add",
        path: "src/modules/{{pluralKebab name}}/application/services/delete-{{kebabCase name}}.service.ts",
        templateFile: "plop-templates/module/delete.service.ts.hbs",
      },
      {
        type: "add",
        path: "src/modules/{{pluralKebab name}}/application/services/list-{{kebabCase name}}.service.ts",
        templateFile: "plop-templates/module/list.service.ts.hbs",
      },
      {
        type: "add",
        path: "src/modules/{{pluralKebab name}}/infrastructure/persistence/prisma-{{kebabCase name}}.repository.ts",
        templateFile: "plop-templates/module/prisma.repository.ts.hbs",
      },
      {
        type: "add",
        path: "src/modules/{{pluralKebab name}}/presentation/{{kebabCase name}}.controller.ts",
        templateFile: "plop-templates/module/controller.ts.hbs",
      },
      (answers) => {
        const dir = `src/modules/${pluralize(plop.getHelper("kebabCase")(answers.name))}`;
        execSync(`bunx prettier --write "${dir}/**/*.ts"`, { stdio: "inherit" });
        return `formatted ${dir}`;
      },
    ],
  });
}
