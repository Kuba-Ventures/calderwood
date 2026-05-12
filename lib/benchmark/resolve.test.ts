import { describe, expect, it } from "vitest";
import {
  InMemoryBenchmarkSource,
  InMemoryGeoResolver,
  resolveBenchmarkWith,
} from "./resolve";
import { STATE_TO_REGION } from "@/lib/seed/state-to-region";
import { ZIP_TO_METRO, ZIP_TO_STATE } from "@/lib/data/zip-fixtures";
import type { UcrBenchmarkRow } from "@/lib/types/pipeline";

function build(rows: UcrBenchmarkRow[]) {
  const geo = new InMemoryGeoResolver(ZIP_TO_STATE, ZIP_TO_METRO, STATE_TO_REGION);
  const src = new InMemoryBenchmarkSource(rows);
  return resolveBenchmarkWith(src, geo);
}

const baseRow = (
  partial: Partial<UcrBenchmarkRow> & {
    geo_level: UcrBenchmarkRow["geo_level"];
    geo_id: string;
    cdt_code: string;
  }
): UcrBenchmarkRow => ({
  p50: 100,
  p75: 125,
  p90: 150,
  sample_size: 100,
  source_version: "test",
  ...partial,
});

describe("resolveBenchmark cascade", () => {
  it("returns the zip3 row when it exists with sufficient sample", async () => {
    const resolve = build([
      baseRow({ geo_level: "zip3", geo_id: "021", cdt_code: "D1110" }),
    ]);
    const result = await resolve("02115", "D1110");
    expect(result).toMatchObject({
      geoLevelUsed: "zip3",
      confidence: "high",
      p75: 125,
    });
  });

  it("falls through zip3 to metro when zip3 has no data", async () => {
    const resolve = build([
      baseRow({ geo_level: "metro", geo_id: "14460", cdt_code: "D1110" }),
    ]);
    const result = await resolve("02115", "D1110");
    expect(result?.geoLevelUsed).toBe("metro");
    expect(result?.confidence).toBe("high");
  });

  it("falls through to state for a zip without a metro mapping", async () => {
    // Wyoming zip 82001 has no metro entry in the fixture.
    const resolve = build([
      baseRow({ geo_level: "state", geo_id: "WY", cdt_code: "D1110" }),
    ]);
    const result = await resolve("82001", "D1110");
    expect(result?.geoLevelUsed).toBe("state");
    expect(result?.confidence).toBe("medium");
  });

  it("falls through to region when state lacks data", async () => {
    const resolve = build([
      baseRow({ geo_level: "region", geo_id: "West", cdt_code: "D1110" }),
    ]);
    const result = await resolve("82001", "D1110");
    expect(result?.geoLevelUsed).toBe("region");
    expect(result?.confidence).toBe("low");
  });

  it("falls through to national as the last resort", async () => {
    const resolve = build([
      baseRow({ geo_level: "national", geo_id: "US", cdt_code: "D1110" }),
    ]);
    const result = await resolve("82001", "D1110");
    expect(result?.geoLevelUsed).toBe("national");
    expect(result?.confidence).toBe("low");
  });

  it("skips a level whose sample size is below the floor", async () => {
    const resolve = build([
      baseRow({
        geo_level: "zip3",
        geo_id: "021",
        cdt_code: "D1110",
        sample_size: 12, // below SAMPLE_FLOOR
      }),
      baseRow({ geo_level: "state", geo_id: "MA", cdt_code: "D1110" }),
    ]);
    const result = await resolve("02115", "D1110");
    expect(result?.geoLevelUsed).toBe("state");
  });

  it("returns null when no level has data", async () => {
    const resolve = build([]);
    const result = await resolve("02115", "D9999");
    expect(result).toBeNull();
  });

  it("never blends levels: prefers a high-sample lower level over a high-sample upper level", async () => {
    const resolve = build([
      baseRow({ geo_level: "zip3", geo_id: "021", cdt_code: "D1110", p75: 200 }),
      baseRow({ geo_level: "state", geo_id: "MA", cdt_code: "D1110", p75: 100 }),
    ]);
    const result = await resolve("02115", "D1110");
    expect(result?.geoLevelUsed).toBe("zip3");
    expect(result?.p75).toBe(200);
  });
});
