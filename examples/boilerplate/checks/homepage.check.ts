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
