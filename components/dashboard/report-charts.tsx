"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CarrierRow,
  CodeRow,
  formatPct,
  formatUsd,
} from "@/lib/storage";
import type { GatedReport } from "@/lib/report/gate";
import { LockCard, LockedInline } from "@/components/report/lock-overlay";

export function SummaryCards({
  data,
  unlocked = true,
}: {
  data: GatedReport;
  unlocked?: boolean;
}) {
  // Carrier ranking needs per-carrier rates, which master-only intake doesn't
  // capture. With no carrier data, fall back to the top recoverable CODE so the
  // "Biggest opportunity" tile shows a real number instead of "Other / $0".
  const hasCarrierData = data.carriers.length > 0;
  const topCode = data.codes
    .filter((c) => c.ucrP75 > 0)
    .reduce<(typeof data.codes)[number] | null>(
      (best, c) => (!best || c.annualGap > best.annualGap ? c : best),
      null
    );

  const opportunityValue = hasCarrierData
    ? data.worstCarrier.name
    : topCode?.code ?? "—";
  const opportunitySublabel = !unlocked
    ? "Unlock to see your biggest opportunity"
    : hasCarrierData
      ? `${formatUsd(data.worstCarrier.annualGapUsd)} / yr below UCR`
      : topCode
        ? `${formatUsd(Math.max(0, topCode.annualGap))} / yr underpaid on this code`
        : "Add per-carrier rates to rank carriers";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <SummaryCard
        label="Estimated annual underpayment"
        value={
          <LockedInline unlocked={unlocked}>
            {formatUsd(data.annualUnderpaymentUsd)}
          </LockedInline>
        }
        sublabel="vs UCR in your ZIP"
        tone="warn"
      />
      <SummaryCard
        label="Biggest opportunity"
        value={
          <LockedInline unlocked={unlocked} placeholder="••••••">
            {opportunityValue}
          </LockedInline>
        }
        sublabel={opportunitySublabel}
      />
      <SummaryCard
        label="Codes below UCR"
        value={`${data.codesBelowP75.count} of ${data.codesBelowP75.total}`}
        sublabel="in your top codes"
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sublabel,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  sublabel: string;
  tone?: "neutral" | "warn";
}) {
  const valueClass =
    tone === "warn" ? "text-accent-ink" : "text-ink-900";
  return (
    <div className="rounded-xl border border-canvas-border bg-canvas px-5 py-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold tracking-tightish ${valueClass}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-ink-500">{sublabel}</p>
    </div>
  );
}

export function CarrierRankingChart({
  carriers,
  onSelect,
  selected,
  unlocked = true,
  onUnlock,
  busy,
}: {
  carriers: CarrierRow[];
  onSelect?: (carrier: CarrierRow | null) => void;
  selected?: string | null;
  unlocked?: boolean;
  onUnlock?: () => void;
  busy?: boolean;
}) {
  // No per-carrier rates captured → nothing to rank. Explain instead of
  // rendering an empty/blurred chart or a fake "Other / $0".
  if (carriers.length === 0) {
    return (
      <div className="rounded-xl border border-canvas-border bg-canvas px-6 py-6 shadow-sm">
        <h3 className="text-base font-semibold text-ink-900">
          Carriers ranked by annual underpayment
        </h3>
        <p className="mt-2 max-w-xl text-sm text-ink-500">
          Carrier-by-carrier ranking needs your per-carrier fee schedules (what
          each plan actually contracts to pay). Your master fees gave us the
          code-level opportunity above; add your per-carrier rates to see which
          carrier underpays you most.
        </p>
        <Link
          href="/intake"
          className="mt-3 inline-flex items-center text-sm font-medium text-accent hover:underline"
        >
          Add carrier schedules →
        </Link>
      </div>
    );
  }

  const max = Math.max(...carriers.map((c) => c.annualGapUsd), 1);
  return (
    <div className="rounded-xl border border-canvas-border bg-canvas px-6 py-6 shadow-sm">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-ink-900">
            Carriers ranked by annual underpayment
          </h3>
          <p className="mt-1 text-xs text-ink-500">
            {unlocked
              ? "Click a carrier to filter the code table below."
              : "Unlock to see what each carrier owes you."}
          </p>
        </div>
        {unlocked && selected && (
          <button
            type="button"
            onClick={() => onSelect?.(null)}
            className="text-xs font-medium text-accent hover:underline"
          >
            Clear filter
          </button>
        )}
      </div>
      <LockCard unlocked={unlocked} onUnlock={onUnlock} busy={busy}>
        <ul className="mt-5 space-y-2.5">
          {carriers.map((c, i) => {
            const w = unlocked ? (c.annualGapUsd / max) * 100 : 85 - i * 12;
            const isSelected = selected === c.name;
            const isWorst = c === carriers[0];
            return (
              <li key={c.name}>
                <button
                  type="button"
                  disabled={!unlocked}
                  onClick={() => onSelect?.(isSelected ? null : c)}
                  className={`group block w-full rounded-md px-2 py-1.5 text-left transition ${
                    isSelected ? "bg-canvas-tint" : "hover:bg-canvas-tint"
                  }`}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span
                      className={`font-medium ${
                        isSelected ? "text-ink-900" : "text-ink-700"
                      }`}
                    >
                      {c.name}
                      {unlocked && (
                        <span className="ml-2 text-xs font-normal text-ink-400">
                          {formatPct(c.share)} of PPO volume
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-sm text-ink-900">
                      {unlocked ? formatUsd(c.annualGapUsd) : "$••,•••"}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-canvas-tint2">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isWorst ? "bg-accent" : "bg-accent/60"
                      }`}
                      style={{ width: `${w}%` }}
                    />
                  </div>
                  {unlocked && c.gapPct > 0 && (
                    <div className="mt-1 flex items-center justify-between text-xs text-ink-400">
                      <span>{formatPct(c.gapPct)} below UCR median</span>
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </LockCard>
    </div>
  );
}

type SortKey = "annualGap" | "gapPerProc" | "code" | "annualVolume";

export function CodeGapTable({
  codes,
  filterCarrier,
  unlocked = true,
}: {
  codes: CodeRow[];
  filterCarrier?: CarrierRow | null;
  unlocked?: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("annualGap");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const filtered = useMemo(() => {
    // Only show codes we can benchmark (UCR loaded for this ZIP). Unbenchmarked
    // codes have ucrP75 === 0 and would otherwise render as a wall of $0 rows.
    const benchmarked = codes.filter((c) => c.ucrP75 > 0);
    if (!filterCarrier) return benchmarked;
    // Without code-level carrier attribution in the sample data, scale each
    // code's gap by the carrier's share. Real backend will provide per-carrier
    // per-code rates directly.
    return benchmarked.map((c) => ({
      ...c,
      annualGap: Math.round(c.annualGap * filterCarrier.share),
      annualVolume: Math.round(c.annualVolume * filterCarrier.share),
    }));
  }, [codes, filterCarrier]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "desc"
          ? bv.localeCompare(av)
          : av.localeCompare(bv);
      }
      return sortDir === "desc"
        ? (bv as number) - (av as number)
        : (av as number) - (bv as number);
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <div className="rounded-xl border border-canvas-border bg-canvas shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-canvas-border px-6 py-4">
        <div>
          <h3 className="text-base font-semibold text-ink-900">
            Code-level gap analysis
          </h3>
          <p className="mt-1 text-xs text-ink-500">
            {filterCarrier
              ? `Showing your ${filterCarrier.name} volume only.`
              : "Across all PPO contracts."}
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-canvas-tint text-left text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <ThSort
                label="Code"
                active={sortKey === "code"}
                dir={sortDir}
                onClick={() => toggleSort("code")}
              />
              <th className="px-3 py-2.5 sm:px-4 font-medium">Procedure</th>
              <th className="px-3 py-2.5 sm:px-4 text-right font-medium">Your fee</th>
              <th className="px-3 py-2.5 sm:px-4 text-right font-medium">UCR (75th)</th>
              <ThSort
                label="Underpayment / proc"
                active={sortKey === "gapPerProc"}
                dir={sortDir}
                onClick={() => toggleSort("gapPerProc")}
                align="right"
              />
              <ThSort
                label="Volume"
                active={sortKey === "annualVolume"}
                dir={sortDir}
                onClick={() => toggleSort("annualVolume")}
                align="right"
              />
              <ThSort
                label="Annual underpayment"
                active={sortKey === "annualGap"}
                dir={sortDir}
                onClick={() => toggleSort("annualGap")}
                align="right"
              />
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              // Positive gap === below UCR p75 === recoverable opportunity.
              // At/above market clamps to $0 (no opportunity), never negative.
              const recoverablePerProc = Math.max(0, c.gapPerProc);
              const annualRecoverable = Math.max(0, c.annualGap);
              return (
                <tr
                  key={c.code}
                  className="border-t border-canvas-border align-top"
                >
                  <td className="px-3 py-3 sm:px-4 font-mono text-xs text-ink-700">
                    {c.code}
                  </td>
                  <td className="px-3 py-3 sm:px-4 text-ink-700">{c.label}</td>
                  <td className="px-3 py-3 sm:px-4 text-right text-ink-900">
                    {formatUsd(c.yourFee, { cents: true })}
                  </td>
                  <td className="px-3 py-3 sm:px-4 text-right text-ink-500">
                    {formatUsd(c.ucrP75, { cents: true })}
                  </td>
                  <td
                    className={`px-3 py-3 sm:px-4 text-right font-medium ${
                      recoverablePerProc > 0 ? "text-red-600" : "text-ink-400"
                    }`}
                  >
                    <LockedInline unlocked={unlocked} placeholder="$•••">
                      {formatUsd(recoverablePerProc)}
                    </LockedInline>
                  </td>
                  <td className="px-3 py-3 sm:px-4 text-right text-ink-500">
                    {c.annualVolume.toLocaleString()}
                  </td>
                  <td
                    className={`px-3 py-3 sm:px-4 text-right font-medium ${
                      annualRecoverable > 0 ? "text-red-600" : "text-ink-400"
                    }`}
                  >
                    <LockedInline unlocked={unlocked}>
                      {formatUsd(annualRecoverable)}
                    </LockedInline>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ThSort({
  label,
  active,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-3 py-2.5 sm:px-4 font-medium ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 ${
          active ? "text-ink-900" : "text-ink-400 hover:text-ink-700"
        }`}
      >
        {label}
        {active && (
          <span aria-hidden="true" className="text-[10px]">
            {dir === "desc" ? "▼" : "▲"}
          </span>
        )}
      </button>
    </th>
  );
}
