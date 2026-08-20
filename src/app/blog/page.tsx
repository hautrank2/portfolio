import type { Metadata } from "next";
import { SectionView } from "~/components/blog/section-view";
import { getBlogTree } from "~/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description: "Note trong lúc học, ghép dần thành roadmap theo từng chủ đề.",
};

export default function BlogPage() {
  return <SectionView node={getBlogTree()} trail={[]} />;
}
