import { describe, expect, it } from "vitest";
import { greet } from "../src/index";

describe("greet", () => {
  it("returnt een Nederlandse begroeting", () => {
    expect(greet("Antjan")).toBe("Hallo, Antjan!");
  });
});
