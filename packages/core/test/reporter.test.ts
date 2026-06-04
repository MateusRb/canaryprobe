import { describe, expect, it } from "vitest";
import { formatDotSummary, formatJsonSummary } from "../src/reporter/index.js";
import type { RunSummary } from "../src/types.js";

describe("reporters", () => {
  const summary: RunSummary = {
    ok: false,
    durationMs: 1200,
    results: [
      {
        name: "homepage-up",
        type: "http",
        ok: true,
        durationMs: 42,
        attempts: 1
      },
      {
        name: "login-flow",
        type: "browser",
        ok: false,
        durationMs: 12_400,
        attempts: 1,
        step: "dashboard",
        error: "Timeout 30000ms",
        artifactPath: ".canaryprobe/artifacts/login-flow/screenshot.png"
      }
    ]
  };

  it("formats dot output", () => {
    expect(formatDotSummary(summary)).toContain("✓ homepage-up");
    expect(formatDotSummary(summary)).toContain("step \"dashboard\": Timeout 30000ms");
    expect(formatDotSummary(summary)).toContain("artifact: .canaryprobe/artifacts/login-flow/screenshot.png");
  });

  it("formats JSON output", () => {
    expect(JSON.parse(formatJsonSummary(summary))).toEqual(summary);
  });
});
