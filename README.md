# Canaryprobe

Synthetic checks as code — test in CI, probe production later with the agent.

Canaryprobe is an open source, vendor-neutral synthetic monitoring as code toolkit. Phase 1 gives you a TypeScript SDK and CLI for HTTP and Playwright checks that run locally or in CI with no SaaS account, deploy step, database, queue, or dashboard.

## Quick Start

Install dependencies:

```sh
pnpm install
pnpm build
```

Create `canaryprobe.config.ts`:

```ts
import { defineConfig } from "@canaryprobe/core";

export default defineConfig({
  baseURL: "https://example.com",
  defaultTimeout: 30_000,
  retries: 0,
  checksDir: "./checks",
  artifactsDir: ".canaryprobe/artifacts"
});
```

Create `checks/homepage.check.ts`:

```ts
import { defineCheck } from "@canaryprobe/core";

export default defineCheck({
  name: "homepage-up",
  type: "http",
  request: {
    method: "GET",
    url: "/"
  },
  assert: {
    status: 200,
    bodyIncludes: "Example Domain"
  }
});
```

Validate checks without running network or browser code:

```sh
pnpm --filter @canaryprobe/cli exec canaryprobe test checks
```

Run checks once:

```sh
pnpm --filter @canaryprobe/cli exec canaryprobe run checks
```

## Check Types

### HTTP

```ts
import { defineCheck, expect } from "@canaryprobe/core";

export default defineCheck({
  name: "api-health",
  type: "http",
  request: {
    method: "GET",
    url: "https://api.example.com/health",
    headers: { Accept: "application/json" }
  },
  async assert(response) {
    expect(response.status).toBe(200);
    const body = await response.json<{ status: string }>();
    expect(body.status).toBe("ok");
    expect(response.timing.totalMs).toBeLessThan(500);
  }
});
```

HTTP checks use native Node.js `fetch`. Canaryprobe exposes reliable `timing.totalMs`; lower-level DNS/TCP/TTFB timing fields are reserved for future improvements.

### Browser

```ts
import { defineCheck, expect } from "@canaryprobe/core";

export default defineCheck({
  name: "login-flow",
  type: "browser",
  timeout: 60_000,
  async run({ page, step }) {
    await step("open login", async () => {
      await page.goto("https://example.com/login");
    });

    await step("dashboard", async () => {
      await expect(page).toHaveURL(/dashboard/);
    });
  }
});
```

Browser checks run with Playwright Chromium in headless mode. On failure, Canaryprobe saves a screenshot under `.canaryprobe/artifacts/<check-name>/`.

Use environment variables for secrets. Do not hardcode credentials in checks.

## CLI

```sh
canaryprobe test [dir]
canaryprobe run [dir]
canaryprobe run --check <name>
canaryprobe run --reporter dot
canaryprobe run --reporter json
canaryprobe --config ./canaryprobe.config.ts --timeout 30000 run checks
```

Exit code is `0` when validation succeeds or all selected checks pass. It is `1` when validation fails or any selected check fails.

## Example Project

The repository includes a runnable example in `examples/boilerplate`:

```sh
pnpm --filter canaryprobe-boilerplate check:test
pnpm --filter canaryprobe-boilerplate check:run
```

The default example scripts run the stable HTTP checks. The optional browser check lives in `examples/boilerplate/browser-checks`:

```sh
pnpm --filter canaryprobe-boilerplate check:browser
```

Install Playwright Chromium before running browser checks locally if needed:

```sh
pnpm exec playwright install chromium
```

## Phase 1 vs Phase 2

| Area | Phase 1 | Phase 2 |
| --- | --- | --- |
| SDK | `defineCheck`, config, loader, runners, reporters | Reused by long-running agent |
| CLI | `test` and one-shot `run` | Agent control commands may be added |
| Scheduling | `schedule` is preserved but ignored | Agent uses `schedule` for recurring probes |
| Storage | None | Agent may add local or external result storage |
| Dashboard | None | Possible future UI |
| Cloud deploy | None | Optional future integrations, still vendor-neutral |

## Comparisons

### Versus Playwright Test Alone

Playwright Test is excellent for browser testing. Canaryprobe adds a small synthetic monitoring model around checks: HTTP checks, shared config, dry validation, normalized results, reporters, retries, and a future agent path.

### Versus Checkly CLI

The local workflow is intentionally familiar: define checks in code and run them from a CLI. Canaryprobe does not deploy checks to a SaaS platform in phase 1. A future self-hosted agent is the intended production execution path.

## Development

```sh
pnpm install
pnpm build
pnpm test
pnpm lint
```

## License

MIT. See `LICENSE`.

## Trademark Disclaimer

Canaryprobe is not affiliated with, endorsed by, or sponsored by Checkly, Canary / runcanary.ai, or Canary Checker / Flanksource. All trademarks are the property of their respective owners.
