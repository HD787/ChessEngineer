import { jsonResponse, modelRunnerFetch } from "../_runner";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await modelRunnerFetch("/models", { cache: "no-store" });
    const payload = await response.json().catch(() => null);
    return jsonResponse(payload ?? { type: "error", error: "Model runner returned invalid JSON." }, {
      status: response.status,
    });
  } catch (error) {
    return jsonResponse(
      {
        type: "error",
        error: error instanceof Error ? error.message : "Model runner unavailable.",
      },
      { status: 502 },
    );
  }
}
