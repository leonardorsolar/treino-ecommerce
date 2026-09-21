import { describe, expect, it } from "vitest";
import { formatPrice, parsePrice } from "../../src/modules/products/Money.js";

describe("Money", () => {
  it("UT-031 parsePrice('19.90') = 1990", () => expect(parsePrice("19.90")).toBe(1990));
  it("UT-032 parsePrice('19.9') = 1990", () => expect(parsePrice("19.9")).toBe(1990));
  it("UT-033 parsePrice('19') = 1900", () => expect(parsePrice("19")).toBe(1900));
  it("UT-034 parsePrice('0.01') = 1", () => expect(parsePrice("0.01")).toBe(1));
  it("UT-035 parsePrice('999999999.99') = 99999999999", () => expect(parsePrice("999999999.99")).toBe(99999999999));
  it("UT-036 parsePrice('1000000000.00') = null", () => expect(parsePrice("1000000000.00")).toBeNull());
  it("UT-037 formatPrice(1990) = '19.90'", () => expect(formatPrice(1990)).toBe("19.90"));
  it("UT-038 formatPrice(5) = '0.05'", () => expect(formatPrice(5)).toBe("0.05"));
});
