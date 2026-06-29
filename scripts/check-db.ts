import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { getPgPoolConfig } from "../src/lib/pgConfig";

/**
 * Verifies the configured DATABASE_URL is reachable and reports what kind of
 * database it is (local vs AWS Aurora/RDS) plus current row counts. Run with:
 *   npm run db:check
 */
async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) {
    console.error("✗ DATABASE_URL is not set. Add it to .env");
    process.exit(1);
  }

  const host = (() => {
    try {
      return new URL(url.replace(/^postgres(ql)?:\/\//, "http://")).hostname;
    } catch {
      return "unknown";
    }
  })();
  const isAurora = /\.rds\.amazonaws\.com$/i.test(host);
  const ssl = "ssl" in getPgPoolConfig();

  console.log(`Target host : ${host}`);
  console.log(`Database    : ${isAurora ? "AWS Aurora / RDS PostgreSQL" : "PostgreSQL"}`);
  console.log(`TLS/SSL     : ${ssl ? "enabled" : "disabled"}`);

  const prisma = new PrismaClient({ adapter: new PrismaPg(getPgPoolConfig()) });
  try {
    const [{ version }] = await prisma.$queryRaw<{ version: string }[]>`SELECT version()`;
    console.log(`Server      : ${version.split(",")[0]}`);

    const [features, reports] = await Promise.all([
      prisma.accessibilityFeature.count().catch(() => null),
      prisma.report.count().catch(() => null),
    ]);
    if (features === null || reports === null) {
      console.log("Tables      : not migrated yet — run `npm run db:migrate:deploy`");
    } else {
      console.log(`Rows        : ${features} features, ${reports} reports`);
    }
    console.log("\n✓ Connection successful.");
  } catch (err) {
    console.error("\n✗ Connection failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
