import { jsonResponse, modelRunnerFetch } from "../_runner";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let requestId: string | null = null;
  try {
    const body = await request.json();
    requestId = typeof body?.requestId === "string" ? body.requestId : null;
    const response = await modelRunnerFetch("/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    return jsonResponse(payload ?? { type: "error", error: "Model runner returned invalid JSON.", requestId }, {
      status: response.status,
    });
  } catch (error) {
    return jsonResponse(
      {
        type: "error",
        error: error instanceof Error ? error.message : "Model runner unavailable.",
        requestId,
      },
      { status: 502 },
    );
  }
}
