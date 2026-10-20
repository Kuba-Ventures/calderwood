// Upload completeness check. Runs on the parsed result of a master fee upload
// (before the report is generated) and reports what the file has and what it
// is missing for the report to put an exact dollar figure on the gap:
//   - fees for a realistic number of codes,
//   - procedure counts (annual volume per code), and
//   - a per-provider breakdown when the practice has more than one provider.
//
// Never blocks submission. A fee-only file still produces a report; we just
// tell the dentist which totals will be estimated and how to fix the file.

export type CompletenessInput = {
  /** Distinct CDT codes with a usable fee. */
  codeCount: number;
  /** Codes that came with a real annual volume (procedure count). */
  volumeCount: number;
  /** Provider labels seen in the per-provider breakdown (DDS0, HYG2, ...). */
  providerLabels: string[];
  /** Providers the practice told us it has. Unknown when not collected. */
  providerCount?: number;
};

export type ChecklistItemId = "fees" | "counts" | "providers";

export type ChecklistItem = {
  id: ChecklistItemId;
  ok: boolean;
  label: string;
  /** Short result shown on the right of the row ("148 codes", "Not in this file"). */
  value: string;
};

export type CompletenessReport = {
  items: ChecklistItem[];
  /** True when any item is missing. Drives whether the checklist shows. */
  hasGaps: boolean;
  /** Plain-language consequences of the gaps, most important first. */
  consequences: string[];
  /** What to do about it, or null when nothing is missing. */
  fix: string | null;
};

/** Below this share of codes with counts, totals lean mostly on estimates. */
export const PARTIAL_VOLUME_RATIO = 0.5;
/** A real fee schedule lists far more codes than this. */
export const FEW_CODES_THRESHOLD = 10;

const COUNTS_FIX =
  "For exact totals, also add a production report (like a Procedure Summary), or add a Quantity column to your fee file with how many times you did each code last year.";
const PROVIDERS_FIX = "To compare providers, run the export for all providers, not just one.";
const FEW_CODES_FIX = "Check that you uploaded your full fee schedule, not one page.";

export function checkUploadCompleteness(input: CompletenessInput): CompletenessReport {
  const { codeCount, volumeCount, providerLabels, providerCount } = input;
  const items: ChecklistItem[] = [];
  const consequences: string[] = [];
  const fixes: string[] = [];

  if (codeCount <= 0) return { items, hasGaps: false, consequences, fix: null };

  const fewCodes = codeCount < FEW_CODES_THRESHOLD;
  items.push({
    id: "fees",
    ok: !fewCodes,
    label: "Your fees",
    value: fewCodes ? `Only ${codeCount} code${codeCount === 1 ? "" : "s"}` : `${codeCount} codes`,
  });

  const countsOk = volumeCount / codeCount >= PARTIAL_VOLUME_RATIO;
  items.push({
    id: "counts",
    ok: countsOk,
    label: "How often you do each procedure",
    value: volumeCount === 0 ? "Not in this file" : `${volumeCount} of ${codeCount} codes`,
  });
  if (!countsOk) {
    consequences.push(
      volumeCount === 0
        ? "Your dollar totals will be estimates, based on practices your size."
        : "Part of your dollar total will be an estimate, based on practices your size."
    );
    fixes.push(COUNTS_FIX);
  }

  if (providerCount !== undefined && providerCount > 1) {
    const distinct = new Set(providerLabels).size;
    items.push({
      id: "providers",
      ok: distinct >= 2,
      label: "Fees for each provider",
      value: distinct >= 2 ? `${distinct} providers` : distinct === 1 ? "Only one provider" : "Not broken out",
    });
    if (distinct < 2) {
      consequences.push("We can't check whether your providers charge different fees for the same code.");
      fixes.push(PROVIDERS_FIX);
    }
  }

  if (fewCodes) {
    consequences.push("Most fee schedules list 100 or more codes, so your report may miss some.");
    fixes.push(FEW_CODES_FIX);
  }

  const hasGaps = items.some((i) => !i.ok);
  return { items, hasGaps, consequences, fix: fixes.length ? fixes.join(" ") : null };
}

/** Provider labels across a code -> provider -> fee map. */
export function providerLabelsFrom(providerFees: Record<string, Record<string, number>>): string[] {
  const labels = new Set<string>();
  for (const byProvider of Object.values(providerFees)) {
    for (const label of Object.keys(byProvider)) labels.add(label);
  }
  return Array.from(labels);
}
