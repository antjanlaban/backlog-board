import { describe, expect, it } from "vitest";
import {
  ValidationError,
  parseCreateBody,
  parseMoveBody,
  parseUpdateBody,
} from "../src/server/validation.js";

describe("parseCreateBody", () => {
  it("accepteert geldige titel en default priority med", () => {
    expect(parseCreateBody({ title: "  Hoi  " })).toEqual({
      title: "Hoi",
      description: "",
      priority: "med",
    });
  });
  it("weigert lege titel", () => {
    expect(() => parseCreateBody({ title: "   " })).toThrow(ValidationError);
  });
  it("weigert ongeldige priority", () => {
    expect(() => parseCreateBody({ title: "x", priority: "urgent" })).toThrow(ValidationError);
  });
});

describe("parseUpdateBody", () => {
  it("staat lege body toe", () => {
    expect(parseUpdateBody({})).toEqual({});
  });
  it("weigert lege titel indien aanwezig", () => {
    expect(() => parseUpdateBody({ title: "  " })).toThrow(ValidationError);
  });
  it("trimt titel en behoudt description", () => {
    expect(parseUpdateBody({ title: " a ", description: "b" })).toEqual({
      title: "a",
      description: "b",
    });
  });
});

describe("parseMoveBody", () => {
  it("accepteert geldige status + position", () => {
    expect(parseMoveBody({ status: "doing", position: 2 })).toEqual({
      status: "doing",
      position: 2,
    });
  });
  it("weigert ontbrekende velden", () => {
    expect(() => parseMoveBody({ status: "doing" })).toThrow(ValidationError);
  });
  it("weigert ongeldige status", () => {
    expect(() => parseMoveBody({ status: "x", position: 0 })).toThrow(ValidationError);
  });
  it("weigert negatieve of niet-integer position", () => {
    expect(() => parseMoveBody({ status: "doing", position: -1 })).toThrow(ValidationError);
    expect(() => parseMoveBody({ status: "doing", position: 1.5 })).toThrow(ValidationError);
  });
});
