import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadProject } from "../src/loader/index.js";

async function createProject(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "canaryprobe-loader-"));
  await mkdir(path.join(root, "checks"), { recursive: true });
  await writeFile(path.join(root, "package.json"), JSON.stringify({ type: "module" }));
  await writeFile(
    path.join(root, "canaryprobe.config.ts"),
    `export default { checksDir: "./checks", baseURL: "https://example.com" };
`
  );

  return root;
}

describe("loader", () => {
  it("loads config and valid check files", async () => {
    const root = await createProject();
    await writeFile(
      path.join(root, "checks", "homepage.check.ts"),
      `export default { name: "homepage-up", type: "http", request: { url: "/" } };
`
    );

    const project = await loadProject({ cwd: root });

    expect(project.config.baseURL).toBe("https://example.com");
    expect(project.checks).toHaveLength(1);
    expect(project.checks[0]?.name).toBe("homepage-up");
  });

  it("uses defaults when no config exists", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "canaryprobe-loader-"));
    await mkdir(path.join(root, "checks"), { recursive: true });
    await writeFile(path.join(root, "package.json"), JSON.stringify({ type: "module" }));
    await writeFile(
      path.join(root, "checks", "homepage.check.ts"),
      `export default { name: "homepage-up", type: "http", request: { url: "https://example.com" } };
`
    );

    const project = await loadProject({ cwd: root });

    expect(project.config.defaultTimeout).toBe(30_000);
    expect(project.checks).toHaveLength(1);
  });

  it("reports invalid check shape", async () => {
    const root = await createProject();
    await writeFile(
      path.join(root, "checks", "bad.check.ts"),
      `export default { name: "Bad Name", type: "http" };
`
    );

    await expect(loadProject({ cwd: root })).rejects.toThrow("Check name must be kebab-case");
  });

  it("reports duplicate check names", async () => {
    const root = await createProject();

    for (const fileName of ["one.check.ts", "two.check.ts"]) {
      await writeFile(
        path.join(root, "checks", fileName),
        `export default { name: "duplicate-name", type: "http", request: { url: "/" } };
`
      );
    }

    await expect(loadProject({ cwd: root })).rejects.toThrow("Duplicate check name");
  });
});
