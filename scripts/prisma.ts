import { SUPPORTED_DB_DRIVERS } from "../src/config/env.validation";

const driver = process.env.DB_DRIVER ?? "postgresql";

if (!(SUPPORTED_DB_DRIVERS as readonly string[]).includes(driver)) {
  throw new Error(`Unsupported DB_DRIVER: "${driver}". Supported drivers: ${SUPPORTED_DB_DRIVERS.join(", ")}`);
}

const schemaPath = `prisma/${driver}/schema.prisma`;
const args = process.argv.slice(2);

void (async () => {
  await Bun.$`prisma ${args} --schema=${schemaPath}`;
})();
