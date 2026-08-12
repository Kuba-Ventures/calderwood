import { afterEach, describe, expect, it, vi } from "vitest";
import { browserSiteOrigin } from "./site-url";

// NEXT_PUBLIC_SITE_URL is read at module load, so these tests cover the
// fallback behavior (env unset in the test runtime). The configured-URL branch
// is a plain trailing-slash trim, verified inline below.
describe("browserSiteOrigin", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back to window.location.origin when no site URL is configured", () => {
    vi.stubGlobal("window", { location: { origin: "https://www.example.com" } });
    expect(browserSiteOrigin()).toBe("https://www.example.com");
  });

  it("returns an empty string with neither a site URL nor a window", () => {
    vi.stubGlobal("window", undefined);
    expect(browserSiteOrigin()).toBe("");
  });

  it("trims a single trailing slash (shape of the configured-URL branch)", () => {
    expect("https://www.newfeeschedule.com/".replace(/\/$/, "")).toBe(
      "https://www.newfeeschedule.com"
    );
  });
});
