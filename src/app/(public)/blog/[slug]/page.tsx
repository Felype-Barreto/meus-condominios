import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArticlePage } from "@/components/public/article-page";
import { blogPosts } from "@/lib/public-content";
import { createSeoMetadata } from "@/lib/seo";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return Object.keys(blogPosts).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts[slug as keyof typeof blogPosts];
  if (!post) return {};

  return createSeoMetadata({
    title: post.title,
    description: post.description,
    path: post.path,
    keywords: [post.keyword, "Meus Condomínios", "gestão de condomínio online"],
    type: "article",
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const post = blogPosts[slug as keyof typeof blogPosts];
  if (!post) notFound();

  return (
    <ArticlePage
      title={post.title}
      description={post.description}
      path={post.path}
      keyword={post.keyword}
      date={post.date}
    />
  );
}
