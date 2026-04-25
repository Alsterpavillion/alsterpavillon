import { describe, it, expect } from "vitest";
import { checkRateLimit } from "../index";

describe("checkRateLimit (M0 stub)", () => {
  it("fails closed — throws until backend is wired", async () => {
    await expect(checkRateLimit({ bucket: "auth.login", identifier: "127.0.0.1" })).rejects.toThrow(
      /rate-limit backend not implemented/,
    );
  });
});
