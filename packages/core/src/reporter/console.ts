import type { CheckResult, RunSummary } from "../types.js";

function formatDuration(durationMs: number): string {
  if (durationMs >= 1000) {
    return `${(durationMs / 1000).toFixed(1)}s`;
  }

  return `${durationMs}ms`;
}

function formatResult(result: CheckResult): string {
  const mark = result.ok ? "✓" : "✗";
  const paddedName = result.name.padEnd(24, " ");
  const lines = [`${mark} ${paddedName} ${formatDuration(result.durationMs)}`];

  if (!result.ok && result.error) {
    const step = result.step ? `step "${result.step}": ` : "";
    lines.push(`  └─ ${step}${result.error}`);
  }

  if (!result.ok && result.artifactPath) {
    lines.push(`  artifact: ${result.artifactPath}`);
  }

  return lines.join("\n");
}

export function formatDotSummary(summary: RunSummary): string {
  return summary.results.map(formatResult).join("\n");
}
