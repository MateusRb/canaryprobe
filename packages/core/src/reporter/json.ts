import type { RunSummary } from "../types.js";

export function formatJsonSummary(summary: RunSummary): string {
  return JSON.stringify(
    {
      ok: summary.ok,
      durationMs: summary.durationMs,
      results: summary.results
    },
    null,
    2
  );
}
