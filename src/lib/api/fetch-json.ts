export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, init);
  let data: unknown = null;
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        if (!res.ok) throw new ApiError("Request failed");
        throw new ApiError("Unexpected response from server");
      }
    }
  }
  if (!res.ok) {
    const message =
      data && typeof data === "object" && data !== null && "error" in data && data.error
        ? String((data as { error: unknown }).error)
        : "Request failed";
    throw new ApiError(message);
  }
  return data as T;
}
