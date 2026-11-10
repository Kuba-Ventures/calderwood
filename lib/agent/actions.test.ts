import { describe, expect, it } from "vitest";
import {
  isPracticeId,
  isPromoCodeId,
  parsePromoCodeCreate,
  parsePromoCodeUpdate,
  parseRefund,
} from "./actions";
import { isAgentKey } from "./agent-key";

const ok = { approval: "thread/msg", reason: "Founding practice in Newport" };
const NOW = new Date("2026-11-09T12:00:00Z");

describe("isAgentKey", () => {
  it("is off when AGENT_KEY is unset", () => {
    expect(isAgentKey("anything", {})).toBe(false);
    expect(isAgentKey("", { AGENT_KEY: "" })).toBe(false);
  });
  it("matches only the exact key", () => {
    const env = { AGENT_KEY: "s3cret" };
    expect(isAgentKey("s3cret", env)).toBe(true);
    expect(isAgentKey("s3cre", env)).toBe(false);
    expect(isAgentKey(null, env)).toBe(false);
    expect(isAgentKey(undefined, env)).toBe(false);
  });
  it("never accepts the admin password", () => {
    expect(isAgentKey("admin-pw", { AGENT_KEY: "agent", ADMIN_PASSWORD: "admin-pw" })).toBe(false);
  });
});

describe("parsePromoCodeUpdate", () => {
  it("turns a code on or off", () => {
    expect(parsePromoCodeUpdate({ ...ok, changes: { active: false } })).toEqual({ ...ok, updates: { active: false } });
    expect(parsePromoCodeUpdate({ ...ok, changes: { active: true } })).toEqual({ ...ok, updates: { active: true } });
  });
  it("refuses other fields by name", () => {
    for (const field of ["code", "coupon", "percent_off", "max_redemptions", "metadata", "customer"]) {
      expect((parsePromoCodeUpdate({ ...ok, changes: { [field]: 1 } }) as { error: string }).error).toMatch(
        new RegExp(`${field} can't be changed`)
      );
    }
  });
  it("refuses bad values and empty changes", () => {
    expect((parsePromoCodeUpdate({ ...ok, changes: { active: "no" } }) as { error: string }).error).toMatch(/active/);
    expect((parsePromoCodeUpdate({ ...ok, changes: {} }) as { error: string }).error).toMatch(/Nothing/);
    expect((parsePromoCodeUpdate({ ...ok, changes: [] }) as { error: string }).error).toMatch(/changes/);
    expect((parsePromoCodeUpdate(null) as { error: string }).error).toMatch(/JSON/);
  });
  it("requires approval and reason", () => {
    expect((parsePromoCodeUpdate({ reason: "x", changes: { active: false } }) as { error: string }).error).toMatch(/approval/);
    expect((parsePromoCodeUpdate({ approval: "a", changes: { active: false } }) as { error: string }).error).toMatch(/reason/);
    expect((parsePromoCodeUpdate({ approval: "  ", reason: "x", changes: { active: false } }) as { error: string }).error).toMatch(/approval/);
  });
});

describe("parsePromoCodeCreate", () => {
  it("accepts a code on an existing coupon, uppercased", () => {
    expect(parsePromoCodeCreate({ ...ok, code: "founding7", couponId: "FOUNDING100", maxRedemptions: 1, expiresAt: "2026-12-31T00:00:00Z" }, NOW)).toEqual({
      ...ok,
      code: "FOUNDING7",
      couponId: "FOUNDING100",
      maxRedemptions: 1,
      expiresAt: new Date("2026-12-31T00:00:00Z"),
    });
    expect(parsePromoCodeCreate({ ...ok, code: "DRSMITH", couponId: "abc123" }, NOW)).toMatchObject({ maxRedemptions: null, expiresAt: null });
  });
  it("refuses coupon terms and unknown keys", () => {
    for (const key of ["percentOff", "amountOff", "coupon", "customer", "restrictions"]) {
      expect((parsePromoCodeCreate({ ...ok, code: "OK123", couponId: "c", [key]: 100 }, NOW) as { error: string }).error).toMatch(
        new RegExp(`${key} can't be set`)
      );
    }
  });
  it("refuses bad values", () => {
    const base = { ...ok, code: "OK123", couponId: "c" };
    expect((parsePromoCodeCreate({ ...base, code: "a b" }, NOW) as { error: string }).error).toMatch(/code/);
    expect((parsePromoCodeCreate({ ...base, code: "AB" }, NOW) as { error: string }).error).toMatch(/code/);
    expect((parsePromoCodeCreate({ ...base, couponId: "" }, NOW) as { error: string }).error).toMatch(/couponId/);
    expect((parsePromoCodeCreate({ ...base, maxRedemptions: 0 }, NOW) as { error: string }).error).toMatch(/maxRedemptions/);
    expect((parsePromoCodeCreate({ ...base, maxRedemptions: 1.5 }, NOW) as { error: string }).error).toMatch(/maxRedemptions/);
    expect((parsePromoCodeCreate({ ...base, expiresAt: "soon" }, NOW) as { error: string }).error).toMatch(/expiresAt/);
    expect((parsePromoCodeCreate({ ...base, expiresAt: "2026-01-01" }, NOW) as { error: string }).error).toMatch(/future/);
  });
  it("requires approval and reason", () => {
    expect((parsePromoCodeCreate({ reason: "x", code: "OK123", couponId: "c" }, NOW) as { error: string }).error).toMatch(/approval/);
    expect((parsePromoCodeCreate({ approval: "a", code: "OK123", couponId: "c" }, NOW) as { error: string }).error).toMatch(/reason/);
  });
});

describe("parseRefund", () => {
  it("full refund when amountCents is left out", () => {
    expect(parseRefund({ ...ok }, 19900)).toEqual({ ...ok, amountCents: null });
  });
  it("partial refund in cents up to the price paid", () => {
    expect(parseRefund({ ...ok, amountCents: 9950 }, 19900)).toMatchObject({ amountCents: 9950 });
    expect(parseRefund({ ...ok, amountCents: 19900 }, 19900)).toMatchObject({ amountCents: 19900 });
  });
  it("refuses bad amounts", () => {
    for (const amountCents of [0, -1, 199.5, "19900", 19901]) {
      expect((parseRefund({ ...ok, amountCents }, 19900) as { error: string }).error).toMatch(/amountCents/);
    }
  });
  it("requires approval and reason", () => {
    expect((parseRefund({ reason: "x" }, 19900) as { error: string }).error).toMatch(/approval/);
    expect((parseRefund({ approval: "a" }, 19900) as { error: string }).error).toMatch(/reason/);
  });
});

describe("id guards", () => {
  it("accepts only uuids and promo_ ids", () => {
    expect(isPracticeId("3f2b1c4d-1111-4222-8333-444455556666")).toBe(true);
    expect(isPracticeId("1 or 1=1")).toBe(false);
    expect(isPromoCodeId("promo_1AbC")).toBe(true);
    expect(isPromoCodeId("coupon_1")).toBe(false);
  });
});
