import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FeaturePage } from "@/components/public/feature-page";
import { featurePages } from "@/lib/public-content";
import { createSeoMetadata } from "@/lib/seo";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return Object.values(featurePages)
    .filter((page) => page.path !== "/recursos")
    .map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = featurePages[slug as keyof typeof featurePages];
  if (!page) return {};

  return createSeoMetadata({
    title: page.title,
    description: page.description,
    path: page.path,
    keywords: [...page.keywords],
  });
}

export default async function ResourceSlugPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const page = featurePages[slug as keyof typeof featurePages];
  if (!page) notFound();

  return (
    <FeaturePage
      eyebrow="Recurso Meus Condomínios"
      title={page.title}
      description={page.description}
      icon={page.icon}
      path={page.path}
      bullets={[...page.bullets]}
      sections={[...page.sections]}
      faq={[...page.faq]}
    />
  );
}
