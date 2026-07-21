const DEFAULT_MODEL_HTTP_URL = "http://127.0.0.1:8787";
const DEFAULT_MODEL_HTTP_TIMEOUT_MS = 10000;

export function modelRunnerUrl(path: string) {
  const base = (process.env.MODEL_HTTP_URL ?? DEFAULT_MODEL_HTTP_URL).replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export async function modelRunnerFetch(path: string, init?: RequestInit) {
  const timeoutMs = Number(process.env.MODEL_HTTP_TIMEOUT_MS ?? DEFAULT_MODEL_HTTP_TIMEOUT_MS);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(modelRunnerUrl(path), {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function jsonResponse(payload: unknown, init?: ResponseInit) {
  return Response.json(payload, {
    headers: {
      "Cache-Control": "no-store",
      ...(init?.headers ?? {}),
    },
    status: init?.status,
    statusText: init?.statusText,
  });
}
