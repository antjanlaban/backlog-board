import { Board } from "@/components/Board";
import { DeleteConfirm } from "@/components/DeleteConfirm";
import { TaskDialog } from "@/components/TaskDialog";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useTasks } from "@/hooks/useTasks";
import type { Task } from "@shared/types";
import { useState } from "react";

export default function App() {
  const { tasks, loading, create, edit, move, remove, resetDemo } = useTasks();
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Task | null>(null);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Backlog Board</h1>
        <div className="flex gap-2">
          <Button onClick={() => setCreating(true)}>Nieuwe kaart</Button>
          <Button variant="outline" onClick={() => resetDemo()}>
            Reset demo data
          </Button>
        </div>
      </header>

      {loading ? (
        <p className="text-muted-foreground">Laden…</p>
      ) : (
        <Board tasks={tasks} onMove={move} onEdit={setEditing} onDelete={setDeleting} />
      )}

      <TaskDialog
        open={creating}
        mode="create"
        onOpenChange={setCreating}
        onSubmit={async (body) => {
          await create(body);
          setCreating(false);
        }}
      />
      <TaskDialog
        open={editing !== null}
        mode="edit"
        task={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSubmit={async (body) => {
          if (editing) await edit(editing.id, body);
          setEditing(null);
        }}
      />
      <DeleteConfirm
        task={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await remove(deleting.id);
          setDeleting(null);
        }}
      />
      <Toaster />
    </main>
  );
}
