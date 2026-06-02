import type { CreateTaskBody, MoveTaskBody, UpdateTaskBody } from "../shared/types.js";
import { isPriority, isStatus } from "../shared/types.js";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function asRecord(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Body moet een object zijn");
  }
  return body as Record<string, unknown>;
}

export function parseCreateBody(body: unknown): Required<CreateTaskBody> {
  const b = asRecord(body);
  if (typeof b.title !== "string" || b.title.trim() === "") {
    throw new ValidationError("Titel is verplicht");
  }
  if (b.priority !== undefined && !isPriority(b.priority)) {
    throw new ValidationError("Ongeldige prioriteit");
  }
  const description = typeof b.description === "string" ? b.description : "";
  return {
    title: b.title.trim(),
    description,
    priority: isPriority(b.priority) ? b.priority : "med",
  };
}

export function parseUpdateBody(body: unknown): UpdateTaskBody {
  const b = asRecord(body);
  const out: UpdateTaskBody = {};
  if (b.title !== undefined) {
    if (typeof b.title !== "string" || b.title.trim() === "") {
      throw new ValidationError("Titel mag niet leeg zijn");
    }
    out.title = b.title.trim();
  }
  if (b.description !== undefined) {
    if (typeof b.description !== "string") {
      throw new ValidationError("Beschrijving moet tekst zijn");
    }
    out.description = b.description;
  }
  if (b.priority !== undefined) {
    if (!isPriority(b.priority)) {
      throw new ValidationError("Ongeldige prioriteit");
    }
    out.priority = b.priority;
  }
  return out;
}

export function parseMoveBody(body: unknown): MoveTaskBody {
  const b = asRecord(body);
  if (!isStatus(b.status)) {
    throw new ValidationError("Ongeldige of ontbrekende status");
  }
  if (typeof b.position !== "number" || !Number.isInteger(b.position) || b.position < 0) {
    throw new ValidationError("Position moet een integer >= 0 zijn");
  }
  return { status: b.status, position: b.position };
}
