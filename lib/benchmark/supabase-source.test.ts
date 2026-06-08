import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SupabaseBenchmarkSource,
  SupabaseGeoResolver,
} from "./supabase-source";

// Minimal fake of the Supabase query builder: every filter/order method returns
// the builder; maybeSingle() resolves the canned row for that table.
function fakeClient(tables: Record<string, unknown>): SupabaseClient {
  return {
    from(table: string) {
      const builder: Record<string, unknown> = {};
      for (const m of ["select", "eq", "order", "limit"]) {
        builder[m] = () => builder;
      }
      builder.maybeSingle = () =>
        Promise.resolve({ data: tables[table] ?? null, error: null });
      return builder;
    },
  } as unknown as SupabaseClient;
}

describe("SupabaseGeoResolver", () => {
  it("derives zip3/metro/state/region from the lookup tables", async () => {
    const client = fakeClient({
      zip_to_state: { state_code: "MA" },
      zip_to_metro: { metro_id: "14460" },
      state_to_region: { region: "northeast" },
    });
    const ids = await new SupabaseGeoResolver(client).geoIdsFor("02446");
    expect(ids).toEqual({
      zip3: "024",
      metro: "14460",
      state: "MA",
      region: "northeast",
    });
  });

  it("returns nulls when geo rows are missing (no region without a state)", async () => {
    const ids = await new SupabaseGeoResolver(fakeClient({})).geoIdsFor("99999");
    expect(ids).toEqual({
      zip3: "999",
      metro: null,
      state: null,
      region: null,
    });
  });
});

describe("SupabaseBenchmarkSource", () => {
  it("returns the benchmark row for a (level, geo, code)", async () => {
    const row = {
      geo_level: "zip3",
      geo_id: "024",
      cdt_code: "D2740",
      p50: 1395,
      p75: 1525,
      p90: 1600,
      sample_size: 120,
      source_version: "2026",
    };
    const src = new SupabaseBenchmarkSource(fakeClient({ ucr_benchmarks: row }));
    expect(await src.lookup("zip3", "024", "D2740")).toEqual(row);
  });

  it("returns null when there's no matching row", async () => {
    const src = new SupabaseBenchmarkSource(fakeClient({}));
    expect(await src.lookup("zip3", "024", "D9999")).toBeNull();
  });
});
