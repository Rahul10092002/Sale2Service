/**
 * Installs the Puppeteer-managed Chrome into the project directory so that
 * the browser binary is available at runtime on Render (and similar PaaS
 * platforms that separate the build and runtime HOME directories).
 *
 * Chrome is stored in <project-root>/.cache/puppeteer so it travels with the
 * deployed bundle instead of living in a HOME-relative path that may differ
 * between the build and runtime containers.
 */
import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cacheDir = resolve(__dirname, "../.cache/puppeteer");

console.log(`[install-chrome] Installing Chrome to: ${cacheDir}`);
process.env.PUPPETEER_CACHE_DIR = cacheDir;

try {
  execSync("npx puppeteer browsers install chrome", {
    stdio: "inherit",
    env: process.env,
  });
} catch (err) {
  console.error("[install-chrome] Chrome installation failed:", err.message);
  process.exit(1);
}
