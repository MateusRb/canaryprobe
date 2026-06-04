import { durationSince, nowMs } from "../internal.js";
import type {
  CanaryprobeResponse,
  EffectiveRunOptions,
  HttpAssertObject,
  HttpCheck,
  RunCheckOptions
} from "../types.js";

function resolveUrl(url: string, baseURL: string | undefined): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (!baseURL) {
    throw new Error(`HTTP check uses relative URL "${url}" but no baseURL is configured`);
  }

  return new URL(url, baseURL).toString();
}

function isAssertObject(assert: HttpCheck["assert"]): assert is HttpAssertObject {
  return typeof assert === "object" && assert !== null;
}

function createResponseWrapper(response: Response, totalMs: number): CanaryprobeResponse {
  let textCache: string | undefined;

  return {
    status: response.status,
    headers: response.headers,
    timing: {
      totalMs
    },
    async text() {
      textCache ??= await response.text();
      return textCache;
    },
    async json<T = unknown>() {
      textCache ??= await response.text();
      const text = textCache;
      return JSON.parse(text) as T;
    }
  };
}

async function applyObjectAssertions(
  response: CanaryprobeResponse,
  assert: HttpAssertObject
): Promise<void> {
  if (assert.status !== undefined && response.status !== assert.status) {
    throw new Error(`Expected status ${assert.status}, received ${response.status}`);
  }

  if (assert.maxDurationMs !== undefined && response.timing.totalMs > assert.maxDurationMs) {
    throw new Error(
      `Expected duration under ${assert.maxDurationMs}ms, received ${response.timing.totalMs}ms`
    );
  }

  if (assert.bodyIncludes !== undefined) {
    const body = await response.text();

    if (!body.includes(assert.bodyIncludes)) {
      throw new Error(`Expected response body to include ${JSON.stringify(assert.bodyIncludes)}`);
    }
  }
}

export async function runHttpCheckAttempt(
  check: HttpCheck,
  effective: EffectiveRunOptions,
  options: RunCheckOptions
): Promise<void> {
  const fetchImpl = options.fetch ?? globalThis.fetch;

  if (!fetchImpl) {
    throw new Error("Fetch is not available in this Node.js runtime");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), effective.timeout);
  const url = resolveUrl(check.request.url, effective.baseURL);
  const start = nowMs();

  try {
    const response = await fetchImpl(url, {
      method: check.request.method ?? "GET",
      headers: check.request.headers,
      body: check.request.body,
      signal: controller.signal
    });
    const wrapped = createResponseWrapper(response, durationSince(start));

    if (typeof check.assert === "function") {
      await check.assert(wrapped);
      return;
    }

    if (isAssertObject(check.assert)) {
      await applyObjectAssertions(wrapped, check.assert);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`HTTP request timed out after ${effective.timeout}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
