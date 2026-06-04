import { defineCheck, expect } from "@canaryprobe/core";

export default defineCheck({
  name: "example-browser",
  type: "browser",
  timeout: 60_000,
  async run({ page, step }) {
    await step("open homepage", async () => {
      await page.goto("https://example.com/");
    });

    await step("verify title", async () => {
      await expect(page).toHaveTitle(/Example Domain/);
    });
  }
});
