import { getSession } from "~/lib/auth";
import {
  createWorkLog,
  listWorkLogs,
  workLogInputSchema,
  workLogMonthSchema,
} from "~/lib/worklog";

const unauthorized = () =>
  Response.json({ error: "Chưa đăng nhập." }, { status: 401 });

export async function GET(request: Request) {
  if (!(await getSession())) return unauthorized();

  const month = new URL(request.url).searchParams.get("month");
  if (month !== null && !workLogMonthSchema.safeParse(month).success) {
    return Response.json(
      { error: "month phải có dạng YYYY-MM." },
      { status: 400 }
    );
  }

  return Response.json({ logs: await listWorkLogs(month ?? undefined) });
}

export async function POST(request: Request) {
  if (!(await getSession())) return unauthorized();

  const body: unknown = await request.json().catch(() => null);
  const parsed = workLogInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Dữ liệu log không hợp lệ." }, { status: 400 });
  }

  return Response.json({ log: await createWorkLog(parsed.data) }, { status: 201 });
}
