// Combine several uploaded fee files into the one master schedule the report
// is built from. A practice might send its office fee schedule plus a
// production report per provider, or one export per location.
//
// Rules:
//   - Procedure counts add up across files (per-provider / per-location
//     exports each hold part of the year's volume).
//   - Fee per code comes from the first file that lists it, but fee-schedule
//     files (CSV / Excel) win over production reports (PDF): a production
//     report's "Average $" is after insurance discounts and understates fees.
//   - A file whose contents match an earlier file exactly is a duplicate. It
//     is left out entirely so nothing is counted twice, and flagged.
//   - Per-provider fees merge by provider label; the first file wins a clash.
//
// Review edits (from the review table) are applied on top with applyEdits so
// adding or removing a file never throws away the dentist's corrections.

export type UploadKind = "csv" | "xlsx" | "pdf";

export type MergeSource = {
  id: string;
  name: string;
  kind: UploadKind;
  rows: Array<{ code: string; fee: string | number }>;
  volumes: Record<string, number>;
  providerFees: Record<string, Record<string, number>>;
};

export type MergedRow = { code: string; fee: string };

export type MergeResult = {
  rows: MergedRow[];
  frequencies: Record<string, number>;
  providerFees: Record<string, Record<string, number>>;
  /** Duplicate file id -> id of the earlier file it matches. */
  duplicateOf: Record<string, string>;
  /** True when no CSV/Excel fee schedule supplied any fee. */
  feesFromReportsOnly: boolean;
};

const isSchedule = (k: UploadKind) => k === "csv" || k === "xlsx";

/** Content signature, independent of file name and row order. */
export function fingerprint(src: Pick<MergeSource, "rows" | "volumes">): string {
  return src.rows
    .map((r) => `${r.code.toUpperCase()}:${Number(r.fee)}:${src.volumes[r.code] ?? 0}`)
    .sort()
    .join("|");
}

export function mergeUploads(sources: MergeSource[]): MergeResult {
  const duplicateOf: Record<string, string> = {};
  const seen = new Map<string, string>();
  const unique: MergeSource[] = [];
  for (const src of sources) {
    const fp = fingerprint(src);
    const first = seen.get(fp);
    if (first !== undefined && fp !== "") {
      duplicateOf[src.id] = first;
      continue;
    }
    seen.set(fp, src.id);
    unique.push(src);
  }

  // Fee precedence: schedules first, then reports, each in upload order.
  const byPrecedence = [
    ...unique.filter((s) => isSchedule(s.kind)),
    ...unique.filter((s) => !isSchedule(s.kind)),
  ];
  const fees = new Map<string, string>();
  let scheduleFeeUsed = false;
  for (const src of byPrecedence) {
    for (const r of src.rows) {
      const code = r.code.toUpperCase();
      if (fees.has(code)) continue;
      fees.set(code, String(r.fee));
      if (isSchedule(src.kind)) scheduleFeeUsed = true;
    }
  }

  const frequencies: Record<string, number> = {};
  const providerFees: Record<string, Record<string, number>> = {};
  for (const src of unique) {
    for (const [code, n] of Object.entries(src.volumes)) {
      if (n > 0 && fees.has(code)) frequencies[code] = (frequencies[code] ?? 0) + n;
    }
    for (const [code, byProvider] of Object.entries(src.providerFees)) {
      const merged = (providerFees[code] ??= {});
      for (const [label, fee] of Object.entries(byProvider)) {
        if (!(label in merged)) merged[label] = fee;
      }
    }
  }

  const rows = Array.from(fees, ([code, fee]) => ({ code, fee })).sort((a, b) =>
    a.code.localeCompare(b.code)
  );
  return {
    rows,
    frequencies,
    providerFees,
    duplicateOf,
    feesFromReportsOnly: rows.length > 0 && !scheduleFeeUsed,
  };
}

/** Corrections made in the review table, kept apart from the parsed files. */
export type ReviewEdits = {
  fees: Record<string, string>;
  /** null clears a count. */
  volumes: Record<string, number | null>;
  removed: string[];
  added: MergedRow[];
};

export const emptyEdits = (): ReviewEdits => ({ fees: {}, volumes: {}, removed: [], added: [] });

export function applyEdits(
  merged: Pick<MergeResult, "rows" | "frequencies">,
  edits: ReviewEdits
): { rows: MergedRow[]; frequencies: Record<string, number> } {
  const removed = new Set(edits.removed);
  const have = new Set(merged.rows.map((r) => r.code));
  const rows = [
    ...merged.rows,
    ...edits.added.filter((r) => !have.has(r.code)),
  ]
    .filter((r) => !removed.has(r.code))
    .map((r) => ({ code: r.code, fee: edits.fees[r.code] ?? r.fee }))
    .sort((a, b) => a.code.localeCompare(b.code));

  const frequencies: Record<string, number> = {};
  for (const r of rows) {
    const edited = edits.volumes[r.code];
    const n = edited === undefined ? merged.frequencies[r.code] : edited;
    if (n !== null && n !== undefined && n > 0) frequencies[r.code] = n;
  }
  return { rows, frequencies };
}
