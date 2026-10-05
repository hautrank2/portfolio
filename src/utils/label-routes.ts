import { type IdRouteContext, jsonError, readBody, requireAdmin } from "~/utils/api";
import {
  createLabel,
  deleteLabel,
  labelInputSchema,
  listLabels,
  updateLabel,
} from "~/lib/label";
import type { LabelKindType } from "~/types";

// `/api/categories` and `/api/tags` are the same four handlers pointed at
// different collections, so the route files only pick a kind.

const notFound = () => jsonError("Not found.", 404);

export const labelCollectionHandlers = (kind: LabelKindType) => ({
  GET: async () => {
    const denied = await requireAdmin();
    if (denied) return denied;

    return Response.json({ items: await listLabels(kind) });
  },

  POST: async (request: Request) => {
    const denied = await requireAdmin();
    if (denied) return denied;

    const body = await readBody(request, labelInputSchema);
    if (body.error) return body.error;

    return Response.json(
      { item: await createLabel(kind, body.data) },
      { status: 201 }
    );
  },
});

export const labelItemHandlers = (kind: LabelKindType) => ({
  PUT: async (request: Request, { params }: IdRouteContext) => {
    const denied = await requireAdmin();
    if (denied) return denied;

    const body = await readBody(request, labelInputSchema);
    if (body.error) return body.error;

    const { id } = await params;
    const item = await updateLabel(kind, id, body.data);
    return item ? Response.json({ item }) : notFound();
  },

  DELETE: async (_request: Request, { params }: IdRouteContext) => {
    const denied = await requireAdmin();
    if (denied) return denied;

    const { id } = await params;
    return (await deleteLabel(kind, id)) ? Response.json({ ok: true }) : notFound();
  },
});
