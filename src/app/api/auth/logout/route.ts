import { clearSession } from "~/utils/auth";

export async function POST() {
  await clearSession();
  return Response.json({ ok: true });
}
