import { PERMISSIONS_KEY, RequirePermissions } from "./require-permissions.decorator";

describe("RequirePermissions", () => {
  it("attaches the given permission slugs as reflectable metadata", () => {
    class Target {
      @RequirePermissions("role:manager", "role:read")
      handler(): void {}
    }

    const metadata = Reflect.getMetadata(PERMISSIONS_KEY, Target.prototype.handler) as string[];

    expect(metadata).toEqual(["role:manager", "role:read"]);
  });
});
