import { Users } from "lucide-react";
import { RoleBadge } from "@/components/common/role-badge";
import { Card } from "@/components/ui/card";

export default async function ApartmentDetailPage({
  params,
}: {
  params: Promise<{ apartmentId: string }>;
}) {
  const { apartmentId } = await params;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-normal">Apartamento {apartmentId}</h1>
      <Card className="p-6">
        <Users className="h-6 w-6 text-primary" />
        <h2 className="mt-5 text-xl font-semibold">Vínculos da unidade</h2>
        <div className="mt-5 flex flex-wrap gap-2">
          <RoleBadge role="owner" />
          <RoleBadge role="resident" />
        </div>
      </Card>
    </div>
  );
}
