import { pino } from "pino";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/App.js";
import { runMigrations } from "../../src/db/Migrate.js";
import { SqliteProductRepository } from "../../src/modules/products/ProductRepository.js";
import { openDatabase } from "../../src/shared/Db.js";
import { base } from "./helpers.js";

async function captureLog(send: (api: ReturnType<typeof request>) => Promise<unknown>): Promise<string[]> {
  const lines: string[] = [];
  const logger = pino({ level: "info" }, { write: (line: string) => void lines.push(line) });
  const db = openDatabase(":memory:");
  runMigrations(db);
  await send(request(createApp({ repository: new SqliteProductRepository(db), logger })));
  db.close();
  return lines;
}

describe("log de requisição", () => {
  it("IT-077 não registra Authorization, Cookie nem query string", async () => {
    const lines = await captureLog((api) =>
      api.get(`${base}?token=secret123`).set("Authorization", "Bearer abc").set("Cookie", "sid=zzz"),
    );
    const raw = lines.join("");
    expect(raw).not.toMatch(/Bearer abc|sid=zzz|secret123|authorization|cookie/i);
    expect(lines).toHaveLength(1);
  });

  it("IT-078 registra method, path, status, durationMs e reqId", async () => {
    const [line] = await captureLog((api) => api.get(`${base}?page=2`));
    const entry = JSON.parse(line);
    expect(entry.req).toEqual({ method: "GET", path: base });
    expect(entry.res).toEqual({ statusCode: 200 });
    expect(typeof entry.durationMs).toBe("number");
    expect(entry.reqId).toBeDefined();
  });
});
