// Route-handler guard for /api/agent/*: returns a 401 response unless the
// request carries the agent key in `x-agent-key`, or null to carry on.

import { NextResponse } from "next/server";
import { isAgentKey } from "@/lib/agent/agent-key";

export function agentKeyRejection(request: Request): NextResponse | null {
  if (isAgentKey(request.headers.get("x-agent-key"))) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** One structured log line per write, searchable in Vercel logs as [agent-action]. */
export function logAgentAction(entry: Record<string, unknown>): void {
  console.info("[agent-action]", JSON.stringify({ at: new Date().toISOString(), ...entry }));
}
