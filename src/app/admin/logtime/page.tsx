import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageHeader from "~/components/layouts/page-header";
import { getSession } from "~/lib/auth";
import { listWorkLogs, workLogMonthSchema } from "~/lib/worklog";
import { LogBoard } from "./_components/log-board";

export const metadata: Metadata = {
  title: "admin | logtime",
};

type LogtimePageProps = {
  searchParams: Promise<{ month?: string | string[] }>;
};

/** Current month in Vietnam time — the server on Vercel runs in UTC. */
const currentMonth = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());

export default async function LogtimePage({ searchParams }: LogtimePageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  const { month: rawMonth } = await searchParams;
  const parsed = workLogMonthSchema.safeParse(rawMonth);
  const month = parsed.success ? parsed.data : currentMonth();
  const logs = await listWorkLogs(month);

  return (
    <div className="pb-24">
      <PageHeader
        kicker="Admin"
        title="Logtime"
        description="Mỗi ngày làm gì, dùng công nghệ nào, hết bao nhiêu giờ."
      />
      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-8 lg:py-16">
        <LogBoard logs={logs} month={month} username={session.username} />
      </div>
    </div>
  );
}
