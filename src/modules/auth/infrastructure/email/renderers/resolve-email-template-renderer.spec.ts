import { ConfigService } from "@nestjs/config";

import { type EnvironmentVariables } from "@/config/env.validation";

import { HandlebarsEmailTemplateRenderer } from "./handlebars-email-template.renderer";
import { resolveEmailTemplateRenderer } from "./resolve-email-template-renderer";
import { TsEmailTemplateRenderer } from "./ts-email-template.renderer";

describe("resolveEmailTemplateRenderer", () => {
  function makeConfig(engine: string): ConfigService<EnvironmentVariables, true> {
    return {
      get: jest.fn(() => engine),
    } as unknown as ConfigService<EnvironmentVariables, true>;
  }

  it("returns a TsEmailTemplateRenderer by default", () => {
    const renderer = resolveEmailTemplateRenderer(makeConfig("ts"));

    expect(renderer).toBeInstanceOf(TsEmailTemplateRenderer);
  });

  it("returns a HandlebarsEmailTemplateRenderer when EMAIL_TEMPLATE_ENGINE is 'handlebars'", () => {
    const renderer = resolveEmailTemplateRenderer(makeConfig("handlebars"));

    expect(renderer).toBeInstanceOf(HandlebarsEmailTemplateRenderer);
  });
});
