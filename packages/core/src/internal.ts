import { performance } from "node:perf_hooks";
import { defaultConfig, mergeConfig } from "./config.js";
import type { Check, EffectiveRunOptions, RunCheckOptions } from "./types.js";

export function nowMs(): number {
  return performance.now();
}

export function durationSince(start: number): number {
  return Math.round(performance.now() - start);
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function resolveEffectiveOptions(check: Check, options: RunCheckOptions): EffectiveRunOptions {
  const config = mergeConfig(options.config);

  return {
    baseURL: config.baseURL || undefined,
    timeout: options.timeout ?? check.timeout ?? config.defaultTimeout ?? defaultConfig.defaultTimeout,
    retries: check.retries ?? config.retries ?? defaultConfig.retries,
    artifactsDir: config.artifactsDir
  };
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
