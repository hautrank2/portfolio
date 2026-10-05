import type { Metadata } from "next";
import { blogPathTitle, getBlogTree } from "~/utils/blog";
import { SectionView } from "./_components/section-view";

export const metadata: Metadata = {
  title: blogPathTitle(),
  description: "Note trong lúc học, ghép dần thành roadmap theo từng chủ đề.",
  // Link previews still deserve the human name, not the path.
  openGraph: { title: "Blog" },
};

export default function BlogPage() {
  return <SectionView node={getBlogTree()} trail={[]} standalone />;
}
