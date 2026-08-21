import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocView } from "~/components/blog/doc-view";
import { SectionView } from "~/components/blog/section-view";
import { blogPathTitle, getAllBlogPaths, getBlogNode } from "~/lib/blog";

type PagePropsType = { params: Promise<{ slug: string[] }> };

/**
 * One route for every depth. A note three folders deep needs no extra file —
 * which is the whole reason this is a catch-all rather than fixed segments.
 */
export function generateStaticParams() {
  return getAllBlogPaths().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PagePropsType): Promise<Metadata> {
  const { slug } = await params;
  const found = getBlogNode(slug);
  if (!found) return {};

  return {
    title: blogPathTitle(slug),
    description: found.node.description,
    // Link previews still deserve the human name, not the path.
    openGraph: {
      title: found.node.title,
      description: found.node.description,
    },
  };
}

export default async function BlogNodePage({ params }: PagePropsType) {
  const { slug } = await params;
  const found = getBlogNode(slug);
  if (!found) notFound();

  return found.node.kind === "section" ? (
    <SectionView {...found} />
  ) : (
    <DocView {...found} />
  );
}
