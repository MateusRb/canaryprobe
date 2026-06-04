import type { Page, expect as playwrightExpect } from "@playwright/test";

export type CheckType = "http" | "browser";
export type ReporterName = "dot" | "json";

export interface CanaryprobeConfig {
  baseURL?: string;
  defaultTimeout?: number;
  retries?: number;
  checksDir?: string;
  artifactsDir?: string;
}

export interface CommonCheckFields {
  /** Unique kebab-case check name. */
  name: string;
  type: CheckType;
  timeout?: number;
  retries?: number;
  /** Reserved for the phase 2 agent. Phase 1 preserves this value but does not schedule checks. */
  schedule?: string;
  tags?: string[];
}

export interface HttpRequestDefinition {
  method?: string;
  url: string;
  headers?: Record<string, string>;
  body?: BodyInit | null;
}

export interface HttpTiming {
  dns?: number;
  tcp?: number;
  ttfb?: number;
  totalMs: number;
}

export interface CanaryprobeResponse {
  status: number;
  headers: Headers;
  timing: HttpTiming;
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
}

export interface HttpAssertObject {
  status?: number;
  maxDurationMs?: number;
  bodyIncludes?: string;
}

export type HttpAssertFunction = (response: CanaryprobeResponse) => void | Promise<void>;
export type HttpAssertDefinition = HttpAssertObject | HttpAssertFunction;

export interface HttpCheck extends CommonCheckFields {
  type: "http";
  request: HttpRequestDefinition;
  assert?: HttpAssertDefinition;
}

export interface BrowserStep {
  (name: string, fn: () => Promise<void>): Promise<void>;
}

export interface BrowserRunContext {
  page: Page;
  step: BrowserStep;
  expect: typeof playwrightExpect;
}

export interface BrowserCheck extends CommonCheckFields {
  type: "browser";
  run(context: BrowserRunContext): Promise<void>;
}

export type Check = HttpCheck | BrowserCheck;

export interface EffectiveRunOptions {
  baseURL?: string;
  timeout: number;
  retries: number;
  artifactsDir: string;
}

export interface RunCheckOptions {
  config?: CanaryprobeConfig;
  timeout?: number;
  fetch?: typeof globalThis.fetch;
}

export interface CheckResult {
  name: string;
  type: CheckType;
  ok: boolean;
  durationMs: number;
  attempts: number;
  error?: string;
  step?: string;
  artifactPath?: string;
}

export interface RunSummary {
  ok: boolean;
  durationMs: number;
  results: CheckResult[];
}

export interface LoadedProject {
  config: CanaryprobeConfig;
  configPath?: string;
  checks: Check[];
  checkFiles: string[];
}

export interface LoadProjectOptions {
  cwd?: string;
  configPath?: string;
  checksDir?: string;
}

export interface ValidationIssue {
  file?: string;
  checkName?: string;
  message: string;
}

export class CanaryprobeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CanaryprobeError";
  }
}
