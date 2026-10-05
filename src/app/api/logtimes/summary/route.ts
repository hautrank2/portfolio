import { jsonError, requireAdmin } from "~/utils/api";
import { summarizeLogtimes } from "~/lib/logtime";
import { monthSchema } from "~/utils/schema";

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const month = new URL(request.url).searchParams.get("month");
  if (month !== null && !monthSchema.safeParse(month).success) {
    return jsonError("month must look like YYYY-MM.", 400);
  }

  return Response.json(await summarizeLogtimes(month ?? undefined));
}
