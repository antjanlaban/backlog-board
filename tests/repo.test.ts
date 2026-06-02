import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { ensureSchema } from "../src/server/db/migrate.js";
import { TaskRepo } from "../src/server/db/repo.js";

let repo: TaskRepo;

beforeEach(() => {
  const db = new Database(":memory:");
  ensureSchema(db);
  repo = new TaskRepo(db);
  repo.reseed();
});

describe("TaskRepo", () => {
  it("listAll geeft seed-aantal gesorteerd op status, position", () => {
    const all = repo.listAll();
    expect(all.length).toBe(10);
    const todo = all.filter((t) => t.status === "todo");
    expect(todo.map((t) => t.position)).toEqual([0, 1, 2, 3]);
  });

  it("insert plaatst nieuwe kaart achteraan in todo", () => {
    const created = repo.insert({ title: "Nieuw", description: "", priority: "high" });
    expect(created.status).toBe("todo");
    expect(created.position).toBe(4);
    expect(created.priority).toBe("high");
  });

  it("update wijzigt velden en ververst updatedAt, niet status/position", () => {
    const created = repo.insert({ title: "X", description: "", priority: "med" });
    const updated = repo.update(created.id, { title: "Y", priority: "low" });
    expect(updated?.title).toBe("Y");
    expect(updated?.priority).toBe("low");
    expect(updated?.status).toBe("todo");
    expect(updated?.position).toBe(created.position);
  });

  it("update onbekend id geeft null", () => {
    expect(repo.update("nope", { title: "Z" })).toBeNull();
  });

  it("move persisteert reorder en geeft de hele staat terug", () => {
    const all = repo.listAll();
    const first = all.find((t) => t.status === "todo" && t.position === 0) as (typeof all)[number];
    const result = repo.move(first.id, "doing", 0);
    const doing = (result as typeof all).filter((t) => t.status === "doing");
    expect(doing[0]?.id).toBe(first.id);
    expect(doing.map((t) => t.position)).toEqual([0, 1, 2, 3]);
  });

  it("move onbekend id geeft null", () => {
    expect(repo.move("nope", "doing", 0)).toBeNull();
  });

  it("remove verwijdert en hercompacteert bronkolom", () => {
    const all = repo.listAll();
    const todo = all.filter((t) => t.status === "todo");
    const removed = repo.remove((todo[1] as (typeof todo)[number]).id);
    expect(removed).toBe(true);
    const after = repo.listAll().filter((t) => t.status === "todo");
    expect(after.map((t) => t.position)).toEqual([0, 1, 2]);
  });

  it("remove onbekend id geeft false", () => {
    expect(repo.remove("nope")).toBe(false);
  });
});
