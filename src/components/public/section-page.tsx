import { LucideIcon } from "lucide-react";

export function SectionPage({
  eyebrow,
  title,
  description,
  items,
}: {
  eyebrow: string;
  title: string;
  description: string;
  items: { icon: LucideIcon; title: string; description: string }[];
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold text-primary">{eyebrow}</p>
      <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-normal md:text-5xl">
        {title}
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">{description}</p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <div key={item.title} className="rounded-lg border bg-card p-6 shadow-sm">
            <item.icon className="h-6 w-6 text-primary" />
            <h2 className="mt-5 text-lg font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
