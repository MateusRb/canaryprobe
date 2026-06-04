import { defineConfig } from "@canaryprobe/core";

export default defineConfig({
  baseURL: "https://example.com",
  defaultTimeout: 30_000,
  retries: 0,
  checksDir: "./checks",
  artifactsDir: ".canaryprobe/artifacts"
});
