import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function PlanCard({
  name,
  price,
  description,
  features,
  highlighted,
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <Card className={highlighted ? "border-primary p-6" : "p-6"}>
      <h3 className="text-lg font-semibold">{name}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="mt-6 flex items-end gap-1">
        <strong className="text-4xl font-semibold">{price}</strong>
        <span className="pb-1 text-sm text-muted-foreground">/mês</span>
      </div>
      <Button className="mt-6 w-full" variant={highlighted ? "default" : "outline"}>
        Escolher plano
      </Button>
      <div className="mt-6 space-y-3">
        {features.map((feature) => (
          <div key={feature} className="flex gap-3 text-sm">
            <Check className="h-4 w-4 text-success" />
            <span>{feature}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
