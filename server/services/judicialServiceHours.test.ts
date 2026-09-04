import { describe, it, expect } from "vitest";
import { isWithinServiceHours } from "./judicialServiceHours.js";

describe("judicialServiceHours", () => {
  it("returns withinHours=true for hour 0 (midnight)", () => {
    const fixed = new Date("2025-03-15T00:30:00+08:00");
    const result = isWithinServiceHours(fixed);
    expect(result.withinHours).toBe(true);
    expect(result.currentHour).toBe(0);
  });

  it("returns withinHours=true for hour 5 (5:59 AM)", () => {
    const fixed = new Date("2025-03-15T05:59:00+08:00");
    const result = isWithinServiceHours(fixed);
    expect(result.withinHours).toBe(true);
    expect(result.currentHour).toBe(5);
  });

  it("returns withinHours=false for hour 6 (6:00 AM)", () => {
    const fixed = new Date("2025-03-15T06:00:00+08:00");
    const result = isWithinServiceHours(fixed);
    expect(result.withinHours).toBe(false);
    expect(result.currentHour).toBe(6);
  });

  it("returns withinHours=false for hour 23 (11 PM)", () => {
    const fixed = new Date("2025-03-15T23:00:00+08:00");
    const result = isWithinServiceHours(fixed);
    expect(result.withinHours).toBe(false);
    expect(result.currentHour).toBe(23);
  });

  it("returns withinHours=false for hour 12 (noon)", () => {
    const fixed = new Date("2025-03-15T12:00:00+08:00");
    const result = isWithinServiceHours(fixed);
    expect(result.withinHours).toBe(false);
    expect(result.currentHour).toBe(12);
  });

  it("reason string includes current hour in Traditional Chinese", () => {
    const fixed = new Date("2025-03-15T03:00:00+08:00");
    const result = isWithinServiceHours(fixed);
    expect(result.reason).toContain("台北時間 3:00");
    expect(result.reason).toContain("服務時段內");
  });

  it("reason string indicates outside hours when not within window", () => {
    const fixed = new Date("2025-03-15T10:00:00+08:00");
    const result = isWithinServiceHours(fixed);
    expect(result.reason).toContain("服務時段外");
  });
});
