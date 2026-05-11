const items = [
  {
    label: "01",
    title: "Your fees, scored against your zip code",
    body: "Every code on your fee schedule benchmarked against the 50th, 75th, and 90th percentiles for your specific zip code.",
    Visual: PercentileVisual,
  },
  {
    label: "02",
    title: "The 10 codes losing you the most money",
    body: "Codes ranked by annual dollar impact: gap to the 75th percentile times your annual frequency.",
    Visual: CodeTableVisual,
  },
  {
    label: "03",
    title: "Which carrier to call first",
    body: "Each contracted carrier scored on total recoverable revenue. Renegotiate the highest-impact contract first.",
    Visual: CarrierBarsVisual,
  },
];

export function Deliverable() {
  return (
    <section className="bg-canvas">
      <div className="mx-auto max-w-container px-6 py-24 sm:px-8 sm:py-28">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent sm:text-sm">
            What&rsquo;s in the report
          </p>
          <h2 className="mt-5 text-3xl font-semibold tracking-tightish text-ink-900 sm:text-4xl">
            Three answers, one PDF.
          </h2>
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-3 lg:gap-7">
          {items.map(({ label, title, body, Visual }) => (
            <div
              key={label}
              className="flex flex-col rounded-xl border border-canvas-border bg-canvas-tint"
            >
              <div className="border-b border-canvas-border">
                <Visual />
              </div>
              <div className="p-6 sm:p-7">
                <span className="font-mono text-xs text-ink-400">
                  {label}
                </span>
                <h3 className="mt-2 text-lg font-semibold tracking-tightish text-ink-900">
                  {title}
                </h3>
                <p className="mt-2 max-w-readable text-[15px] leading-relaxed text-ink-700">
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PercentileVisual() {
  const codes = [
    { code: "D0150", percentile: 62 },
    { code: "D2150", percentile: 41 },
    { code: "D2740", percentile: 55 },
    { code: "D3310", percentile: 48 },
  ];
  return (
    <div className="bg-white px-6 py-7 sm:px-7">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
        Percentile rank in your ZIP
      </p>
      <div className="mt-5 space-y-3.5">
        {codes.map(({ code, percentile }) => (
          <div
            key={code}
            className="grid grid-cols-[44px_1fr_36px] items-center gap-3"
          >
            <span className="font-mono text-[11px] text-ink-500">
              {code}
            </span>
            <div className="relative h-2 rounded-full bg-canvas-border">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-accent"
                style={{ width: `${percentile}%` }}
              />
              <div
                className="absolute -top-0.5 h-3 w-px bg-gain-ink"
                style={{ left: "75%" }}
                aria-hidden
              />
            </div>
            <span className="text-right font-serif text-xs font-medium text-ink-900 tabular-nums">
              {percentile}
              <span className="text-ink-400">th</span>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-4 text-[10px] text-ink-400">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-3 rounded-full bg-accent" />
          <span>your fee</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-px bg-gain-ink" />
          <span>75th percentile</span>
        </div>
      </div>
    </div>
  );
}

function CodeTableVisual() {
  const rows = [
    { code: "D2740", desc: "Crown, porcelain", gap: "$30", impact: "$4,260" },
    { code: "D7140", desc: "Extraction, erupted", gap: "$18", impact: "$3,780" },
    { code: "D2950", desc: "Build-up, post", gap: "$25", impact: "$2,225" },
    { code: "D3310", desc: "Endo, anterior", gap: "$42", impact: "$1,596" },
  ];
  return (
    <div className="bg-white px-6 py-7 sm:px-7">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
        Top codes by annual impact
      </p>
      <div className="mt-5 overflow-hidden rounded-md border border-canvas-border">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-canvas-tint text-ink-500">
              <th className="px-3 py-2 text-left text-[9px] font-medium uppercase tracking-wider">
                Code
              </th>
              <th className="px-3 py-2 text-left text-[9px] font-medium uppercase tracking-wider">
                Description
              </th>
              <th className="px-3 py-2 text-right text-[9px] font-medium uppercase tracking-wider">
                Gap
              </th>
              <th className="px-3 py-2 text-right text-[9px] font-medium uppercase tracking-wider">
                Annual
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-canvas-border">
            {rows.map((row) => (
              <tr key={row.code}>
                <td className="px-3 py-2.5 font-mono text-ink-700">
                  {row.code}
                </td>
                <td className="px-3 py-2.5 text-ink-700">{row.desc}</td>
                <td className="px-3 py-2.5 text-right font-serif text-ink-700 tabular-nums">
                  {row.gap}
                </td>
                <td className="px-3 py-2.5 text-right font-serif font-medium text-gain-ink tabular-nums">
                  {row.impact}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CarrierBarsVisual() {
  const carriers = [
    { name: "Cigna", value: 32180, pct: 100 },
    { name: "Aetna", value: 20400, pct: 63 },
    { name: "Delta Dental", value: 16150, pct: 50 },
    { name: "MetLife", value: 10290, pct: 32 },
    { name: "Other", value: 8400, pct: 26 },
  ];
  return (
    <div className="bg-white px-6 py-7 sm:px-7">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
        Recoverable revenue by carrier
      </p>
      <div className="mt-5 space-y-2.5">
        {carriers.map((carrier) => (
          <div
            key={carrier.name}
            className="grid grid-cols-[80px_1fr_64px] items-center gap-3"
          >
            <span className="text-[11px] text-ink-700">{carrier.name}</span>
            <div className="h-3 rounded-sm bg-canvas-border">
              <div
                className="h-full rounded-sm bg-gain"
                style={{ width: `${carrier.pct}%` }}
              />
            </div>
            <span className="text-right font-serif text-xs font-medium text-gain-ink tabular-nums">
              ${carrier.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
