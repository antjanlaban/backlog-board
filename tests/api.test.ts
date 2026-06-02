import Database from "better-sqlite3";
import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/server/app.js";
import { ensureSchema } from "../src/server/db/migrate.js";
import { TaskRepo } from "../src/server/db/repo.js";
import type { Task } from "../src/shared/types.js";

let app: Express;
let repo: TaskRepo;

beforeEach(() => {
  const db = new Database(":memory:");
  ensureSchema(db);
  repo = new TaskRepo(db);
  repo.reseed();
  app = createApp(repo);
});

describe("GET /api/tasks", () => {
  it("200 + seed-aantal, gesorteerd", async () => {
    const res = await request(app).get("/api/tasks");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(10);
    const todo = (res.body as Task[]).filter((t) => t.status === "todo");
    expect(todo.map((t) => t.position)).toEqual([0, 1, 2, 3]);
  });
});

describe("POST /api/tasks", () => {
  it("201 + nieuwe kaart achteraan in todo", async () => {
    const res = await request(app).post("/api/tasks").send({ title: "Nieuw", priority: "high" });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("todo");
    expect(res.body.position).toBe(4);
    expect(res.body.priority).toBe("high");
  });
  it("400 bij lege titel", async () => {
    const res = await request(app).post("/api/tasks").send({ title: "   " });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });
  it("400 bij ongeldige priority", async () => {
    const res = await request(app).post("/api/tasks").send({ title: "x", priority: "urgent" });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/tasks/:id", () => {
  it("200 + bijgewerkte velden", async () => {
    const created = (await request(app).post("/api/tasks").send({ title: "x" })).body as Task;
    const res = await request(app).patch(`/api/tasks/${created.id}`).send({ title: "y" });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("y");
  });
  it("404 bij onbekend id", async () => {
    const res = await request(app).patch("/api/tasks/nope").send({ title: "y" });
    expect(res.status).toBe(404);
  });
  it("400 bij lege titel", async () => {
    const created = (await request(app).post("/api/tasks").send({ title: "x" })).body as Task;
    const res = await request(app).patch(`/api/tasks/${created.id}`).send({ title: "  " });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/tasks/:id/move", () => {
  it("200 + correcte nieuwe ordening", async () => {
    const all = (await request(app).get("/api/tasks")).body as Task[];
    const first = all.find((t) => t.status === "todo" && t.position === 0) as Task;
    const res = await request(app)
      .post(`/api/tasks/${first.id}/move`)
      .send({ status: "doing", position: 0 });
    expect(res.status).toBe(200);
    const doing = (res.body as Task[]).filter((t) => t.status === "doing");
    expect((doing[0] as Task).id).toBe(first.id);
    expect(doing.map((t) => t.position)).toEqual([0, 1, 2, 3]);
  });
  it("404 bij onbekend id", async () => {
    const res = await request(app)
      .post("/api/tasks/nope/move")
      .send({ status: "doing", position: 0 });
    expect(res.status).toBe(404);
  });
  it("400 bij ongeldige status", async () => {
    const all = (await request(app).get("/api/tasks")).body as Task[];
    const res = await request(app)
      .post(`/api/tasks/${(all[0] as Task).id}/move`)
      .send({ status: "x", position: 0 });
    expect(res.status).toBe(400);
  });
  it("400 bij negatieve position", async () => {
    const all = (await request(app).get("/api/tasks")).body as Task[];
    const res = await request(app)
      .post(`/api/tasks/${(all[0] as Task).id}/move`)
      .send({ status: "doing", position: -1 });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/tasks/:id", () => {
  it("204 + resterende posities dicht", async () => {
    const all = (await request(app).get("/api/tasks")).body as Task[];
    const todo = all.filter((t) => t.status === "todo");
    const res = await request(app).delete(`/api/tasks/${(todo[1] as Task).id}`);
    expect(res.status).toBe(204);
    const after = ((await request(app).get("/api/tasks")).body as Task[]).filter(
      (t) => t.status === "todo",
    );
    expect(after.map((t) => t.position)).toEqual([0, 1, 2]);
  });
  it("404 bij onbekend id", async () => {
    const res = await request(app).delete("/api/tasks/nope");
    expect(res.status).toBe(404);
  });
});

describe("POST /api/seed/reset", () => {
  it("200 + staat terug op seed", async () => {
    const all = (await request(app).get("/api/tasks")).body as Task[];
    await request(app).delete(`/api/tasks/${(all[0] as Task).id}`);
    const res = await request(app).post("/api/seed/reset");
    expect(res.status).toBe(200);
    expect((res.body as Task[]).length).toBe(10);
  });
});

describe("malformed JSON", () => {
  it("400 bij kapotte body", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .set("Content-Type", "application/json")
      .send('{"title": ');
    expect(res.status).toBe(400);
  });
});
