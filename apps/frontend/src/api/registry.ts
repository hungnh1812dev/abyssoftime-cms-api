export type ServiceDriver = "graphql" | "rest";

export interface ServiceRegistration<T = unknown> {
  key: string;
  driver: ServiceDriver;
  execute: (params?: unknown) => Promise<T>;
}

const _registry = new Map<string, ServiceRegistration>();

const _key = (driver: ServiceDriver, apiKey: string) => `${driver}:${apiKey}`;

export function registerService<T>(reg: ServiceRegistration<T>): void {
  _registry.set(_key(reg.driver, reg.key), reg as ServiceRegistration);
}

export function lookupService(apiKey: string, driver: ServiceDriver): ServiceRegistration {
  const entry = _registry.get(_key(driver, apiKey));
  if (!entry) throw new Error(`[registry] No service for key="${apiKey}" driver="${driver}"`);
  return entry;
}

export function clearRegistry(): void {
  if (process.env.NODE_ENV === "production") return;
  _registry.clear();
}
