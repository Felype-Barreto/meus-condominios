import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function UpgradeBanner({
  condoId = "demo",
  title = "Upgrade disponível",
  description = "Libere mais limites, permissões avançadas e recursos profissionais.",
}: {
  condoId?: string;
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-lg border bg-[#fffaf3] p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/app/${condoId}/assinatura`}>
            Ver assinatura <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
