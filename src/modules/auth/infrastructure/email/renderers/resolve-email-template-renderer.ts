import { ConfigService } from "@nestjs/config";

import { type EnvironmentVariables } from "@/config/env.validation";

import { IEmailTemplateRenderer } from "./email-template-renderer";
import { HandlebarsEmailTemplateRenderer } from "./handlebars-email-template.renderer";
import { TsEmailTemplateRenderer } from "./ts-email-template.renderer";

export function resolveEmailTemplateRenderer(configService: ConfigService<EnvironmentVariables, true>): IEmailTemplateRenderer {
  const engine = configService.get("EMAIL_TEMPLATE_ENGINE", { infer: true });

  return engine === "handlebars" ? new HandlebarsEmailTemplateRenderer() : new TsEmailTemplateRenderer();
}
