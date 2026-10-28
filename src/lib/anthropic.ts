import Anthropic from "@anthropic-ai/sdk";

// Server only. The Claude API goes through Anthropic's own SDK rather than
// `~/lib/http-server` — the SDK owns retries, streaming and the typed errors.

export const REVIEW_MODEL = "claude-opus-5-5";

// A review reads a whole diff, so the request can run for minutes; the SDK
// is told so rather than the route guessing.
const REVIEW_TIMEOUT_MS = 5 * 60 * 1000;

// Credentials come from ANTHROPIC_API_KEY. The client is created on first use
// so the app still builds and serves the public site without the key.
let client: Anthropic | undefined;
const getClient = () => (client ??= new Anthropic({ timeout: REVIEW_TIMEOUT_MS }));

export const hasAnthropicKey = () => Boolean(process.env.ANTHROPIC_API_KEY);

const REVIEW_SYSTEM = `You review a single git commit for its author, a full-stack developer.
Point out bugs, security problems, and risky or unclear code in the changed lines. Skip style nits a formatter or linter would catch.
Answer in plain text, not markdown: no headings, no bold, no tables. Start with a one-sentence summary of what the commit does. Then list findings, most important first, one per paragraph, each starting with the file path (and line, when the diff shows it). If nothing is worth changing, say so in one line.`;

export type ReviewResult =
  | { ok: true; review: string; model: string }
  | { ok: false; reason: "refused" | "empty" };

/** Asks Claude to review a commit's message and unified diff. */
export const reviewDiff = async (
  message: string,
  diff: string,
): Promise<ReviewResult> => {
  const stream = getClient().beta.messages.stream({
    model: REVIEW_MODEL,
    max_tokens: 32000,
    // A declined request is re-run server-side on the model Anthropic
    // recommends for that refusal category, instead of coming back refused.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "high" },
    system: REVIEW_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Commit message:\n${message}\n\nDiff:\n${diff}`,
      },
    ],
  });
  const response = await stream.finalMessage();

  if (response.stop_reason === "refusal") return { ok: false, reason: "refused" };

  const review = response.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("\n")
    .trim();
  return review
    ? { ok: true, review, model: response.model }
    : { ok: false, reason: "empty" };
};
