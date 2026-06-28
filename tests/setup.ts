import { beforeEach } from "vitest";
import { resetRateLimitsForTests } from "@/lib/rate-limit";

beforeEach(() => {
  resetRateLimitsForTests();
});
