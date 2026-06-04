import { durationSince, getErrorMessage, nowMs, resolveEffectiveOptions } from "./internal.js";
import { runBrowserCheckAttempt } from "./runners/browser.js";
import { runHttpCheckAttempt } from "./runners/http.js";
import type { Check, CheckResult, RunCheckOptions, RunSummary } from "./types.js";

interface ErrorWithContext extends Error {
  step?: string;
  artifactPath?: string;
}

/** Execute one check once, with retry handling, and return a normalized result. */
export async function runCheck(check: Check, options: RunCheckOptions = {}): Promise<CheckResult> {
  const effective = resolveEffectiveOptions(check, options);
  const started = nowMs();
  let lastError: unknown;
  let lastStep: string | undefined;
  let lastArtifactPath: string | undefined;
  const maxAttempts = effective.retries + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      if (check.type === "http") {
        await runHttpCheckAttempt(check, effective, options);
      } else {
        await runBrowserCheckAttempt(check, effective);
      }

      return {
        name: check.name,
        type: check.type,
        ok: true,
        durationMs: durationSince(started),
        attempts: attempt
      };
    } catch (error) {
      lastError = error;

      if (error instanceof Error) {
        const contextualError = error as ErrorWithContext;
        lastStep = contextualError.step ?? lastStep;
        lastArtifactPath = contextualError.artifactPath ?? lastArtifactPath;
      }
    }
  }

  return {
    name: check.name,
    type: check.type,
    ok: false,
    durationMs: durationSince(started),
    attempts: maxAttempts,
    error: getErrorMessage(lastError),
    step: lastStep,
    artifactPath: lastArtifactPath
  };
}

/** Execute a list of checks sequentially and aggregate the results. */
export async function runChecks(
  checks: Check[],
  options: RunCheckOptions & { checkName?: string } = {}
): Promise<RunSummary> {
  const selectedChecks = options.checkName
    ? checks.filter((check) => check.name === options.checkName)
    : checks;
  const started = nowMs();
  const results: CheckResult[] = [];

  if (options.checkName && selectedChecks.length === 0) {
    throw new Error(`No check named "${options.checkName}" was found`);
  }

  for (const check of selectedChecks) {
    results.push(await runCheck(check, options));
  }

  return {
    ok: results.every((result) => result.ok),
    durationMs: durationSince(started),
    results
  };
}
