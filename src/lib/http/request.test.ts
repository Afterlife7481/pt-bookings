import { describe, expect, it } from "vitest";
import { getRequestIp } from "@/lib/http/request";

function req(headers: Record<string, string>) {
  return new Request("http://localhost/api", { headers });
}

describe("getRequestIp", () => {
  it("uses the rightmost X-Forwarded-For hop (trusted proxy append)", () => {
    expect(
      getRequestIp(req({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" })),
    ).toBe("10.0.0.1");
  });

  it("falls back to x-real-ip", () => {
    expect(getRequestIp(req({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
  });

  it("returns unknown when no IP headers are present", () => {
    expect(getRequestIp(req({}))).toBe("unknown");
  });
});
