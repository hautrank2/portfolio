import { z } from "zod";
import { createSession, verifyLogin } from "~/lib/auth";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Thiếu tên đăng nhập hoặc mật khẩu." },
      { status: 400 }
    );
  }

  const result = await verifyLogin(parsed.data.username, parsed.data.password);
  if (!result.ok) {
    return result.reason === "locked"
      ? Response.json(
          { error: "Sai quá nhiều lần. Thử lại sau 15 phút." },
          { status: 429 }
        )
      : Response.json(
          { error: "Sai tên đăng nhập hoặc mật khẩu." },
          { status: 401 }
        );
  }

  await createSession(result.session);
  return Response.json({ user: result.session });
}
