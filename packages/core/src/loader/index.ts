import path from "node:path";
import fg from "fast-glob";
import { createJiti } from "jiti";
import { defaultConfig, mergeConfig } from "../config.js";
import type { CanaryprobeConfig, Check, LoadedProject, LoadProjectOptions } from "../types.js";
import { assertValidChecks, formatValidationIssues, validateChecks } from "./validate.js";

export { assertValidChecks, formatValidationIssues, validateCheck, validateChecks } from "./validate.js";

const configFileName = "canaryprobe.config.ts";

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const { access } = await import("node:fs/promises");
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findConfig(startDir: string): Promise<string | undefined> {
  let current = path.resolve(startDir);

  while (true) {
    const candidate = path.join(current, configFileName);

    if (await fileExists(candidate)) {
      return candidate;
    }

    const parent = path.dirname(current);

    if (parent === current) {
      return undefined;
    }

    current = parent;
  }
}

async function importDefault<T>(filePath: string): Promise<T> {
  const jiti = createJiti(import.meta.url, {
    interopDefault: false
  });
  const module = await jiti.import<{ default?: T | { default?: T } }>(filePath);

  if (!("default" in module)) {
    throw new Error(`${filePath} must have a default export`);
  }

  const defaultExport = module.default;

  const value: unknown =
    defaultExport &&
    typeof defaultExport === "object" &&
    "default" in defaultExport &&
    Object.keys(defaultExport).length === 1
      ? defaultExport.default
      : defaultExport;

  return value as T;
}

export async function loadConfig(options: LoadProjectOptions = {}): Promise<{
  config: CanaryprobeConfig;
  configPath?: string;
  baseDir: string;
}> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const explicitConfigPath = options.configPath
    ? path.resolve(cwd, options.configPath)
    : undefined;
  const configPath = explicitConfigPath ?? (await findConfig(cwd));

  if (!configPath) {
    return {
      config: mergeConfig(undefined),
      baseDir: cwd
    };
  }

  const config = await importDefault<CanaryprobeConfig>(configPath);

  return {
    config: mergeConfig(config),
    configPath,
    baseDir: path.dirname(configPath)
  };
}

export async function discoverCheckFiles(
  config: CanaryprobeConfig,
  baseDir: string,
  checksDirOverride?: string
): Promise<string[]> {
  const checksDir = checksDirOverride ?? config.checksDir ?? defaultConfig.checksDir;
  const root = path.resolve(baseDir, checksDir);

  return fg("**/*.check.ts", {
    cwd: root,
    absolute: true,
    onlyFiles: true,
    ignore: ["**/node_modules/**", "**/dist/**"]
  });
}

export async function loadProject(options: LoadProjectOptions = {}): Promise<LoadedProject> {
  const loadedConfig = await loadConfig(options);
  const checkFiles = await discoverCheckFiles(
    loadedConfig.config,
    loadedConfig.baseDir,
    options.checksDir
  );
  const loadedChecks = await Promise.all(
    checkFiles.map(async (file) => ({
      file,
      check: await importDefault<unknown>(file)
    }))
  );
  const validationIssues = validateChecks(loadedChecks);

  if (validationIssues.length > 0) {
    throw new Error(formatValidationIssues(validationIssues));
  }

  assertValidChecks(loadedChecks);

  return {
    config: loadedConfig.config,
    configPath: loadedConfig.configPath,
    checks: loadedChecks.map(({ check }) => check as Check),
    checkFiles
  };
}
