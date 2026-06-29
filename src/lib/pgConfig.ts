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
  const rawUrl = process.env.DATABASE_URL;
  const useSsl = shouldUseSsl(rawUrl);

  // node-postgres (pg) now treats `sslmode=require` in the connection string as
  // full certificate verification, which fails against the RDS CA unless the
  // bundle is installed. Strip the sslmode param and drive SSL explicitly via
  // the `ssl` option so our relaxed (encrypt-but-don't-verify) setting wins.
  let connectionString = rawUrl;
  if (useSsl && connectionString) {
    connectionString = connectionString
      .replace(/([?&])sslmode=[^&]*(&|$)/i, (_m, p1, p2) => (p2 === "&" ? p1 : ""))
      .replace(/[?&]$/, "");
  }

  const config: PoolConfig = { connectionString };

  if (useSsl) {
    config.ssl =
      process.env.PGSSL_REJECT_UNAUTHORIZED === "true"
        ? { rejectUnauthorized: true }
        : { rejectUnauthorized: false };
  }

  return config;
}
