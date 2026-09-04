import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isCircuitOpen,
  recordFailure,
  recordSuccess,
  resetCircuitBreaker,
} from "./judicialAuthService.js";

beforeEach(() => {
  resetCircuitBreaker();
});

describe("judicialAuthService — circuit breaker", () => {
  it("circuit is closed initially", () => {
    expect(isCircuitOpen()).toBe(false);
  });

  it("stays closed after fewer than 5 failures", () => {
    for (let i = 0; i < 4; i++) recordFailure();
    expect(isCircuitOpen()).toBe(false);
  });

  it("opens after exactly 5 consecutive failures", () => {
    for (let i = 0; i < 5; i++) recordFailure();
    expect(isCircuitOpen()).toBe(true);
  });

  it("resets counter on success", () => {
    for (let i = 0; i < 4; i++) recordFailure();
    recordSuccess();
    for (let i = 0; i < 4; i++) recordFailure();
    expect(isCircuitOpen()).toBe(false);
  });

  it("getAuthToken returns null when circuit is open", async () => {
    for (let i = 0; i < 5; i++) recordFailure();
    const token = await getAuthTokenForTest();
    expect(token).toBeNull();
  });

  it("getAuthToken returns null when credentials missing", async () => {
    delete process.env.JUDICIAL_OPENDATA_ACCOUNT;
    delete process.env.JUDICIAL_OPENDATA_PASSWORD;
    const token = await getAuthTokenForTest();
    expect(token).toBeNull();
  });
});

// Helper: import the actual function
async function getAuthTokenForTest(): Promise<string | null> {
  // Dynamic import to get the real function
  const mod = await import("./judicialAuthService.js");
  return mod.getAuthToken("test_user", "test_pass");
}
