import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { withTimeout } from "../internal.js";
import type { BrowserCheck, CheckResult, EffectiveRunOptions } from "../types.js";

function sanitizeName(name: string): string {
  return name.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
}

export async function runBrowserCheckAttempt(
  check: BrowserCheck,
  effective: EffectiveRunOptions
): Promise<Pick<CheckResult, "step" | "artifactPath"> | undefined> {
  let activeStep: string | undefined;
  let page: Page | undefined;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;

  try {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
    page.setDefaultTimeout(effective.timeout);

    await withTimeout(
      check.run({
        page,
        expect,
        async step(name, fn) {
          const previousStep = activeStep;
          let failed = false;
          activeStep = name;
          try {
            await fn();
          } catch (error) {
            failed = true;
            throw error;
          } finally {
            if (!failed) {
              activeStep = previousStep;
            }
          }
        }
      }),
      effective.timeout,
      `Browser check "${check.name}"`
    );

    return undefined;
  } catch (error) {
    const artifactPath = page
      ? await captureFailureScreenshot(page, effective.artifactsDir, check.name)
      : undefined;

    if (error instanceof Error) {
      (error as Error & { step?: string; artifactPath?: string }).step = activeStep;
      (error as Error & { step?: string; artifactPath?: string }).artifactPath = artifactPath;
    }

    throw error;
  } finally {
    await browser?.close().catch(() => undefined);
  }
}

async function captureFailureScreenshot(
  page: Page,
  artifactsDir: string,
  checkName: string
): Promise<string | undefined> {
  const directory = path.join(artifactsDir, sanitizeName(checkName));
  const screenshotPath = path.join(directory, "screenshot.png");

  try {
    await mkdir(directory, { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });
    return screenshotPath;
  } catch {
    return undefined;
  }
}
