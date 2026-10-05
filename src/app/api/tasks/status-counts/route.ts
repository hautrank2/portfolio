import { jsonError, requireAdmin } from "~/utils/api";
import { objectIdSchema } from "~/utils/schema";
import { countTasksByStatus } from "~/lib/task";

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const project = new URL(request.url).searchParams.get("project");
  if (project !== null && !objectIdSchema.safeParse(project).success) {
    return jsonError("Invalid project.", 400);
  }

  return Response.json(await countTasksByStatus(project ?? undefined));
}
