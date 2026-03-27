/**
 * Puppeteer configuration.
 * Sets the cache directory to a path INSIDE the project tree so the
 * Chrome binary installed during the build phase is available at runtime
 * on Render (and similar PaaS platforms where $HOME may differ between
 * the build and runtime containers).
 */
const { join } = require("path");

module.exports = {
  cacheDirectory: join(__dirname, ".cache", "puppeteer"),
};
