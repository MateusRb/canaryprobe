import type { CanaryprobeConfig } from "./types.js";

export const defaultConfig = {
  defaultTimeout: 30_000,
  retries: 0,
  checksDir: "./checks",
  artifactsDir: ".canaryprobe/artifacts"
} satisfies Required<Pick<CanaryprobeConfig, "defaultTimeout" | "retries" | "checksDir" | "artifactsDir">>;

/** Define Canaryprobe project configuration. */
export function defineConfig(config: CanaryprobeConfig): CanaryprobeConfig {
  return config;
}

export function mergeConfig(config: CanaryprobeConfig | undefined): Required<CanaryprobeConfig> {
  return {
    baseURL: config?.baseURL ?? "",
    defaultTimeout: config?.defaultTimeout ?? defaultConfig.defaultTimeout,
    retries: config?.retries ?? defaultConfig.retries,
    checksDir: config?.checksDir ?? defaultConfig.checksDir,
    artifactsDir: config?.artifactsDir ?? defaultConfig.artifactsDir
  };
}
