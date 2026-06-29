/**
 * Shared PostgreSQL connection configuration for the node-postgres driver
 * (used by Prisma's `@prisma/adapter-pg` adapter in both the app runtime and
 * the seed script).
 *
 * AWS Aurora PostgreSQL **requires** TLS for all connections. node-postgres
 * does not automatically enable SSL from a `sslmode=` query parameter the way
 * libpq/the Prisma CLI does, so we detect Aurora/RDS (or an explicit
 * `sslmode=require|verify-*`) here and turn on SSL for the driver.
 *
 * For a hackathon/demo we use `rejectUnauthorized: false`, which encrypts the
 * connection without verifying the RDS CA chain. To enforce full verification,
 * download the RDS combined CA bundle and set PGSSLROOTCERT / pass `ca` instead.
 */
import type { PoolConfig } from "pg";

function shouldUseSsl(url: string | undefined): boolean {
  if (!url) return false;
  // Local connections never need SSL.
  if (/@(localhost|127\.0\.0\.1)[:/]/.test(url)) return false;
  // Aurora / RDS endpoints, or an explicit sslmode request.
  return (
    /\.rds\.amazonaws\.com/i.test(url) ||
    /[?&]sslmode=(require|verify-ca|verify-full|prefer)/i.test(url)
  );
}

export function getPgPoolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL;
  const config: PoolConfig = { connectionString };

  if (shouldUseSsl(connectionString)) {
    config.ssl =
      process.env.PGSSL_REJECT_UNAUTHORIZED === "true"
        ? { rejectUnauthorized: true }
        : { rejectUnauthorized: false };
  }

  return config;
}
