import { z } from "zod";
import {
  createLogtime,
  listLogtimes,
  listLogtimesInRange,
  listLogtimesPage,
  logtimeInputSchema,
} from "~/lib/logtime";
import { jsonError, readBody, readPageQuery, requireAdmin } from "~/utils/api";
import { monthSchema } from "~/utils/schema";

const daySchema = z.iso.date();

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);

  // `?from=` / `?to=` (days, inclusive) select a free range — the dashboard
  // uses it. It is a different question from `?month=`, so it comes first.
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (from !== null || to !== null) {
    if (
      (from !== null && !daySchema.safeParse(from).success) ||
      (to !== null && !daySchema.safeParse(to).success)
    ) {
      return jsonError("from and to must look like YYYY-MM-DD.", 400);
    }
    return Response.json({
      items: await listLogtimesInRange(from ?? undefined, to ?? undefined),
    });
  }

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
