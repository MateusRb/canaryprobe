import { describe, expect, it, vi } from "vitest";

const mockPage = vi.hoisted(() => ({
  setDefaultTimeout: vi.fn(),
  screenshot: vi.fn(async () => undefined)
}));

vi.mock("@playwright/test", () => ({
  expect: vi.fn(),
  chromium: {
    launch: vi.fn(async () => ({
      newPage: vi.fn(async () => mockPage),
      close: vi.fn(async () => undefined)
    }))
  }
}));

import { runCheck } from "../src/run.js";

describe("browser runner", () => {
  it("reports failed step and screenshot artifact path", async () => {
    const result = await runCheck(
      {
        name: "login-flow",
        type: "browser",
        async run({ step }) {
          await step("dashboard", async () => {
            throw new Error("Expected dashboard");
          });
        }
      },
      { config: { artifactsDir: ".canaryprobe/artifacts" } }
    );

    expect(result.ok).toBe(false);
    expect(result.step).toBe("dashboard");
    expect(result.error).toBe("Expected dashboard");
    expect(result.artifactPath).toBe(".canaryprobe/artifacts/login-flow/screenshot.png");
    expect(mockPage.screenshot).toHaveBeenCalled();
  });
});
