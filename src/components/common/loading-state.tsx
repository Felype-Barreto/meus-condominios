export function LoadingState({ label = "Carregando" }: { label?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
        <span className="h-3 w-3 animate-pulse rounded-full bg-primary" aria-hidden="true" />
        {label}
      </div>
      <div className="mt-5 grid gap-3">
        <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-20 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  );
}
