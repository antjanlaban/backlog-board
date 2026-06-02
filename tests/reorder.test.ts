import { describe, expect, it } from "vitest";
import { reorder } from "../src/server/reorder.js";
import type { Status, Task } from "../src/shared/types.js";

function make(id: string, status: Status, position: number): Task {
  return {
    id,
    title: id,
    description: "",
    status,
    priority: "med",
    position,
    createdAt: "2026-06-02T09:00:00.000Z",
    updatedAt: "2026-06-02T09:00:00.000Z",
  };
}

function byCol(tasks: Task[], status: Status): Task[] {
  return tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position);
}

function assertDense(tasks: Task[]): void {
  for (const status of ["todo", "doing", "done"] as const) {
    const positions = byCol(tasks, status).map((t) => t.position);
    expect(positions).toEqual(positions.map((_, i) => i));
  }
}

const base: Task[] = [
  make("t0", "todo", 0),
  make("t1", "todo", 1),
  make("t2", "todo", 2),
  make("t3", "todo", 3),
  make("d0", "doing", 0),
];

describe("reorder", () => {
  it("herordent omhoog binnen dezelfde kolom (3 -> 1)", () => {
    const out = reorder(base, "t3", "todo", 1);
    expect(byCol(out, "todo").map((t) => t.id)).toEqual(["t0", "t3", "t1", "t2"]);
    assertDense(out);
  });

  it("herordent omlaag binnen dezelfde kolom (1 -> 3)", () => {
    const out = reorder(base, "t1", "todo", 3);
    expect(byCol(out, "todo").map((t) => t.id)).toEqual(["t0", "t2", "t3", "t1"]);
    assertDense(out);
  });

  it("verplaatst naar een lege kolom op index 0", () => {
    const out = reorder(base, "t0", "done", 0);
    expect(byCol(out, "done").map((t) => t.id)).toEqual(["t0"]);
    expect(byCol(out, "todo").map((t) => t.id)).toEqual(["t1", "t2", "t3"]);
    assertDense(out);
  });

  it("verplaatst naar de eerste positie van een niet-lege kolom", () => {
    const out = reorder(base, "t0", "doing", 0);
    expect(byCol(out, "doing").map((t) => t.id)).toEqual(["t0", "d0"]);
    assertDense(out);
  });

  it("clampt een te grote toIndex naar achteraan", () => {
    const out = reorder(base, "t0", "doing", 99);
    expect(byCol(out, "doing").map((t) => t.id)).toEqual(["d0", "t0"]);
    assertDense(out);
  });

  it("clampt een negatieve toIndex naar 0 zonder exception", () => {
    const out = reorder(base, "t3", "todo", -5);
    expect(byCol(out, "todo").map((t) => t.id)).toEqual(["t3", "t0", "t1", "t2"]);
    assertDense(out);
  });

  it("is een no-op bij zelfde status en zelfde effectieve index", () => {
    const out = reorder(base, "t1", "todo", 1);
    expect(byCol(out, "todo").map((t) => t.id)).toEqual(["t0", "t1", "t2", "t3"]);
    assertDense(out);
  });

  it("muteert de input niet (puur)", () => {
    const snapshot = JSON.parse(JSON.stringify(base));
    reorder(base, "t3", "todo", 0);
    expect(base).toEqual(snapshot);
  });

  it("zet de status van de verplaatste task op toStatus", () => {
    const out = reorder(base, "t0", "done", 0);
    expect(out.find((t) => t.id === "t0")?.status).toBe("done");
  });

  it("gooit bij onbekende taskId", () => {
    expect(() => reorder(base, "nope", "todo", 0)).toThrow();
  });
});
