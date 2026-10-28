import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";
import { hasAnthropicKey } from "~/lib/anthropic";
import { githubReviewInputSchema, reviewLatestCommit } from "~/lib/code-review";
import { jsonError, readBody, requireAdmin } from "~/utils/api";

// A review of a large commit can take a few minutes.
export const maxDuration = 300;

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await readBody(request, githubReviewInputSchema);
  if (body.error) return body.error;

  if (!hasAnthropicKey()) {
    return jsonError("ANTHROPIC_API_KEY is not set on the server.", 503);
  }

  try {
    const result = await reviewLatestCommit(body.data.repo);
    return result.ok
      ? Response.json(result.data)
      : jsonError(result.error, result.status);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return error.response?.status === 404
        ? jsonError("No such repo under this handle.", 404)
        : jsonError(`GitHub: ${error.message}`, 502);
    }
    if (error instanceof Anthropic.RateLimitError) {
      return jsonError("Claude is rate-limited — try again shortly.", 429);
    }
    if (error instanceof Anthropic.APIError) {
      return jsonError(`Claude API error ${error.status}: ${error.message}`, 502);
    }
    throw error;
  }
}
