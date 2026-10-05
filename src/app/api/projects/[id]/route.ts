import { type IdRouteContext, jsonError, readBody, requireAdmin } from "~/utils/api";
import { projectInputSchema, updateProject } from "~/lib/project";

const notFound = () => jsonError("Project not found.", 404);

export async function PUT(request: Request, { params }: IdRouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await readBody(request, projectInputSchema);
  if (body.error) return body.error;

  const { id } = await params;
  const item = await updateProject(id, body.data);
  return item ? Response.json({ item }) : notFound();
}

// There is no DELETE: a task or project is closed by changing its status, so
// the logtimes that point at it keep their history.
