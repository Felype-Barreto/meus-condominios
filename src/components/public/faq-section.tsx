import type { FaqItem } from "@/lib/seo";

export function FaqSection({ items }: { items: FaqItem[] }) {
  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-semibold tracking-normal">Perguntas frequentes</h2>
      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <div key={item.question} className="rounded-lg border bg-card p-5 shadow-sm">
            <h3 className="font-semibold">{item.question}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
