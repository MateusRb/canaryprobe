import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createProgram } from "../src/program.js";

async function createValidProject(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "canaryprobe-cli-"));
  await mkdir(path.join(root, "checks"), { recursive: true });
  await writeFile(path.join(root, "package.json"), JSON.stringify({ type: "module" }));
  await writeFile(
    path.join(root, "checks", "homepage.check.ts"),
    `export default { name: "homepage-up", type: "http", request: { url: "https://example.com" } };
`
  );

  return root;
}

describe("CLI", () => {
  it("prints help output", () => {
    expect(createProgram().helpInformation()).toContain("canaryprobe");
    expect(createProgram().helpInformation()).toContain("test");
    expect(createProgram().helpInformation()).toContain("run");
  });

  it("validates checks with test command", async () => {
    const root = await createValidProject();
    const previousCwd = process.cwd();
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    try {
      process.chdir(root);
      await createProgram().exitOverride().parseAsync(["test", "checks"], { from: "user" });
      expect(log).toHaveBeenCalledWith("Checks are valid");
    } finally {
      process.chdir(previousCwd);
      log.mockRestore();
    }
  });

  it("rejects unsupported reporters", async () => {
    await expect(
      createProgram().exitOverride().parseAsync([
        "run",
        "--reporter",
        "tap"
      ], { from: "user" })
    ).rejects.toThrow("Unsupported reporter");
  });
});
