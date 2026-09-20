import { describe, expect, it } from "vitest";
import { loadEnv } from "../../src/config/Env.js";

describe("Config", () => {
  it("UT-070 loadEnv({}) devolve os padrões", () => {
    expect(loadEnv({})).toEqual({ PORT: 3000, HOST: "127.0.0.1", DATABASE_PATH: "./data/catalog.db" });
  });

  it("UT-071 loadEnv com PORT inválida lança erro de configuração", () => {
    expect(() => loadEnv({ PORT: "abc" })).toThrow(/Configuração inválida/);
  });
});
