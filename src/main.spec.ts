describe("bootstrap (main.ts)", () => {
  const originalPort = process.env.PORT;

  let listen: jest.Mock;
  let create: jest.Mock;
  let configureApp: jest.Mock;
  let AppModuleStub: { new (): object };

  beforeEach(() => {
    jest.resetModules();

    listen = jest.fn().mockResolvedValue(undefined);
    create = jest.fn().mockResolvedValue({ listen });
    configureApp = jest.fn();
    AppModuleStub = class AppModuleStub {};

    jest.doMock("@nestjs/core", () => ({ NestFactory: { create } }));
    jest.doMock("./app.module", () => ({ AppModule: AppModuleStub }));
    jest.doMock("./bootstrap/configure-app", () => ({ configureApp }));
  });

  afterEach(() => {
    if (originalPort === undefined) delete process.env.PORT;
    else process.env.PORT = originalPort;

    jest.dontMock("@nestjs/core");
    jest.dontMock("./app.module");
    jest.dontMock("./bootstrap/configure-app");
  });

  async function runMain(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- re-require the entry point fresh per test after jest.resetModules()
    require("./main");
    await new Promise((resolve) => setImmediate(resolve));
  }

  it("creates the Nest app from AppModule and runs it through configureApp", async () => {
    await runMain();

    expect(create).toHaveBeenCalledWith(AppModuleStub);
    expect(configureApp).toHaveBeenCalledWith({ listen });
  });

  it("listens on process.env.PORT when it is set", async () => {
    process.env.PORT = "4321";

    await runMain();

    expect(listen).toHaveBeenCalledWith("4321");
  });

  it("falls back to port 3000 when PORT is not set", async () => {
    delete process.env.PORT;

    await runMain();

    expect(listen).toHaveBeenCalledWith(3000);
  });
});
