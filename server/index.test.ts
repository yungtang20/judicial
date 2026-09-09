import { describe, expect, it } from "vitest";
import { createExpressApp } from "./index";

describe("Express proxy security", () => {
  it("does not trust arbitrary client-supplied proxy chains", () => {
    const app = createExpressApp();

    expect(app.get("trust proxy")).toBe(1);
  });

  it("uses the simple URL-encoded parser instead of expanding nested qs keys", () => {
    const app = createExpressApp();
    const parser = app.get("query parser fn") as (query: string) => Record<string, unknown>;

    expect(parser("filters%5BtenantId%5D=other-tenant")).toEqual({
      "filters[tenantId]": "other-tenant"
    });
  });
});
