import { Card } from "@/components/ui/card";

type LegalSection = {
  title: string;
  body: string[];
};

export function LegalPage({
  eyebrow,
  title,
  description,
  sections,
}: {
  eyebrow: string;
  title: string;
  description: string;
  sections: LegalSection[];
}) {
  return (
    <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold text-primary">{eyebrow}</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-normal">{title}</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
        {description}
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        Última atualização: 20 de maio de 2026.
      </p>

      <div className="mt-8 space-y-4">
        {sections.map((section) => (
          <Card key={section.title} className="p-5 sm:p-6">
            <h2 className="text-xl font-semibold">{section.title}</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
