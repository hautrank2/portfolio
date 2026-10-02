import { getSession } from "~/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  return Response.json({ user: session });
}
