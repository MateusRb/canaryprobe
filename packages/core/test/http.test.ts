import { describe, expect, it, vi } from "vitest";
import { defineCheck, runCheck } from "../src/index.js";

describe("HTTP runner", () => {
  it("runs object assertions against fetch responses", async () => {
    const fetch = vi.fn(async () => new Response("hello Example Domain", { status: 200 }));
    const check = defineCheck({
      name: "homepage-up",
      type: "http",
      request: { url: "/health" },
      assert: { status: 200, bodyIncludes: "Example" }
    });

    const result = await runCheck(check, {
      config: { baseURL: "https://example.com" },
      fetch
    });

    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      "https://example.com/health",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("supports async function assertions and json responses", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
    );
    const check = defineCheck({
      name: "api-health",
      type: "http",
      request: { url: "https://api.example.com/health" },
      async assert(response) {
        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ status: "ok" });
      }
    });

    await expect(runCheck(check, { fetch })).resolves.toMatchObject({ ok: true });
  });

  it("returns failed results for assertion errors", async () => {
    const fetch = vi.fn(async () => new Response("nope", { status: 500 }));
    const check = defineCheck({
      name: "api-health",
      type: "http",
      request: { url: "https://api.example.com/health" },
      assert: { status: 200 }
    });

    await expect(runCheck(check, { fetch })).resolves.toMatchObject({
      ok: false,
      error: "Expected status 200, received 500"
    });
  });

  it("retries failed checks", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("down", { status: 500 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    const check = defineCheck({
      name: "retry-health",
      type: "http",
      retries: 1,
      request: { url: "https://api.example.com/health" },
      assert: { status: 200 }
    });

    await expect(runCheck(check, { fetch })).resolves.toMatchObject({ ok: true, attempts: 2 });
  });
});
