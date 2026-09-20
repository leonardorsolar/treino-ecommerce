import { pino } from "pino";
import { createApp } from "./App.js";
import { loadEnv } from "./config/Env.js";
import { runMigrations } from "./db/Migrate.js";
import { SqliteProductRepository } from "./modules/products/ProductRepository.js";
import { openDatabase } from "./shared/Db.js";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const env = loadEnv();
const db = openDatabase(env.DATABASE_PATH);
const applied = runMigrations(db);
const app = createApp({ repository: new SqliteProductRepository(db), logger });

const server = app.listen(env.PORT, env.HOST, () => {
  logger.info(
    { migrationsApplied: applied, databasePath: env.DATABASE_PATH, host: env.HOST, port: env.PORT },
    "server listening",
  );
});

function shutdown(): void {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
