import { z } from "zod";

export interface Env {
  PORT: number;
  HOST: string;
  DATABASE_PATH: string;
  LOG_LEVEL: LogLevel;
}

const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

const envSchema = z.object({
  PORT: z.coerce.number().int().min(0).max(65535).default(3000),
  HOST: z.string().trim().min(1).default("127.0.0.1"),
  DATABASE_PATH: z.string().trim().min(1).default("./data/catalog.db"),
  LOG_LEVEL: z.enum(LOG_LEVELS).default("info"),
});

export class ConfigError extends Error {}

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse({
    PORT: source.PORT === "" ? undefined : source.PORT,
    HOST: source.HOST === "" ? undefined : source.HOST,
    DATABASE_PATH: source.DATABASE_PATH === "" ? undefined : source.DATABASE_PATH,
    LOG_LEVEL: source.LOG_LEVEL === "" ? undefined : source.LOG_LEVEL,
  });
  if (!result.success) {
    const fields = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new ConfigError(`Configuração inválida: ${fields}`);
  }
  return result.data;
}
