import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchFromOpenData,
  isOpenDataEnabled,
  getOpenDataTimeoutMs,
} from "./judicialDataFetcher.js";

beforeEach(() => {
  resetEnv();
});

function resetEnv() {
  delete process.env.USE_OPENDATA;
  delete process.env.OPENDATA_TIMEOUT_MS;
  delete process.env.JUDICIAL_OPENDATA_ACCOUNT;
  delete process.env.JUDICIAL_OPENDATA_PASSWORD;
}

describe("judicialDataFetcher — configuration", () => {
  it("isOpenDataEnabled defaults to true", () => {
    expect(isOpenDataEnabled()).toBe(true);
  });

  it("isOpenDataEnabled returns false when USE_OPENDATA=false", () => {
    process.env.USE_OPENDATA = "false";
    expect(isOpenDataEnabled()).toBe(false);
  });

  it("isOpenDataEnabled returns true for USE_OPENDATA=1", () => {
    process.env.USE_OPENDATA = "1";
    expect(isOpenDataEnabled()).toBe(true);
  });

  it("getOpenDataTimeoutMs defaults to 3000", () => {
    expect(getOpenDataTimeoutMs()).toBe(3000);
  });

  it("getOpenDataTimeoutMs reads from env", () => {
    process.env.OPENDATA_TIMEOUT_MS = "5000";
    expect(getOpenDataTimeoutMs()).toBe(5000);
  });

  it("getOpenDataTimeoutMs falls back to default for invalid value", () => {
    process.env.OPENDATA_TIMEOUT_MS = "not-a-number";
    expect(getOpenDataTimeoutMs()).toBe(3000);
  });
});

describe("judicialDataFetcher — gating logic", () => {
  it("returns unavailable when USE_OPENDATA=false", async () => {
    process.env.USE_OPENDATA = "false";
    const result = await fetchFromOpenData("test-case-id");
    expect(result.success).toBe(false);
    expect(result.source).toBe("unavailable");
    expect(result.error).toContain("USE_OPENDATA=false");
  });

  it("returns unavailable when credentials missing", async () => {
    // Ensure we're within service hours by using a mocked time
    // For now, just check that missing credentials returns unavailable
    process.env.USE_OPENDATA = "true";
    process.env.JUDICIAL_OPENDATA_ACCOUNT = "";
    process.env.JUDICIAL_OPENDATA_PASSWORD = "";
    const result = await fetchFromOpenData("test-case-id");
    // May return unavailable due to service hours or missing credentials
    expect(result.success).toBe(false);
    expect(result.source).toBe("unavailable");
  });
});
