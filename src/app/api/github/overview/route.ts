import axios from "axios";
import { getGithubOverview } from "~/lib/github";
import { jsonError, requireAdmin } from "~/utils/api";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const githubRes = await getGithubOverview();
    return Response.json(githubRes);
  } catch (error) {
    // GitHub down, rate-limited, or unreachable — not a client mistake.
    const message = axios.isAxiosError(error)
      ? error.message
      : "Failed to reach GitHub.";
    return jsonError(message, 502);
  }
}
