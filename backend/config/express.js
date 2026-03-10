import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

export const expressConfig = (app) => {
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:9000", // for local dev
    "https://health.dev.robosensy.in",
    "https://health.robosensy.in",
    "https://robosensy.in",
    "http://192.168.1.76:5173",
    "http://192.168.1.76:5174",
  ];

  app.use(
    cors({
      origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true, // allow cookies
      optionsSuccessStatus: 200,
    }),
  );

  // Apply this before any routes that return cookies
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: false, limit: "50mb" }));

  // Disable ETag generation to avoid 304 responses for API endpoints
  app.set("etag", false);

  // Prevent clients from caching API responses (helps avoid 304 Not Modified on API GETs)
  app.use((req, res, next) => {
    // Only apply to API routes (optional): adjust if your API routes live under /api or similar
    res.setHeader("Cache-Control", "no-store");
    next();
  });
};
