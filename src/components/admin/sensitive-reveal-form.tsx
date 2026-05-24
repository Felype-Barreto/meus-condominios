import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { revealSensitiveDataAction } from "@/app/(admin)/admin/actions";

export function SensitiveRevealForm({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId?: string | null;
}) {
  return (
    <form action={revealSensitiveDataAction} className="flex flex-col gap-2 sm:flex-row">
      <input type="hidden" name="entity_type" value={entityType} />
      <input type="hidden" name="entity_id" value={entityId ?? ""} />
      <Input
        name="reason"
        placeholder="Motivo para revelar dado sensível"
        className="min-w-72"
        required
      />
      <Button type="submit" variant="outline">
        Registrar motivo
      </Button>
    </form>
  );
}
