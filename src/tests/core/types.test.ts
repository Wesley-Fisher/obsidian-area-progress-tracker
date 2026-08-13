import { describe, expect, it } from "vitest";
import { CODE_BLOCK_NAME } from "../../core/types";

describe("core/types", () => {
  it("exports CODE_BLOCK_NAME", () => {
    expect(CODE_BLOCK_NAME).toBe("progress-tracker");
  });
});
