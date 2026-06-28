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
  const data = await res.json();
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data && data.error
        ? String(data.error)
        : "Request failed";
    throw new ApiError(message);
  }
  return data as T;
}
