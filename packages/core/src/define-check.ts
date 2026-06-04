import type { Check } from "./types.js";

/** Define a Canaryprobe synthetic check with full TypeScript inference. */
export function defineCheck<TCheck extends Check>(check: TCheck): TCheck {
  return check;
}
