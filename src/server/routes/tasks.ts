import { Router } from "express";
import type { TaskRepo } from "../db/repo.js";
import { ValidationError, parseCreateBody, parseMoveBody, parseUpdateBody } from "../validation.js";

export function createTasksRouter(repo: TaskRepo): Router {
  const router = Router();

  router.get("/tasks", (_req, res) => {
    res.status(200).json(repo.listAll());
  });

  router.post("/tasks", (req, res) => {
    const body = parseCreateBody(req.body);
    res.status(201).json(repo.insert(body));
  });

  router.patch("/tasks/:id", (req, res) => {
    const body = parseUpdateBody(req.body);
    const updated = repo.update(req.params.id, body);
    if (!updated) {
      res.status(404).json({ error: "Task niet gevonden" });
      return;
    }
    res.status(200).json(updated);
  });

  router.post("/tasks/:id/move", (req, res) => {
    const body = parseMoveBody(req.body);
    const result = repo.move(req.params.id, body.status, body.position);
    if (!result) {
      res.status(404).json({ error: "Task niet gevonden" });
      return;
    }
    res.status(200).json(result);
  });

  router.delete("/tasks/:id", (req, res) => {
    const removed = repo.remove(req.params.id);
    if (!removed) {
      res.status(404).json({ error: "Task niet gevonden" });
      return;
    }
    res.status(204).end();
  });

  router.post("/seed/reset", (_req, res) => {
    res.status(200).json(repo.reseed());
  });

  return router;
}

export { ValidationError };
