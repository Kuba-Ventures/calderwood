"use client";

// Carrier reimbursement centerpiece for the unlocked report:
//   a. scorecard — one card per carrier (A-F grade, blended % of p75, recoverable)
//   b. heatmap   — codes x carriers, cells colored maroon->neutral->green; toggle
//                  what the cell shows, sort codes, click a card to isolate a
//                  carrier, hover for the negotiation anchor.
//   c. takeaways — three auto-generated plain-English insights.
// Rendered only when carrier rates exist and the report is unlocked.

import { useMemo, useState } from "react";
import { formatPct, formatUsd } from "@/lib/storage";
import type { CarrierGrid, CarrierGridRow, CarrierScore } from "@/lib/report/gate";

type Show = "pct" | "rate" | "gap";
type Sort = "oppo" | "volume" | "code";

const usd2 = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

function gradeStyle(g: string): React.CSSProperties {
  const map: Record<string, [string, string]> = {
    A: ["#dcebe3", "#15803d"], B: ["#e3eef4", "#0c4a6e"], C: ["#eef1f4", "#475569"],
    D: ["#f3e3e3", "#b4453f"], F: ["#f1dede", "#991b1b"],
  };
  const [bg, fg] = map[g] || map.C;
  return { background: bg, color: fg };
}

function mix(a: number[], b: number[], t: number) {
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t));
}
function heatColor(ratio: number) {
  const maroon = [153, 27, 27], neutral = [238, 241, 244], green = [21, 128, 61];
  let rgb: number[];
  if (ratio <= 0.97) rgb = mix(maroon, neutral, Math.max(0, Math.min(1, (ratio - 0.78) / 0.19)));
  else rgb = mix(neutral, green, Math.max(0, Math.min(1, (ratio - 0.97) / 0.09)));
  rgb = mix(rgb, [255, 255, 255], 0.18);
  const lum = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
  return { bg: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`, fg: lum < 140 ? "#fff" : "#0b1220" };
}

export function CarrierAnalysis({ grid }: { grid: CarrierGrid }) {
  const [show, setShow] = useState<Show>("pct");
  const [sort, setSort] = useState<Sort>("oppo");
  const [isolate, setIsolate] = useState<string | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; el: React.ReactNode } | null>(null);

  const carriers = grid.carriers;
  const rows = useMemo(() => {
    const a = [...grid.rows];
    if (sort === "volume") a.sort((x, y) => y.volume - x.volume);
    else if (sort === "code") a.sort((x, y) => x.code.localeCompare(y.code));
    else a.sort((x, y) => y.annualRecoverable - x.annualRecoverable);
    return a;
  }, [grid.rows, sort]);

  const blended = useMemo(() => {
    const m: Record<string, number> = {};
    carriers.forEach((c) => (m[c.name] = c.blendedPctP75));
    return m;
  }, [carriers]);

  function bestOther(row: CarrierGridRow, except: string) {
    let best: { name: string; rate: number } | null = null;
    for (const c of carriers) {
      if (c.name === except) continue;
      const r = row.rates[c.name];
      if (r != null && r > 0 && (!best || r > best.rate)) best = { name: c.name, rate: r };
    }
    return best;
  }

  const takeaways = useMemo(() => buildTakeaways(carriers, rows), [carriers, rows]);

  return (
    <div className="rounded-xl border border-canvas-border bg-canvas px-6 py-6 shadow-sm">
      <h3 className="text-base font-semibold text-ink-900">Carrier reimbursement</h3>
      <p className="mt-1 text-xs text-ink-500">
        Each carrier graded against your local UCR p75, then a code-by-carrier grid
        of what they actually contract to pay.
      </p>

      {/* a. scorecard */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {carriers.map((c) => {
          const on = isolate === c.name;
          return (
            <button
              key={c.name}
              type="button"
              onClick={() => setIsolate(on ? null : c.name)}
              aria-pressed={on}
              className={`rounded-lg border bg-canvas px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900 ${
                on ? "border-accent ring-1 ring-accent" : "border-canvas-border hover:border-ink-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink-900">{c.name}</span>
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold"
                  style={gradeStyle(c.grade)}
                >
                  {c.grade}
                </span>
              </div>
              <div className="mt-2 font-serif text-xl text-red-800">{formatUsd(c.annualRecoverable)}</div>
              <div className="mt-1 text-[11px] text-ink-500">
                pays <span className="font-serif text-ink-700">{formatPct(c.blendedPctP75)}</span> of p75
              </div>
            </button>
          );
        })}
      </div>

      {/* b. heatmap controls */}
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <Control label="Cell shows">
          <Select value={show} onChange={(v) => setShow(v as Show)}
            opts={[["pct", "% of p75"], ["rate", "Raw rate"], ["gap", "Annual gap $"]]} />
        </Control>
        <Control label="Sort codes">
          <Select value={sort} onChange={(v) => setSort(v as Sort)}
            opts={[["oppo", "Opportunity"], ["volume", "Volume"], ["code", "Code"]]} />
        </Control>
        {isolate && (
          <button type="button" onClick={() => setIsolate(null)}
            className="rounded-md border border-canvas-border bg-canvas px-2.5 py-1 font-medium text-accent hover:bg-canvas-tint">
            Show all carriers
          </button>
        )}
      </div>

      {/* b. heatmap */}
      <div className="mt-3 max-h-[520px] overflow-auto rounded-md border border-canvas-border">
        <table className="w-max min-w-full border-separate" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 border-b border-r border-canvas-border bg-canvas-tint px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-ink-400">
                Code / p75 / vol
              </th>
              {carriers.map((c) => (
                <th key={c.name}
                  className="sticky top-0 z-20 border-b border-r border-canvas-border bg-canvas-tint px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-ink-400"
                  style={isolate && isolate !== c.name ? { opacity: 0.3 } : undefined}>
                  {c.name}
                </th>
              ))}
              <th className="sticky right-0 top-0 z-30 border-b border-canvas-border bg-canvas-tint px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-ink-400">
                Opp / code
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code}>
                <th className="sticky left-0 z-10 border-b border-r border-canvas-border bg-canvas px-3 py-2 text-left">
                  <div className="text-[12.5px] font-bold text-accent">{r.code}</div>
                  <div className="text-[10px] font-medium text-ink-400">
                    p75 {usd2(r.p75)} · {r.volume.toLocaleString()}/yr
                  </div>
                </th>
                {carriers.map((c) => {
                  const rate = r.rates[c.name];
                  const ratio = r.p75 > 0 && rate ? rate / r.p75 : 1;
                  const { bg, fg } = heatColor(ratio);
                  const dim = isolate && isolate !== c.name;
                  const gap = Math.max(0, r.p75 - (rate || 0)) * r.volume;
                  const text = rate == null ? "—"
                    : show === "rate" ? usd2(rate)
                    : show === "gap" ? formatUsd(gap)
                    : formatPct(ratio);
                  return (
                    <td key={c.name} tabIndex={0}
                      className="border-b border-r border-canvas-border px-3 py-2 text-center font-serif text-[12px]"
                      style={{ background: bg, color: fg, opacity: dim ? 0.2 : 1 }}
                      onMouseEnter={(e) => setTip({ x: e.clientX, y: e.clientY, el: tipEl(r, c, rate) })}
                      onMouseMove={(e) => setTip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t))}
                      onMouseLeave={() => setTip(null)}
                      onFocus={(e) => setTip({ x: e.currentTarget.getBoundingClientRect().right, y: e.currentTarget.getBoundingClientRect().top, el: tipEl(r, c, rate) })}
                      onBlur={() => setTip(null)}>
                      {text}
                    </td>
                  );
                })}
                <td className="sticky right-0 z-10 border-b border-canvas-border bg-canvas px-3 py-2 text-right font-serif text-[12px] font-bold text-red-800">
                  {formatUsd(r.annualRecoverable)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th className="sticky bottom-0 left-0 z-30 border-t border-r border-canvas-border bg-canvas-tint px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-ink-400">
                Blended % of p75
              </th>
              {carriers.map((c) => (
                <td key={c.name}
                  className="sticky bottom-0 z-20 border-t border-r border-canvas-border bg-canvas-tint px-3 py-2 text-center font-serif text-[11px] font-bold text-ink-900"
                  style={isolate && isolate !== c.name ? { opacity: 0.3 } : undefined}>
                  {formatPct(blended[c.name] ?? 0)}
                </td>
              ))}
              <td className="sticky bottom-0 right-0 z-30 border-t border-canvas-border bg-canvas-tint px-3 py-2" />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* scale legend */}
      <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-500">
        <span>Below market</span>
        <span className="h-2 w-40 rounded-full"
          style={{ background: "linear-gradient(90deg,#991b1b,#eef1f4 52%,#15803d)" }} />
        <span>At / above p75</span>
      </div>

      {/* c. takeaways */}
      <div className="mt-6 rounded-md border-l-[3px] border-accent bg-canvas-tint px-5 py-4">
        <h4 className="text-sm font-semibold text-ink-900">What this grid says</h4>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] text-ink-600">
          {takeaways.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>

      {tip && (
        <div className="pointer-events-none fixed z-50 max-w-[260px] rounded-lg px-3 py-2.5 text-xs leading-relaxed text-white shadow-lg"
          style={{ background: "#083247", left: clamp(tip.x + 14, 8, vw() - 268), top: clamp(tip.y + 14, 8, vh() - 140) }}>
          {tip.el}
        </div>
      )}
    </div>
  );

  function tipEl(r: CarrierGridRow, c: CarrierScore, rate: number | undefined) {
    const anchor = bestOther(r, c.name);
    const gap = Math.max(0, r.p75 - (rate || 0)) * r.volume;
    return (
      <>
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#9ec5dc" }}>
          {c.name} · {r.code}
        </div>
        <Row l="Contracted rate" v={rate == null ? "—" : usd2(rate)} />
        <Row l="UCR p75" v={usd2(r.p75)} />
        <Row l="% of p75" v={rate ? formatPct(rate / r.p75) : "—"} />
        <Row l="Est. annual gap" v={formatUsd(gap)} />
        {anchor && rate != null && anchor.rate > rate && (
          <div className="mt-1.5 border-t border-white/20 pt-1.5" style={{ color: "#cfe0ea" }}>
            Anchor: {anchor.name} already pays {usd2(anchor.rate)} for {r.code}.
          </div>
        )}
      </>
    );
  }
}

function Row({ l, v }: { l: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span>{l}</span>
      <span className="font-serif">{v}</span>
    </div>
  );
}
function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">{label}</span>
      {children}
    </span>
  );
}
function Select({ value, onChange, opts }: { value: string; onChange: (v: string) => void; opts: [string, string][] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-canvas-border bg-canvas px-2 py-1 text-xs text-ink-900 focus:border-ink-900 focus:outline-none">
      {opts.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
    </select>
  );
}

function buildTakeaways(carriers: CarrierScore[], rows: CarrierGridRow[]): string[] {
  const out: string[] = [];
  if (carriers.length === 0) return out;
  const callFirst = [...carriers].sort((a, b) => b.annualRecoverable - a.annualRecoverable)[0];
  const lowest = [...carriers].sort((a, b) => a.blendedPctP75 - b.blendedPctP75)[0];
  out.push(
    `Call ${callFirst.name} first: it carries the most recoverable revenue (${formatUsd(callFirst.annualRecoverable)}/yr) at a blended ${formatPct(callFirst.blendedPctP75)} of p75.`
  );
  if (lowest.name !== callFirst.name) {
    out.push(
      `${lowest.name} pays the least (${formatPct(lowest.blendedPctP75)} of p75), but it isn't the top priority once you weight by how often you see those patients.`
    );
  }
  // biggest same-code spread between two carriers as a concrete anchor
  let anchor: { code: string; lo: { n: string; r: number }; hi: { n: string; r: number }; spread: number } | null = null;
  for (const r of rows) {
    let lo: { n: string; r: number } | null = null, hi: { n: string; r: number } | null = null;
    for (const c of carriers) {
      const rate = r.rates[c.name];
      if (rate == null || rate <= 0) continue;
      if (!lo || rate < lo.r) lo = { n: c.name, r: rate };
      if (!hi || rate > hi.r) hi = { n: c.name, r: rate };
    }
    if (lo && hi) {
      const sp = hi.r - lo.r;
      if (!anchor || sp > anchor.spread) anchor = { code: r.code, lo, hi, spread: sp };
    }
  }
  if (anchor && anchor.spread > 0) {
    out.push(
      `Concrete anchor: on ${anchor.code}, ${anchor.lo.n} pays ${usd2(anchor.lo.r)} while ${anchor.hi.n} already pays ${usd2(anchor.hi.r)} for the identical procedure.`
    );
  }
  return out;
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }
function vw() { return typeof window !== "undefined" ? window.innerWidth : 1024; }
function vh() { return typeof window !== "undefined" ? window.innerHeight : 768; }
