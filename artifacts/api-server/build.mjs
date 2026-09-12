import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);
const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(artifactDir, "dist");
await rm(distDir, { recursive: true, force: true });

await esbuild({
  entryPoints: [path.resolve(artifactDir, "src/production-index.ts")],
  platform: "node",
  bundle: true,
  format: "esm",
  outdir: distDir,
  outExtension: { ".js": ".mjs" },
  sourcemap: "linked",
  logLevel: "info",
  external: [
    "*.node", "pg-native", "better-sqlite3", "sqlite3", "canvas", "bcrypt", "argon2",
    "fsevents", "re2", "farmhash", "xxhash-addon", "bufferutil", "utf-8-validate",
    "ssh2", "cpu-features", "dtrace-provider", "isolated-vm", "lightningcss", "oracledb",
    "mongodb-client-encryption", "nodemailer", "sharp", "playwright", "puppeteer", "puppeteer-core", "electron"
  ],
  plugins: [esbuildPluginPino({ transports: ["pino-pretty"] })],
  banner: {
    js: `import { createRequire as __bannerCrReq } from 'node:module';\nimport __bannerPath from 'node:path';\nimport __bannerUrl from 'node:url';\nglobalThis.require = __bannerCrReq(import.meta.url);\nglobalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);\nglobalThis.__dirname = __bannerPath.dirname(globalThis.__filename);`,
  },
});
