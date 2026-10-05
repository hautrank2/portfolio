import { readBody, readPageQuery, requireAdmin } from "~/utils/api";
import {
  createProject,
  listProjects,
  listProjectsPage,
  projectInputSchema,
} from "~/lib/project";

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const paging = readPageQuery(new URL(request.url).searchParams);
  return Response.json(
    paging ? await listProjectsPage(paging) : { items: await listProjects() }
  );
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await readBody(request, projectInputSchema);
  if (body.error) return body.error;

  return Response.json({ item: await createProject(body.data) }, { status: 201 });
}
