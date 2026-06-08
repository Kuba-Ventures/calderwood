// Production wiring for the benchmark resolver. Mirrors the in-memory
// implementations in resolve.ts but reads the live Supabase lookup tables
// (ucr_benchmarks + zip_to_state / zip_to_metro / state_to_region).
//
// Use resolveForZip(sb) to get a resolveBenchmark(zip5, code) function ready to
// hand to compute(). The geo ids for one practice ZIP are fetched once and
// cached for the lifetime of the resolver, so a full report does N benchmark
// lookups + 1 geo lookup rather than N of each.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { GeoLevel, UcrBenchmarkRow } from "@/lib/types/pipeline";
import {
  BenchmarkSource,
  GeoIds,
  GeoResolver,
  resolveBenchmarkWith,
} from "@/lib/benchmark/resolve";

export class SupabaseBenchmarkSource implements BenchmarkSource {
  constructor(private readonly sb: SupabaseClient) {}

  async lookup(
    level: GeoLevel,
    geoId: string,
    cdtCode: string
  ): Promise<UcrBenchmarkRow | null> {
    const { data, error } = await this.sb
      .from("ucr_benchmarks")
      .select(
        "geo_level, geo_id, cdt_code, p50, p75, p90, sample_size, source_version"
      )
      .eq("geo_level", level)
      .eq("geo_id", geoId)
      .eq("cdt_code", cdtCode)
      // Newest dataset first, then the most-sampled row, so coverage wins ties.
      .order("source_version", { ascending: false })
      .order("sample_size", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as UcrBenchmarkRow | null) ?? null;
  }
}

export class SupabaseGeoResolver implements GeoResolver {
  constructor(private readonly sb: SupabaseClient) {}

  async geoIdsFor(zip5: string): Promise<GeoIds> {
    const [stateRes, metroRes] = await Promise.all([
      this.sb
        .from("zip_to_state")
        .select("state_code")
        .eq("zip5", zip5)
        .maybeSingle(),
      this.sb
        .from("zip_to_metro")
        .select("metro_id")
        .eq("zip5", zip5)
        .maybeSingle(),
    ]);
    if (stateRes.error) throw stateRes.error;
    if (metroRes.error) throw metroRes.error;

    const state = (stateRes.data?.state_code as string | undefined) ?? null;
    let region: string | null = null;
    if (state) {
      const regionRes = await this.sb
        .from("state_to_region")
        .select("region")
        .eq("state_code", state)
        .maybeSingle();
      if (regionRes.error) throw regionRes.error;
      region = (regionRes.data?.region as string | undefined) ?? null;
    }

    return {
      zip3: zip5.slice(0, 3),
      metro: (metroRes.data?.metro_id as string | undefined) ?? null,
      state,
      region,
    };
  }
}

/** Build a resolveBenchmark(zip5, code) backed by live Supabase data. */
export function resolveForZip(sb: SupabaseClient) {
  return resolveBenchmarkWith(
    new SupabaseBenchmarkSource(sb),
    new SupabaseGeoResolver(sb)
  );
}
