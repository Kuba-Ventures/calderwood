import { describe, expect, it } from "vitest";
import { isRootRecoveryHit, RESET_PASSWORD_PATH } from "./recovery-redirect";

describe("isRootRecoveryHit", () => {
  it("matches a recovery code that landed on the site root", () => {
    const params = new URLSearchParams("code=d07d60e5-1234-04944bf1c9d2");
    expect(isRootRecoveryHit("/", params)).toBe(true);
  });

  it("ignores the root with no code", () => {
    expect(isRootRecoveryHit("/", new URLSearchParams())).toBe(false);
  });

  it("ignores a code on any non-root path (already on reset-password)", () => {
    const params = new URLSearchParams("code=abc");
    expect(isRootRecoveryHit(RESET_PASSWORD_PATH, params)).toBe(false);
    expect(isRootRecoveryHit("/login", params)).toBe(false);
  });

  it("does not match unrelated root query params", () => {
    expect(isRootRecoveryHit("/", new URLSearchParams("utm_source=email"))).toBe(
      false
    );
  });
});
