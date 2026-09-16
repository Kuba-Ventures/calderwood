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
    if (level === "zip5") return this.lookupZip5(geoId, cdtCode);

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

  // zip5 has no stored percentile row: NDAS ships a national percentile per
  // code plus a per-zip5 geo_factor. Multiply the two at lookup time instead
  // of materializing every (zip5, code) pair.
  private async lookupZip5(
    zip5: string,
    cdtCode: string
  ): Promise<UcrBenchmarkRow | null> {
    const [nationalRes, factorRes] = await Promise.all([
      this.sb
        .from("ucr_benchmarks")
        .select(
          "geo_level, geo_id, cdt_code, p50, p75, p90, sample_size, source_version"
        )
        .eq("geo_level", "national")
        .eq("geo_id", "US")
        .eq("cdt_code", cdtCode)
        .order("source_version", { ascending: false })
        .limit(1)
        .maybeSingle(),
      this.sb
        .from("zip_geo_factors")
        .select("geo_factor, source_version")
        .eq("zip5", zip5)
        .maybeSingle(),
    ]);
    if (nationalRes.error) throw nationalRes.error;
    if (factorRes.error) throw factorRes.error;

    const national = nationalRes.data as UcrBenchmarkRow | null;
    const factor = factorRes.data as { geo_factor: number; source_version: string } | null;
    if (!national || !factor) return null;

    return {
      geo_level: "zip5",
      geo_id: zip5,
      cdt_code: cdtCode,
      p50: national.p50 * factor.geo_factor,
      p75: national.p75 * factor.geo_factor,
      p90: national.p90 * factor.geo_factor,
      sample_size: national.sample_size,
      source_version: national.source_version,
    };
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
