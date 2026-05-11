"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Intake,
  Report,
  account,
  formatDateTime,
  intake,
  report,
} from "@/lib/storage";

type Row = {
  submittedAt: string;
  status: "Processing" | "Delivered";
  deliveredAt?: string;
};

export default function ReportsPage() {
  const [hydrated, setHydrated] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const i: Intake | null = intake.get();
    const r: Report | null = report.get();
    if (i) {
      setRows([
        {
          submittedAt: i.submittedAt,
          status: r?.state === "delivered" ? "Delivered" : "Processing",
          deliveredAt: r?.deliveredAt,
        },
      ]);
    }
    setEmail(account.get()?.primaryEmail || "");
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return <div className="text-sm text-ink-400">Loading…</div>;
  }

  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-canvas-border bg-canvas px-8 py-16 text-center shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tighter2 text-ink-900">
            No reports yet.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-ink-500">
            Your reports will appear here after your first intake. Most
            practices re-run quarterly to track contract renegotiations.
          </p>
          <div className="mt-6">
            <Link
              href="/intake"
              className="inline-flex items-center justify-center rounded-md bg-ink-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-ink-700"
            >
              Start intake →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm text-ink-500">
        Past and in-progress fee benchmark reports.
      </p>
      <div className="mt-4 overflow-hidden rounded-xl border border-canvas-border bg-canvas shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-canvas-border bg-canvas-tint text-left text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th className="px-6 py-3 font-medium">Date submitted</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-t border-canvas-border">
                <td className="px-6 py-4 text-ink-900">
                  {formatDateTime(row.submittedAt)}
                </td>
                <td className="px-6 py-4">
                  <StatusPill status={row.status} />
                  {row.status === "Delivered" && row.deliveredAt && (
                    <span className="ml-2 text-xs text-ink-400">
                      {formatDateTime(row.deliveredAt)}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {row.status === "Delivered" ? (
                    <a
                      href={`mailto:hello@calderwoodtech.com?subject=Re-send%20my%20Calderwood%20report${
                        email ? `&body=Practice%20email%3A%20${encodeURIComponent(email)}` : ""
                      }`}
                      className="text-sm font-medium text-accent hover:underline"
                    >
                      Email me the PDF
                    </a>
                  ) : (
                    <Link
                      href="/dashboard"
                      className="text-sm font-medium text-accent hover:underline"
                    >
                      View progress
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: "Processing" | "Delivered" }) {
  const className =
    status === "Delivered"
      ? "bg-gain-soft text-gain-ink"
      : "bg-canvas-tint2 text-ink-500";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {status}
    </span>
  );
}
