import { Command, InvalidArgumentError } from "commander";
import {
  formatDotSummary,
  formatJsonSummary,
  loadProject,
  runChecks
} from "@canaryprobe/core";

interface GlobalOptions {
  config?: string;
  timeout?: number;
}

interface RunOptions extends GlobalOptions {
  check?: string;
  reporter?: string;
}

function parseInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new InvalidArgumentError("Value must be a positive integer");
  }

  return parsed;
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name("canaryprobe")
    .description("Synthetic checks as code - test in CI, probe production later.")
    .version("0.1.0-alpha.0")
    .option("--config <path>", "path to canaryprobe.config.ts")
    .option("--timeout <ms>", "override effective timeout in milliseconds", parseInteger);

  program
    .command("test")
    .argument("[dir]", "checks directory")
    .description("Load and validate checks without executing network or browser actions")
    .action(async (dir: string | undefined) => {
      const options = program.opts<GlobalOptions>();
      await loadProject({
        configPath: options.config,
        checksDir: dir
      });
      console.log("Checks are valid");
    });

  program
    .command("run")
    .argument("[dir]", "checks directory")
    .description("Execute checks once")
    .option("--check <name>", "run a single check by name")
    .option("--reporter <name>", "reporter to use: dot or json", "dot")
    .action(async (dir: string | undefined, options: RunOptions) => {
      const globalOptions = program.opts<GlobalOptions>();
      const reporter = options.reporter ?? "dot";

      if (reporter !== "dot" && reporter !== "json") {
        throw new Error(`Unsupported reporter "${reporter}". Use "dot" or "json".`);
      }

      const project = await loadProject({
        configPath: globalOptions.config,
        checksDir: dir
      });
      const summary = await runChecks(project.checks, {
        config: project.config,
        timeout: globalOptions.timeout,
        checkName: options.check
      });
      const output = reporter === "json" ? formatJsonSummary(summary) : formatDotSummary(summary);

      if (output.length > 0) {
        console.log(output);
      }

      process.exitCode = summary.ok ? 0 : 1;
    });

  return program;
}

export async function main(argv = process.argv): Promise<void> {
  const program = createProgram();

  try {
    await program.parseAsync(argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
}
