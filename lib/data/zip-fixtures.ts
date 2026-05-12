// Hand-curated zip lookup fixture for dev and tests. Spans multiple regions
// so the benchmark cascade has real data to work with. Run
// `npm run load:zcta -- --source <census.csv>` to replace these with the
// full Census ZCTA-to-CBSA crosswalk in production.

import type { Carrier } from "@/lib/types/pipeline";

export const ZIP_TO_STATE: Record<string, string> = {
  // Massachusetts (Boston metro)
  "02115": "MA", "02116": "MA", "02118": "MA", "02446": "MA",
  // New York (NYC metro)
  "10001": "NY", "10002": "NY", "10003": "NY", "11201": "NY",
  // California (SF metro)
  "94102": "CA", "94103": "CA", "94110": "CA", "94114": "CA",
  // California (LA metro)
  "90001": "CA", "90210": "CA", "90291": "CA",
  // Illinois (Chicago metro)
  "60601": "IL", "60614": "IL",
  // Texas (Austin)
  "78701": "TX", "78702": "TX",
  // Texas (Houston)
  "77001": "TX", "77002": "TX",
  // Colorado (Denver)
  "80201": "CO", "80202": "CO",
  // Washington (Seattle)
  "98101": "WA", "98109": "WA",
  // Florida (Miami)
  "33101": "FL", "33139": "FL",
  // Rural fallback example (Wyoming)
  "82001": "WY", "82601": "WY",
};

// CBSA codes from Census 2020 OMB delineations.
export const ZIP_TO_METRO: Record<string, string> = {
  // Boston-Cambridge-Newton MSA: 14460
  "02115": "14460", "02116": "14460", "02118": "14460", "02446": "14460",
  // New York-Newark-Jersey City MSA: 35620
  "10001": "35620", "10002": "35620", "10003": "35620", "11201": "35620",
  // San Francisco-Oakland-Berkeley MSA: 41860
  "94102": "41860", "94103": "41860", "94110": "41860", "94114": "41860",
  // Los Angeles-Long Beach-Anaheim MSA: 31080
  "90001": "31080", "90210": "31080", "90291": "31080",
  // Chicago-Naperville-Elgin MSA: 16980
  "60601": "16980", "60614": "16980",
  // Austin-Round Rock-Georgetown MSA: 12420
  "78701": "12420", "78702": "12420",
  // Houston-The Woodlands-Sugar Land MSA: 26420
  "77001": "26420", "77002": "26420",
  // Denver-Aurora-Lakewood MSA: 19740
  "80201": "19740", "80202": "19740",
  // Seattle-Tacoma-Bellevue MSA: 42660
  "98101": "42660", "98109": "42660",
  // Miami-Fort Lauderdale-Pompano Beach MSA: 33100
  "33101": "33100", "33139": "33100",
  // Wyoming non-metro zips intentionally absent — tests rely on the cascade
  // dropping to state.
};

export const KNOWN_CARRIERS: Carrier[] = [
  "Delta",
  "Aetna",
  "Cigna",
  "MetLife",
  "UnitedHealthcare",
  "Guardian",
  "BCBS",
  "Humana",
  "Other",
];
