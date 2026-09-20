import { z } from "zod";

export interface Env {
  PORT: number;
  HOST: string;
  DATABASE_PATH: string;
}

const envSchema = z.object({
  PORT: z.coerce.number().int().min(0).max(65535).default(3000),
  HOST: z.string().trim().min(1).default("127.0.0.1"),
  DATABASE_PATH: z.string().trim().min(1).default("./data/catalog.db"),
});

export class ConfigError extends Error {}

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse({
    PORT: source.PORT === "" ? undefined : source.PORT,
    HOST: source.HOST === "" ? undefined : source.HOST,
    DATABASE_PATH: source.DATABASE_PATH === "" ? undefined : source.DATABASE_PATH,
  });
  if (!result.success) {
    const fields = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new ConfigError(`Configuração inválida: ${fields}`);
  }
  return result.data;
}
