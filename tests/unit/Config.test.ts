import { describe, expect, it } from "vitest";
import { loadEnv } from "../../src/config/Env.js";

describe("Config", () => {
  it("UT-070 loadEnv({}) devolve os padrões", () => {
    expect(loadEnv({})).toEqual({ PORT: 3000, HOST: "127.0.0.1", DATABASE_PATH: "./data/catalog.db", LOG_LEVEL: "info" });
  });

  it("UT-071 loadEnv com PORT inválida lança erro de configuração", () => {
    expect(() => loadEnv({ PORT: "abc" })).toThrow(/Configuração inválida/);
  });

  it("UT-077 loadEnv com LOG_LEVEL inválido lança erro de configuração", () => {
    expect(() => loadEnv({ LOG_LEVEL: "debg" })).toThrow(/Configuração inválida: LOG_LEVEL/);
  });

  it("UT-078 loadEnv aceita LOG_LEVEL válido e trata vazio como padrão", () => {
    expect(loadEnv({ LOG_LEVEL: "silent" }).LOG_LEVEL).toBe("silent");
    expect(loadEnv({ LOG_LEVEL: "" }).LOG_LEVEL).toBe("info");
  });
});
