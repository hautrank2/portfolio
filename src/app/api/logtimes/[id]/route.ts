import { type IdRouteContext, jsonError, readBody, requireAdmin } from "~/utils/api";
import { deleteLogtime, logtimeInputSchema, updateLogtime } from "~/lib/logtime";

const notFound = () => jsonError("Logtime not found.", 404);

export async function PUT(request: Request, { params }: IdRouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await readBody(request, logtimeInputSchema);
  if (body.error) return body.error;

  const { id } = await params;
  const item = await updateLogtime(id, body.data);
  return item ? Response.json({ item }) : notFound();
}

export async function DELETE(_request: Request, { params }: IdRouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  return (await deleteLogtime(id)) ? Response.json({ ok: true }) : notFound();
}
