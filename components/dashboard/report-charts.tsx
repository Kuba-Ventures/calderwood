"use client";

import { useMemo, useState } from "react";
import {
  CarrierRow,
  CodeRow,
  ReportData,
  formatPct,
  formatUsd,
} from "@/lib/storage";

export function SummaryCards({ data }: { data: ReportData }) {
  const codesBelow = data.codes.filter((c) => c.gapPerProc > 0).length;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <SummaryCard
        label="Estimated annual underpayment"
        value={formatUsd(data.annualUnderpaymentUsd)}
        sublabel="vs UCR median in your ZIP"
        tone="warn"
      />
      <SummaryCard
        label="Biggest opportunity"
        value={data.worstCarrier.name}
        sublabel={`${formatUsd(data.worstCarrier.annualGapUsd)} / yr below UCR`}
      />
      <SummaryCard
        label="Codes below UCR"
        value={`${codesBelow} of ${data.codes.length}`}
        sublabel="in your fee schedule"
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
  value: string;
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
}: {
  carriers: CarrierRow[];
  onSelect?: (carrier: CarrierRow | null) => void;
  selected?: string | null;
}) {
  const max = Math.max(...carriers.map((c) => c.annualGapUsd), 1);
  return (
    <div className="rounded-xl border border-canvas-border bg-canvas px-6 py-6 shadow-sm">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-ink-900">
            Carriers ranked by annual underpayment
          </h3>
          <p className="mt-1 text-xs text-ink-500">
            Click a carrier to filter the code table below.
          </p>
        </div>
        {selected && (
          <button
            type="button"
            onClick={() => onSelect?.(null)}
            className="text-xs font-medium text-accent hover:underline"
          >
            Clear filter
          </button>
        )}
      </div>
      <ul className="mt-5 space-y-2.5">
        {carriers.map((c) => {
          const w = (c.annualGapUsd / max) * 100;
          const isSelected = selected === c.name;
          const isWorst = c === carriers[0];
          return (
            <li key={c.name}>
              <button
                type="button"
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
                    <span className="ml-2 text-xs font-normal text-ink-400">
                      {formatPct(c.share)} of PPO volume
                    </span>
                  </span>
                  <span className="font-mono text-sm text-ink-900">
                    {formatUsd(c.annualGapUsd)}
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
                <div className="mt-1 flex items-center justify-between text-xs text-ink-400">
                  <span>{formatPct(c.gapPct)} below UCR median</span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type SortKey = "annualGap" | "gapPerProc" | "code" | "annualVolume";

export function CodeGapTable({
  codes,
  filterCarrier,
}: {
  codes: CodeRow[];
  filterCarrier?: CarrierRow | null;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("annualGap");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const filtered = useMemo(() => {
    if (!filterCarrier) return codes;
    // Without code-level carrier attribution in the sample data, scale each
    // code's gap by the carrier's share. Real backend will provide per-carrier
    // per-code rates directly.
    return codes.map((c) => ({
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
              <th className="px-4 py-2.5 font-medium">Procedure</th>
              <th className="px-4 py-2.5 text-right font-medium">Your fee</th>
              <th className="px-4 py-2.5 text-right font-medium">UCR median</th>
              <ThSort
                label="Gap / proc"
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
                label="Annual gap"
                active={sortKey === "annualGap"}
                dir={sortDir}
                onClick={() => toggleSort("annualGap")}
                align="right"
              />
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              const below = c.gapPerProc > 0;
              return (
                <tr
                  key={c.code}
                  className="border-t border-canvas-border align-top"
                >
                  <td className="px-4 py-3 font-mono text-xs text-ink-700">
                    {c.code}
                  </td>
                  <td className="px-4 py-3 text-ink-700">{c.label}</td>
                  <td className="px-4 py-3 text-right text-ink-900">
                    {formatUsd(c.yourFee)}
                  </td>
                  <td className="px-4 py-3 text-right text-ink-500">
                    {formatUsd(c.ucrMedian)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${
                      below ? "text-red-600" : "text-gain-ink"
                    }`}
                  >
                    {formatUsd(below ? -c.gapPerProc : Math.abs(c.gapPerProc), {
                      signed: true,
                    })}
                  </td>
                  <td className="px-4 py-3 text-right text-ink-500">
                    {c.annualVolume.toLocaleString()}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${
                      c.annualGap > 0 ? "text-red-600" : "text-gain-ink"
                    }`}
                  >
                    {formatUsd(c.annualGap > 0 ? -c.annualGap : Math.abs(c.annualGap), {
                      signed: true,
                    })}
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
      className={`px-4 py-2.5 font-medium ${
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
