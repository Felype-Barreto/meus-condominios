import { AlertTriangle } from "lucide-react";

export function PlanLimitAlert({
  message,
  tone = "warning",
}: {
  message: string;
  tone?: "warning" | "error";
}) {
  return (
    <div
      className={`flex gap-3 rounded-lg border p-4 text-sm font-medium ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-destructive"
          : "border-amber-200 bg-amber-50 text-warning"
      }`}
    >
      <AlertTriangle className="h-5 w-5 shrink-0" />
      {message}
    </div>
  );
}
