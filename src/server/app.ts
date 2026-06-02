import express, { type Express, type NextFunction, type Request, type Response } from "express";
import type { TaskRepo } from "./db/repo.js";
import { createTasksRouter } from "./routes/tasks.js";
import { ValidationError } from "./validation.js";

export function createApp(repo: TaskRepo): Express {
  const app = express();
  app.use(express.json());
  app.use("/api", createTasksRouter(repo));

  // Centrale error-handler. Validatie → 400; malformed JSON → 400; rest → 500.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof SyntaxError && "body" in err) {
      res.status(400).json({ error: "Ongeldige JSON" });
      return;
    }
    res.status(500).json({ error: "Interne serverfout" });
  });

  return app;
}
