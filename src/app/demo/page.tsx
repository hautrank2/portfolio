import type { Metadata } from "next";
import PageHeader from "~/components/layouts/page-header";
import { demoPathTitle, getDemoSummaries } from "~/utils/demo";
import { DemoCard } from "./_components/demo-card";

export const metadata: Metadata = {
  title: demoPathTitle(),
  description: "Video demo ngắn cho những thứ mình đã dựng và ghi lại trong blog.",
  openGraph: { title: "Demo" },
};

export default function DemoPage() {
  const demos = getDemoSummaries();

  return (
    <div className="pb-24">
      <PageHeader
        kicker="Chạy thật"
        title="Demo"
        description="Mỗi demo là một video ngắn cho thứ mình đã dựng — kèm vài dòng tóm tắt và đường dẫn tới bài viết chi tiết."
      />

      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-8 lg:py-16">
        <div className="grid gap-5 sm:grid-cols-2">
          {demos.map((demo) => (
            <DemoCard key={demo.slug} demo={demo} />
          ))}
        </div>

        {demos.length === 0 && (
          <p className="text-foreground/50">Chưa có demo nào.</p>
        )}
      </div>
    </div>
  );
}
