/**
 * @file neonPool.js
 * @description Dedicated PostgreSQL connection pool and query utility for Neon Database.
 * Powers the Chat Messaging and Social Feed communication storage for OmniSuite ERP.
 */

import fs from "fs";
import path from "path";
import "../utils/loadServerEnv.js";

// Lazy-load PostgreSQL package so absence of 'pg' in production does not crash bootstrap
let pgLib = null;
let pgLoadPromise = null;

async function ensurePg() {
  if (pgLib) return pgLib;
  if (!pgLoadPromise) {
    pgLoadPromise = import("pg")
      .then((m) => {
        pgLib = m.default || m;
        return pgLib;
      })
      .catch((err) => {
        console.error(
          "[NeonPool] WARNING: 'pg' package is not installed. Run 'npm install' in server directory.",
          err.message
        );
        throw new Error(
          "PostgreSQL package 'pg' is not installed. Please run 'npm install' in the server directory."
        );
      });
  }
  return pgLoadPromise;
}

// Helper to safely load environment variables from multiple fallback files
function resolveEnvVar(key) {
  if (process.env[key] && !process.env[key].includes("••••") && !process.env[key].includes("********")) {
    return process.env[key].trim();
  }
  const envFiles = [
    path.resolve(process.cwd(), "server", ".env.local"),
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), "server", ".env"),
    path.resolve(process.cwd(), ".env"),
  ];
  for (const ef of envFiles) {
    if (fs.existsSync(ef)) {
      try {
        const content = fs.readFileSync(ef, "utf8");
        const match = content.match(new RegExp(`^${key}=(.*)$`, "m"));
        if (match) {
          let val = match[1].trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (val && !val.includes("••••") && !val.includes("********")) {
            return val;
          }
        }
      } catch {}
    }
  }
  return "";
}

// Extract connection strings
const DATABASE_URL = resolveEnvVar("DATABASE_URL");
const DATABASE_URL_UNPOOLED = resolveEnvVar("DATABASE_URL_UNPOOLED") || DATABASE_URL;

// Parse pool limits from environment
const maxConnections = Number(process.env.NEON_POOL_MAX) || 20;
const idleTimeoutMillis = Number(process.env.NEON_IDLE_TIMEOUT_MS) || 30000;
const connectionTimeoutMillis = Number(process.env.NEON_CONNECT_TIMEOUT_MS) || 10000;

// Primary connection pool (pooled, PgBouncer / Neon connection pooler)
let pooledInstance = null;
// Direct connection pool (unpooled, for migrations, DDL, advisory locks)
let unpooledInstance = null;

/**
 * Initializes and returns the primary Neon connection pool.
 * @returns {Promise<import('pg').Pool>}
 */
export async function getNeonPool() {
  if (!pooledInstance) {
    const { Pool } = await ensurePg();
    const connStr = DATABASE_URL || resolveEnvVar("DATABASE_URL");
    if (!connStr) {
      throw new Error("[NeonPool] DATABASE_URL is not configured for Neon PostgreSQL.");
    }
    pooledInstance = new Pool({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
      max: maxConnections,
      idleTimeoutMillis,
      connectionTimeoutMillis,
      statement_timeout: 30000,
    });

    pooledInstance.on("error", (err) => {
      console.error("[NeonPool] Unexpected error on idle client:", err.message);
    });
  }
  return pooledInstance;
}

/**
 * Initializes and returns the direct unpooled Neon connection pool (for DDL/migrations).
 * @returns {Promise<import('pg').Pool>}
 */
export async function getNeonDirectPool() {
  if (!unpooledInstance) {
    const { Pool } = await ensurePg();
    const connStr = DATABASE_URL_UNPOOLED || resolveEnvVar("DATABASE_URL_UNPOOLED") || DATABASE_URL;
    if (!connStr) {
      throw new Error("[NeonPool] DATABASE_URL_UNPOOLED is not configured.");
    }
    unpooledInstance = new Pool({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis,
      connectionTimeoutMillis,
      statement_timeout: 120000,
    });

    unpooledInstance.on("error", (err) => {
      console.error("[NeonPool:Direct] Unexpected error on idle direct client:", err.message);
    });
  }
  return unpooledInstance;
}

/**
 * Helper to convert MySQL style `:paramName` or positional parameters to PostgreSQL `$1, $2, ...`
 * Also handles MySQL `NOW()`, `ON DUPLICATE KEY UPDATE` where appropriate.
 *
 * @param {string} sql - SQL query string
 * @param {Array|Object} [params] - Parameters (array for positional $1/$2 or object for :named)
 * @returns {{ text: string, values: Array }}
 */
export function formatNeonQuery(sql, params) {
  if (!params) {
    return { text: sql, values: [] };
  }

  // If params is an Array, verify if SQL already uses $1, $2, etc., or ? placeholders
  if (Array.isArray(params)) {
    if (sql.includes("?")) {
      let index = 1;
      const text = sql.replace(/\?/g, () => `$${index++}`);
      return { text, values: params };
    }
    return { text: sql, values: params };
  }

  // If params is an Object with named keys: convert :paramName to $1, $2...
  // Matches and preserves PostgreSQL ::type casts first, so only actual parameters :paramName are converted
  if (typeof params === "object") {
    const values = [];
    const paramMap = new Map();

    const text = sql.replace(/(::[a-zA-Z0-9_]+)|(?<!:):([a-zA-Z0-9_]+)/g, (fullMatch, castMatch, paramName) => {
      if (castMatch) {
        return castMatch; // Keep PostgreSQL cast untouched
      }
      if (!paramMap.has(paramName)) {
        values.push(params[paramName] !== undefined ? params[paramName] : null);
        paramMap.set(paramName, values.length);
      }
      return `$${paramMap.get(paramName)}`;
    });

    return { text, values };
  }

  return { text: sql, values: [params] };
}

/**
 * Executes a query on the pooled Neon PostgreSQL database.
 * Returns rows array matching standard MySQL pool interface conventions for seamless integration.
 *
 * @param {string} sql - SQL statement
 * @param {Array|Object} [params] - Query parameters
 * @returns {Promise<Array>} Result rows
 */
export async function neonQuery(sql, params) {
  const pool = await getNeonPool();
  const { text, values } = formatNeonQuery(sql, params);

  const start = Date.now();
  try {
    const result = await pool.query(text, values);
    return result.rows || [];
  } catch (err) {
    const duration = Date.now() - start;
    console.error(`[NeonQuery Error] (${duration}ms) ${err.message}\nSQL: ${text.slice(0, 300)}`);
    throw err;
  }
}

/**
 * Executes a query using direct/unpooled connection (for migrations and DDL).
 *
 * @param {string} sql
 * @param {Array|Object} [params]
 * @returns {Promise<any>} Full pg Result object
 */
export async function neonDirectQuery(sql, params) {
  const pool = await getNeonDirectPool();
  const { text, values } = formatNeonQuery(sql, params);
  return pool.query(text, values);
}

/**
 * Executes a callback within a managed Neon transaction.
 *
 * @template T
 * @param {(client: import('pg').PoolClient) => Promise<T>} callback
 * @returns {Promise<T>}
 */
export async function withNeonTransaction(callback) {
  const pool = await getNeonPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Tests connection health to Neon PostgreSQL.
 * @returns {Promise<{ ok: boolean, database?: string, version?: string, latencyMs?: number, error?: string }>}
 */
export async function testNeonHealth() {
  const start = Date.now();
  try {
    const pool = await getNeonPool();
    const res = await pool.query("SELECT current_database() as db, current_user as usr, version()");
    const latencyMs = Date.now() - start;
    return {
      ok: true,
      database: res.rows[0]?.db,
      user: res.rows[0]?.usr,
      version: res.rows[0]?.version?.split(" ")?.[0] + " " + res.rows[0]?.version?.split(" ")?.[1],
      latencyMs,
    };
  } catch (err) {
    return {
      ok: false,
      error: err.message,
      latencyMs: Date.now() - start,
    };
  }
}

/**
 * Gracefully shuts down Neon connection pools.
 */
export async function closeNeonPools() {
  const closers = [];
  if (pooledInstance) {
    closers.push(pooledInstance.end().catch(() => null));
    pooledInstance = null;
  }
  if (unpooledInstance) {
    closers.push(unpooledInstance.end().catch(() => null));
    unpooledInstance = null;
  }
  await Promise.all(closers);
  console.log("[NeonPool] Connection pools closed.");
}
