import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";

export function ErrorState({
  title = "Não foi possível carregar",
  description = "Tente novamente em instantes.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-5 text-destructive">
      <AlertTriangle className="mt-0.5 h-5 w-5" />
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-red-700">{description}</p>
      </div>
    </Card>
  );
}
