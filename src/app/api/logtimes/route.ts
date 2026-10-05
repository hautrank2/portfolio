import { jsonError, readBody, readPageQuery, requireAdmin } from "~/utils/api";
import {
  createLogtime,
  listLogtimes,
  listLogtimesPage,
  logtimeInputSchema,
} from "~/lib/logtime";
import { monthSchema } from "~/utils/schema";

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const rawMonth = searchParams.get("month");
  if (rawMonth !== null && !monthSchema.safeParse(rawMonth).success) {
    return jsonError("month must look like YYYY-MM.", 400);
  }
  const month = rawMonth ?? undefined;

  const paging = readPageQuery(searchParams);
  return Response.json(
    paging
      ? await listLogtimesPage({ ...paging, month })
      : { items: await listLogtimes(month) }
  );
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await readBody(request, logtimeInputSchema);
  if (body.error) return body.error;

  return Response.json({ item: await createLogtime(body.data) }, { status: 201 });
}
