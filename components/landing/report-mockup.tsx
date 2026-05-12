import Image from "next/image";

export function ReportMockup() {
  return (
    <div className="relative mx-auto aspect-[8.5/11] w-full max-w-[420px]">
      <div className="absolute inset-0 translate-x-4 translate-y-3 rotate-[7deg] rounded-md border border-canvas-border bg-white shadow-md" />
      <div className="absolute inset-0 translate-x-2 translate-y-1.5 rotate-[3.5deg] rounded-md border border-canvas-border bg-white shadow-md" />
      <div className="absolute inset-0 -rotate-[2.5deg] rounded-md border border-canvas-border bg-white shadow-xl">
        <div className="flex h-full flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between border-b border-canvas-border pb-3">
            <div className="flex items-center gap-1.5">
              <Image
                src="/logo.png"
                alt=""
                width={161}
                height={187}
                className="h-4 w-auto"
              />
              <span className="text-[11px] font-semibold tracking-tightish text-ink-900">
                Calderwood
              </span>
            </div>
            <span className="text-[9px] uppercase tracking-[0.18em] text-ink-400">
              Fee Assessment
            </span>
          </div>

          <p className="mt-2.5 text-[9px] leading-relaxed text-ink-400">
            Practice 4729 · ZIP 02446 · 2 providers
            <br />
            Generated 11 May 2026
          </p>

          <p className="mt-5 text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-400">
            Executive summary
          </p>

          <div className="mt-3 space-y-3.5">
            <Stat
              label="Annual underpayment"
              value="$87,420"
              note="Across 20 most-billed CDT codes"
            />
            <Stat
              label="Codes below 75th percentile"
              value="14 of 20"
              note="71% of high-volume codes"
            />
            <Stat
              label="Top carrier opportunity"
              value="$32,180"
              note="Cigna  ·  largest single-carrier gap"
            />
          </div>

          <div className="mt-auto flex items-end justify-between border-t border-canvas-border pt-2.5 text-[9px] text-ink-400">
            <span>calderwoodtech.com</span>
            <span className="font-mono">page 1 of 14</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider text-ink-500">
        {label}
      </p>
      <p className="mt-1 font-serif text-[26px] font-medium leading-none text-accent-ink tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-[9px] leading-relaxed text-ink-500">{note}</p>
    </div>
  );
}
