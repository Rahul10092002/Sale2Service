import ejs from "ejs";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

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
    const launchOptions = {
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
      ],
      headless: true,
    };
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    const browser = await puppeteer.launch(launchOptions);

    try {
      const page = await browser.newPage();
      // Wait for network to be mostly idle so external resources (images) load
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      // Ensure all images have finished loading (resolves even on error)
      await page.evaluate(() =>
        Promise.all(
          Array.from(document.images).map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise((res) => {
                  img.addEventListener("load", res);
                  img.addEventListener("error", res);
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
    const launchOptions = {
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
      ],
      headless: true,
    };
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    const browser = await puppeteer.launch(launchOptions);

    try {
      const page = await browser.newPage();
      // Wait for network to be mostly idle so external resources (images) load
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      // Ensure all images have finished loading (resolves even on error)
      await page.evaluate(() =>
        Promise.all(
          Array.from(document.images).map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise((res) => {
                  img.addEventListener("load", res);
                  img.addEventListener("error", res);
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
