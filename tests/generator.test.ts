import { describe, expect, it } from "vitest";

import { generateAlias } from "@/lib/generator";

describe("generateAlias", () => {
  it("uses exclusive bounds to generate a deterministic readable alias", () => {
    const calls: Array<[number, number]> = [];
    const values = [0, 0, 123];
    const deterministicRandomInt = ((min: number, max: number) => {
      calls.push([min, max]);
      return values[calls.length - 1];
    }) as typeof import("node:crypto").randomInt;

    expect(generateAlias(deterministicRandomInt)).toBe("calm-river-123");
    expect(calls).toEqual([
      [0, 6],
      [0, 6],
      [100, 1000],
    ]);
  });

  it("generates aliases in the expected format", () => {
    for (let index = 0; index < 100; index += 1) {
      expect(generateAlias()).toMatch(/^[a-z]+-[a-z]+-\d{3}$/);
    }
  });
});
