import { defineCheck, expect } from "@canaryprobe/core";

export default defineCheck({
  name: "api-health",
  type: "http",
  request: {
    method: "GET",
    url: "https://httpbin.org/json",
    headers: {
      Accept: "application/json"
    }
  },
  async assert(response) {
    expect(response.status).toBe(200);
    const body = await response.json<{ slideshow?: { title?: string } }>();
    expect(body.slideshow?.title).toBe("Sample Slide Show");
  }
});
