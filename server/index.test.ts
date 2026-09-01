import { describe, expect, it } from "vitest";
import { createExpressApp } from "./index";

describe("Express proxy security", () => {
  it("does not trust arbitrary client-supplied proxy chains", () => {
    const app = createExpressApp();

    expect(app.get("trust proxy")).toBe(1);
  });
});
