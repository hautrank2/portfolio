import type { Metadata } from "next";
import { blogPathTitle, getBlogTree } from "~/utils/blog";
import { SectionView } from "./_components/section-view";

export const metadata: Metadata = {
  title: blogPathTitle(),
  description: "Note trong lúc học — bài ngắn nhóm theo tag, chủ đề lớn thành roadmap.",
  // Link previews still deserve the human name, not the path.
  openGraph: { title: "Blog" },
};

export default function BlogPage() {
  return <SectionView node={getBlogTree()} trail={[]} standalone />;
}
