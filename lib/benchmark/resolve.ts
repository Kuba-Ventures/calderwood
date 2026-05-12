// resolveBenchmark cascades through geo levels: zip3 → metro → state →
// region → national. Levels with sample_size < 30 are skipped; the cascade
// falls through to the next level. The function never averages or blends
// across levels — it picks one level per code, end of story.
//
// The function is parameterized over a BenchmarkSource so unit tests can
// inject fixture data and production can wire in Supabase.

import {
  Benchmark,
  BenchmarkConfidence,
  GeoLevel,
  UcrBenchmarkRow,
} from "@/lib/types/pipeline";

const SAMPLE_FLOOR = 30;
const CASCADE: GeoLevel[] = ["zip3", "metro", "state", "region", "national"];

const CONFIDENCE_BY_LEVEL: Record<GeoLevel, BenchmarkConfidence> = {
  zip3: "high",
  metro: "high",
  state: "medium",
  region: "low",
  national: "low",
};

export type GeoIds = {
  zip3: string;
  metro: string | null;
  state: string | null;
  region: string | null;
};

export interface BenchmarkSource {
  /** Look up the benchmark row for a single (level, geoId, code). */
  lookup(
    level: GeoLevel,
    geoId: string,
    cdtCode: string
  ): Promise<UcrBenchmarkRow | null>;
}

export interface GeoResolver {
  /** Derive the geo identifiers we need from a zip5. */
  geoIdsFor(zip5: string): Promise<GeoIds>;
}

export function resolveBenchmarkWith(
  source: BenchmarkSource,
  geo: GeoResolver
) {
  return async function resolveBenchmark(
    zip5: string,
    cdtCode: string
  ): Promise<Benchmark | null> {
    const ids = await geo.geoIdsFor(zip5);

    for (const level of CASCADE) {
      const geoId = geoIdFor(level, zip5, ids);
      if (!geoId) continue;
      const row = await source.lookup(level, geoId, cdtCode);
      if (!row) continue;
      if (row.sample_size < SAMPLE_FLOOR) continue;
      return {
        p50: row.p50,
        p75: row.p75,
        p90: row.p90,
        geoLevelUsed: level,
        sampleSize: row.sample_size,
        confidence: CONFIDENCE_BY_LEVEL[level],
      };
    }
    return null;
  };
}

function geoIdFor(level: GeoLevel, zip5: string, ids: GeoIds): string | null {
  switch (level) {
    case "zip3":
      return zip5.slice(0, 3);
    case "metro":
      return ids.metro;
    case "state":
      return ids.state;
    case "region":
      return ids.region;
    case "national":
      return "US";
  }
}

// ============================================================
// In-memory implementations for tests and dev.
// ============================================================

export class InMemoryBenchmarkSource implements BenchmarkSource {
  private rows: UcrBenchmarkRow[];

  constructor(rows: UcrBenchmarkRow[]) {
    this.rows = rows;
  }

  async lookup(
    level: GeoLevel,
    geoId: string,
    cdtCode: string
  ): Promise<UcrBenchmarkRow | null> {
    return (
      this.rows.find(
        (r) =>
          r.geo_level === level && r.geo_id === geoId && r.cdt_code === cdtCode
      ) ?? null
    );
  }
}

export class InMemoryGeoResolver implements GeoResolver {
  constructor(
    private readonly zipToState: Record<string, string>,
    private readonly zipToMetro: Record<string, string>,
    private readonly stateToRegion: Record<string, string>
  ) {}

  async geoIdsFor(zip5: string): Promise<GeoIds> {
    const state = this.zipToState[zip5] ?? null;
    return {
      zip3: zip5.slice(0, 3),
      metro: this.zipToMetro[zip5] ?? null,
      state,
      region: state ? this.stateToRegion[state] ?? null : null,
    };
  }
}
