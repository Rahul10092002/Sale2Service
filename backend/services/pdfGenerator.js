import ejs from "ejs";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname, resolve, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Resolve the Chrome executable path.
 * Priority:
 *  1. PUPPETEER_EXECUTABLE_PATH env var (manual override)
 *  2. Project-local cache installed by scripts/install-chrome.js
 *     (.cache/puppeteer lives INSIDE the repo so it survives Render's
 *      separate build vs. runtime HOME directories)
 *  3. Fall back to whatever puppeteer.executablePath() returns
 */
function resolveChromePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  // 1. Project-local cache: backend/.cache/puppeteer/chrome/<version>/chrome-linux64/chrome
  const localCacheDir = resolve(__dirname, "../.cache/puppeteer/chrome");
  if (fs.existsSync(localCacheDir)) {
    const versions = fs.readdirSync(localCacheDir);
    if (versions.length > 0) {
      const latest = versions.sort().at(-1);
      const candidateLinux = join(localCacheDir, latest, "chrome-linux64", "chrome");
      if (fs.existsSync(candidateLinux)) return candidateLinux;
      const candidateWin = join(localCacheDir, latest, "chrome-win64", "chrome.exe");
      if (fs.existsSync(candidateWin)) return candidateWin;
    }
  }

  // 2. Standard installed Chrome / Edge (Windows, Linux, macOS)
  const systemCandidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];

  for (const p of systemCandidates) {
    if (fs.existsSync(p)) return p;
  }

  // 3. Fall back to puppeteer.executablePath() if it exists on disk
  try {
    const puppeteerPath = puppeteer.executablePath();
    if (puppeteerPath && fs.existsSync(puppeteerPath)) return puppeteerPath;
  } catch {
    // Puppeteer couldn't find its cached binary
  }

  return undefined;
}

export class PDFGenerator {
  constructor() {}

  // Render EJS template with data
  async renderTemplate(templatePath, templateData) {
    try {
      const htmlContent = await ejs.renderFile(templatePath, templateData);
      return htmlContent;
    } catch (error) {
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  // Convert HTML to PDF
  async generatePDF(htmlContent, outputPath, options = {}) {
    const chromePath = resolveChromePath();
    const launchOptions = {
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
      headless: true,
      ...(chromePath ? { executablePath: chromePath } : {}),
    };
    const browser = await puppeteer.launch(launchOptions);

    try {
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(60000);
      page.setDefaultTimeout(60000);
      const waitUntil = options.waitUntil || "domcontentloaded";
      const timeout = options.timeout !== undefined ? options.timeout : 60000;
      await page.setContent(htmlContent, { waitUntil, timeout });

      // Ensure all images have finished loading (resolves on load, error, or 2.5s safety timeout)
      await page.evaluate(() =>
        Promise.all(
          Array.from(document.images).map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise((res) => {
                  img.addEventListener("load", res, { once: true });
                  img.addEventListener("error", res, { once: true });
                  setTimeout(res, 2500);
                }),
          ),
        ),
      );

      const pdfOptions = {
        path: outputPath,
        format: options.format || "A4",
        printBackground: true,
        margin: options.margin || {
          top: "20mm",
          right: "20mm",
          bottom: "20mm",
          left: "20mm",
        },
      };

      await page.pdf(pdfOptions);
    } catch (error) {
      throw new Error(`PDF generation failed: ${error.message}`);
    } finally {
      await browser.close();
    }
  }

  // Complete workflow: template to PDF
  async createPDFFromTemplate(
    templatePath,
    templateData,
    outputPath,
    options = {},
  ) {
    const htmlContent = await this.renderTemplate(templatePath, templateData);
    await this.generatePDF(htmlContent, outputPath, options);
    return outputPath;
  }

  // Generate PDF and return buffer instead of saving to file
  async generatePDFBuffer(htmlContent, options = {}) {
    const chromePath = resolveChromePath();
    const launchOptions = {
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
      headless: true,
      ...(chromePath ? { executablePath: chromePath } : {}),
    };
    const browser = await puppeteer.launch(launchOptions);

    try {
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(60000);
      page.setDefaultTimeout(60000);
      const waitUntil = options.waitUntil || "domcontentloaded";
      const timeout = options.timeout !== undefined ? options.timeout : 60000;
      await page.setContent(htmlContent, { waitUntil, timeout });

      // Ensure all images have finished loading (resolves on load, error, or 2.5s safety timeout)
      await page.evaluate(() =>
        Promise.all(
          Array.from(document.images).map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise((res) => {
                  img.addEventListener("load", res, { once: true });
                  img.addEventListener("error", res, { once: true });
                  setTimeout(res, 2500);
                }),
          ),
        ),
      );

      const pdfOptions = {
        format: options.format || "A4",
        printBackground: true,
        margin: options.margin || {
          top: "20mm",
          right: "20mm",
          bottom: "20mm",
          left: "20mm",
        },
      };

      const pdfBuffer = await page.pdf(pdfOptions);
      return pdfBuffer;
    } catch (error) {
      throw new Error(`PDF generation failed: ${error.message}`);
    } finally {
      await browser.close();
    }
  }

  // Generate PDF buffer from template
  async createPDFBufferFromTemplate(templatePath, templateData, options = {}) {
    const htmlContent = await this.renderTemplate(templatePath, templateData);
    const pdfBuffer = await this.generatePDFBuffer(htmlContent, options);
    return pdfBuffer;
  }
}
