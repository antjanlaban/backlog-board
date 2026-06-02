export function EmptyColumn() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border p-6 text-center text-muted-foreground">
      <span className="text-3xl" aria-hidden>
        🗒️
      </span>
      <p className="text-sm">Nog niets hier — sleep een kaart of voeg er een toe.</p>
    </div>
  );
}
