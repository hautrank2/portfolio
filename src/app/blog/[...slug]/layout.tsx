import { BlogSidebar, BlogTrackNavMobile } from "~/components/blog/sidebar";
import { getBlogNode, toSidebarTree } from "~/lib/blog";

type LayoutPropsType = {
  children: React.ReactNode;
  params: Promise<{ slug: string[] }>;
};

/**
 * Everything below a track (`/blog/k8s/**`) gets that track's nav rail. The
 * blog root keeps its own full-bleed layout — there is no single track to show
 * there.
 */
export default async function BlogTrackLayout({
  children,
  params,
}: LayoutPropsType) {
  const { slug } = await params;
  const track = getBlogNode(slug.slice(0, 1));

  if (!track || track.node.kind !== "section") return <>{children}</>;

  const tree = toSidebarTree(track.node);

  return (
    <div>
      <BlogTrackNavMobile tree={tree} />
      <div className="lg:flex">
        <BlogSidebar tree={tree} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
