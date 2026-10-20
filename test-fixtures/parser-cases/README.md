# Parser test fixtures

Each fixture exercises a different real-world upload shape the parser
needs to survive.

| Fixture | Expected confidence | Notes |
|---|---|---|
| `clean.csv` | high | Standard headers (`code`, `fee`), all rows valid |
| `reordered.csv` | high | Different column order, headers still recognizable |
| `messy-no-headers.csv` | medium | First row is data, parser falls back to first-row detection |
| `partial-junk.csv` | low | 12 valid rows + 5 garbage rows, validator rejects |
| `empty.csv` | failed | Headers only, no data |
| `junk.txt` | failed | Random text, no parseable structure |
| `open-dental-summary-mixed.json` | n/a | Model output for an Open Dental "Procedure Summary" run over all billing types. "Average $" blends office and PPO fees (about 0.6x the office fee) |
| `open-dental-office-schedule.csv` | high | The same practice's office fee schedule. Pairs with the summary above. D4910 is deliberately missing |

PDF fixtures live next to these once the rasterizer is wired in. They
are not committed: PDFs of dental fee schedules contain provider info
and should not live in the repo.
