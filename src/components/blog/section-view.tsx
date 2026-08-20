import PageHeader from "~/components/layouts/page-header";
import { Reveal } from "~/components/ui/reveal";
import { renderMarkdown } from "~/lib/markdown";
import type { BlogNodeContextType } from "~/types";
import { BlogBreadcrumb } from "./breadcrumb";
import { NodeCard } from "./node-card";
import { BlogProgress } from "./progress";

/** A folder: its `index.md` intro, then its children in `order:` sequence. */
async function SectionView({ node, trail }: BlogNodeContextType) {
  const intro = await renderMarkdown(node.body);
  const kicker = trail.at(-1)?.title ?? "Blog";

  return (
    <div className="pb-24">
      <PageHeader kicker={kicker} title={node.title} description={node.description}>
        <div className="mt-8 flex flex-col gap-4">
          {trail.length > 0 && <BlogBreadcrumb trail={trail} />}
          <BlogProgress done={node.progress.done} total={node.progress.total} />
        </div>
      </PageHeader>

      <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-8 lg:px-16">
        {intro && (
          <Reveal>
            <div
              className="prose-note"
              dangerouslySetInnerHTML={{ __html: intro }}
            />
          </Reveal>
        )}

        {node.children.length > 0 && (
          <div className={intro ? "mt-14 space-y-4" : "space-y-4"}>
            {node.children.map((child, index) => (
              <Reveal key={child.slug} delay={Math.min(index, 6) * 60}>
                <NodeCard node={child} index={index} />
              </Reveal>
            ))}
          </div>
        )}

        {node.children.length === 0 && !intro && (
          <p className="text-foreground/50">Chưa có gì ở đây.</p>
        )}
      </div>
    </div>
  );
}

export { SectionView };
