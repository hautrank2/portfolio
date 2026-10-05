import { z } from "zod";
import { createSession, verifyLogin } from "~/utils/auth";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Username and password are required." },
      { status: 400 }
    );
  }

  const result = await verifyLogin(parsed.data.username, parsed.data.password);
  if (!result.ok) {
    return result.reason === "locked"
      ? Response.json(
          { error: "Too many failed attempts. Try again in 15 minutes." },
          { status: 429 }
        )
      : Response.json(
          { error: "Wrong username or password." },
          { status: 401 }
        );
  }

  await createSession(result.session);
  return Response.json({ user: result.session });
}
