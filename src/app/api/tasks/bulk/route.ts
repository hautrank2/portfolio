import { z } from "zod";
import { readBody, requireAdmin } from "~/utils/api";
import { createTasks, taskInputSchema } from "~/lib/task";

// Matches the limit the import dialog checks before sending.
const bulkSchema = z.array(taskInputSchema).min(1).max(100);

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await readBody(request, bulkSchema);
  if (body.error) return body.error;

  return Response.json({ items: await createTasks(body.data) }, { status: 201 });
}
