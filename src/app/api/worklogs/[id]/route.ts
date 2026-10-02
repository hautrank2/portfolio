import { getSession } from "~/lib/auth";
import { deleteWorkLog, updateWorkLog, workLogInputSchema } from "~/lib/worklog";

type RouteContext = { params: Promise<{ id: string }> };

const unauthorized = () =>
  Response.json({ error: "Chưa đăng nhập." }, { status: 401 });

const notFound = () =>
  Response.json({ error: "Không tìm thấy log." }, { status: 404 });

export async function PUT(request: Request, { params }: RouteContext) {
  if (!(await getSession())) return unauthorized();

  const body: unknown = await request.json().catch(() => null);
  const parsed = workLogInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Dữ liệu log không hợp lệ." }, { status: 400 });
  }

  const { id } = await params;
  const log = await updateWorkLog(id, parsed.data);
  return log ? Response.json({ log }) : notFound();
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!(await getSession())) return unauthorized();

  const { id } = await params;
  return (await deleteWorkLog(id)) ? Response.json({ ok: true }) : notFound();
}
