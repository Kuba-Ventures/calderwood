// Live checks for the AI services the app calls at runtime.
//
// Anthropic has no API for remaining prepaid credit, so the only reliable
// signal is a tiny real request with the production key. A one-token Haiku
// call costs a fraction of a cent and fails the same way the PDF parser would
// (out of credits, revoked key, outage).
//
// The classifiers are pure so they can be unit tested without the network.

export type AiServiceName = "claude";

export const allAiServiceNames: AiServiceName[] = ["claude"];

export type AiServiceStatus = "working" | "down" | "unknown";

export type AiServiceFailureKind =
  | "out_of_credits"
  | "out_of_quota"
  | "key_rejected"
  | "key_not_allowed"
  | "rate_limited"
  | "provider_outage"
  | "unreachable"
  | "unexpected_response"
  | "not_configured"
  | "cannot_check";

export type AiServiceCheckResult = {
  service: AiServiceName;
  status: AiServiceStatus;
  failureKind: AiServiceFailureKind | null;
  failureDetail: string | null;
  latencyMilliseconds: number | null;
};

const CHECK_TIMEOUT_MS = 15_000;
const CLAUDE_PROBE_MODEL = "claude-haiku-5-5";

export type AnthropicErrorBody = { error?: { type?: string; message?: string } };

export function classifyAnthropicFailure(
  httpStatus: number,
  errorBody: AnthropicErrorBody | null
): AiServiceFailureKind {
  const errorType = errorBody?.error?.type ?? "";
  const errorMessage = (errorBody?.error?.message ?? "").toLowerCase();
  // Anthropic reports an empty prepaid balance as a 400 invalid_request_error
  // whose message mentions the credit balance, so check the message first.
  if (errorMessage.includes("credit balance")) return "out_of_credits";
  if (httpStatus === 401 || errorType === "authentication_error") return "key_rejected";
  if (httpStatus === 403 || errorType === "permission_error") return "key_not_allowed";
  if (httpStatus === 429 || errorType === "rate_limit_error") return "rate_limited";
  if (httpStatus >= 500 || errorType === "overloaded_error" || errorType === "api_error") {
    return "provider_outage";
  }
  return "unexpected_response";
}

function failureDetailFrom(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 200) : "request failed";
}

async function parseJsonOrNull<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function checkClaude(
  apiKey = process.env.ANTHROPIC_API_KEY,
  fetchImpl: typeof fetch = fetch
): Promise<AiServiceCheckResult> {
  if (!apiKey) {
    return {
      service: "claude",
      status: "unknown",
      failureKind: "not_configured",
      failureDetail: "ANTHROPIC_API_KEY is not set",
      latencyMilliseconds: null,
    };
  }
  const startedAt = Date.now();
  try {
    const response = await fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: CLAUDE_PROBE_MODEL,
        max_tokens: 1,
        messages: [{ role: "user", content: "ok" }],
      }),
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });
    const latencyMilliseconds = Date.now() - startedAt;
    if (response.ok) {
      return { service: "claude", status: "working", failureKind: null, failureDetail: null, latencyMilliseconds };
    }
    const errorBody = await parseJsonOrNull<AnthropicErrorBody>(response);
    return {
      service: "claude",
      status: "down",
      failureKind: classifyAnthropicFailure(response.status, errorBody),
      failureDetail: `${response.status}: ${(errorBody?.error?.message ?? "no message").slice(0, 200)}`,
      latencyMilliseconds,
    };
  } catch (error) {
    return {
      service: "claude",
      status: "down",
      failureKind: "unreachable",
      failureDetail: failureDetailFrom(error),
      latencyMilliseconds: Date.now() - startedAt,
    };
  }
}

export async function checkAllAiServices(): Promise<AiServiceCheckResult[]> {
  return Promise.all([checkClaude()]);
}
