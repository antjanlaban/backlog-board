import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Priority, Task } from "@shared/types";
import { useEffect, useState } from "react";

interface Submission {
  title: string;
  description: string;
  priority: Priority;
}

export function TaskDialog({
  open,
  mode,
  task,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  task?: Task | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: Submission) => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("med");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? "");
      setDescription(task?.description ?? "");
      setPriority(task?.priority ?? "med");
      setError("");
    }
  }, [open, task]);

  function submit() {
    if (title.trim() === "") {
      setError("Titel is verplicht");
      return;
    }
    void onSubmit({ title: title.trim(), description, priority });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nieuwe kaart" : "Kaart bewerken"}</DialogTitle>
          <DialogDescription>Vul de gegevens van de kaart in.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="task-title">Titel</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Wat moet er gebeuren?"
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="task-desc">Beschrijving</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="task-prio">Prioriteit</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger id="task-prio">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Laag</SelectItem>
                <SelectItem value="med">Middel</SelectItem>
                <SelectItem value="high">Hoog</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={submit}>{mode === "create" ? "Toevoegen" : "Opslaan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
