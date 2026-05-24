import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { blogPosts } from "@/lib/public-content";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "Blog Meus Condomínios sobre gestão de condomínios",
  description:
    "Conteúdos práticos sobre sistema para condomínio, app para síndico, comunicados, encomendas e reservas online.",
  path: "/blog",
  keywords: ["sistema para condomínio", "app para síndico", "gestão de condomínio online"],
});

export default function BlogPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold text-primary">Blog</p>
      <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-normal md:text-5xl">
        Guias práticos para organizar a rotina do condomínio
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
        Conteúdo claro para síndicos, administradoras e moradores tomarem
        decisões melhores sobre comunicação, portaria e reservas.
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {Object.values(blogPosts).map((post) => (
          <Card key={post.path} className="p-6">
            <p className="text-xs font-semibold uppercase text-primary">{post.keyword}</p>
            <h2 className="mt-3 text-xl font-semibold">{post.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{post.description}</p>
            <Link href={post.path} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Ler artigo <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
        ))}
      </div>
    </section>
  );
}
