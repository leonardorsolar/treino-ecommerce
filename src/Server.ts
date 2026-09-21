import { pino } from "pino";
import { createApp } from "./App.js";
import { loadEnv } from "./config/Env.js";
import { runMigrations } from "./db/Migrate.js";
import { SqliteProductRepository } from "./modules/products/ProductRepository.js";
import { openDatabase } from "./shared/Db.js";

let logger = pino({ level: "info" });

function fatal(err: unknown, msg: string): never {
  logger.fatal({ err }, msg);
  process.exit(1);
}

let boot: { env: ReturnType<typeof loadEnv>; db: ReturnType<typeof openDatabase>; applied: string[] };
try {
  const env = loadEnv();
  logger = pino({ level: env.LOG_LEVEL });
  const db = openDatabase(env.DATABASE_PATH);
  boot = { env, db, applied: runMigrations(db) };
} catch (err) {
  fatal(err, "boot failed");
}
const { env, db, applied } = boot;
const app = createApp({ repository: new SqliteProductRepository(db), logger });

const server = app.listen(env.PORT, env.HOST, () => {
  logger.info(
    { migrationsApplied: applied, databasePath: env.DATABASE_PATH, host: env.HOST, port: env.PORT },
    "server listening",
  );
});
server.on("error", (err) => fatal(err, "server error"));

const SHUTDOWN_TIMEOUT_MS = 5000;

function shutdown(): void {
  const timer = setTimeout(() => server.closeAllConnections(), SHUTDOWN_TIMEOUT_MS);
  timer.unref();
  server.close(() => {
    db.close();
    process.exit(0);
  });
  server.closeIdleConnections();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
