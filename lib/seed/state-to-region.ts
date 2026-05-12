// US Census Bureau four-region definition (Northeast, Midwest, South, West).

export const STATE_TO_REGION: Record<string, string> = {
  // Northeast
  CT: "Northeast", ME: "Northeast", MA: "Northeast", NH: "Northeast",
  NJ: "Northeast", NY: "Northeast", PA: "Northeast", RI: "Northeast",
  VT: "Northeast",
  // Midwest
  IL: "Midwest", IN: "Midwest", IA: "Midwest", KS: "Midwest", MI: "Midwest",
  MN: "Midwest", MO: "Midwest", NE: "Midwest", ND: "Midwest", OH: "Midwest",
  SD: "Midwest", WI: "Midwest",
  // South
  AL: "South", AR: "South", DE: "South", DC: "South", FL: "South",
  GA: "South", KY: "South", LA: "South", MD: "South", MS: "South",
  NC: "South", OK: "South", SC: "South", TN: "South", TX: "South",
  VA: "South", WV: "South",
  // West
  AK: "West", AZ: "West", CA: "West", CO: "West", HI: "West", ID: "West",
  MT: "West", NV: "West", NM: "West", OR: "West", UT: "West", WA: "West",
  WY: "West",
};
