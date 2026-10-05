import { z } from "zod";
import { taskStatusData } from "~/data/admin";
import { jsonError, readBody, readPageQuery, requireAdmin } from "~/utils/api";
import { objectIdSchema } from "~/utils/schema";
import { createTask, listTasks, listTasksPage, taskInputSchema } from "~/lib/task";

const filterSchema = z.object({
  status: z.enum(taskStatusData).optional(),
  projectId: objectIdSchema.optional(),
});

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const paging = readPageQuery(searchParams);
  // Without `page` the whole list comes back — the pickers need every task.
  if (!paging) return Response.json({ items: await listTasks() });

  const filter = filterSchema.safeParse({
    status: searchParams.get("status") ?? undefined,
    projectId: searchParams.get("project") ?? undefined,
  });
  if (!filter.success) return jsonError("Invalid status or project.", 400);

  return Response.json(await listTasksPage({ ...paging, ...filter.data }));
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await readBody(request, taskInputSchema);
  if (body.error) return body.error;

  return Response.json({ item: await createTask(body.data) }, { status: 201 });
}
