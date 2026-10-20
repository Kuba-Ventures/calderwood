// The "files" fee payload: several uploads (CSV / Excel / PDF) already combined
// in the browser by mergeUploads into code+fee rows, summed annual volumes, and
// per-provider fees. The submit routes store it exactly like the single-PDF
// payload, so this module converts one into the other and picks the
// fee_input_method value to record (the column only allows single-file kinds).

import { z } from "zod";

export const MAX_UPLOAD_FILES = 10;

const rowsSchema = z
  .array(z.object({ code: z.string(), fee: z.union([z.string(), z.number()]) }))
  .min(1);

export const filesFeeSchema = z.object({
  method: z.literal("files"),
  rows: rowsSchema,
  frequencies: z.record(z.string(), z.number()).optional(),
  providerFees: z.record(z.string(), z.record(z.string(), z.number())).optional(),
  kinds: z.array(z.enum(["csv", "xlsx", "pdf"])).min(1).max(MAX_UPLOAD_FILES),
  pdfPaths: z.array(z.string()).max(MAX_UPLOAD_FILES).optional(),
  filenames: z.array(z.string()).max(MAX_UPLOAD_FILES).optional(),
});

export type FilesFee = z.infer<typeof filesFeeSchema>;

/** fee_input_method for a combined upload: any PDF wins, then Excel, then CSV. */
export function inputMethodFor(kinds: FilesFee["kinds"]): "pdf" | "xlsx" | "csv" {
  if (kinds.includes("pdf")) return "pdf";
  if (kinds.includes("xlsx")) return "xlsx";
  return "csv";
}

/** The single-PDF payload shape the routes already know how to store. */
export function filesAsPdf(fee: FilesFee) {
  return {
    method: "pdf" as const,
    rows: fee.rows,
    frequencies: fee.frequencies,
    providerFees: fee.providerFees,
    // raw_file_url holds one path; the first PDF is the one kept for review.
    pdfPath: fee.pdfPaths?.[0],
    filename: fee.filenames?.join(", "),
  };
}
