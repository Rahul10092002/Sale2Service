import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { MongoDb } from "./config/mongoose.js";
import { authRouter } from "./routes/auth.js";
import { shopRouter } from "./routes/shop.js";
import { userRouter } from "./routes/user.js";
import { invoiceRouter } from "./routes/invoice.js";
import { customerRouter } from "./routes/customer.js";
import { productRouter } from "./routes/product.js";
import serviceRouter from "./routes/service.js";
import debugRouter from "./routes/debug.js";
import dashboardRouter from "./routes/dashboard.js";
import fileUploadRouter from "./routes/fileUpload.js";
import SchedulerService from "./scheduler/index.js";

dotenv.config();

const app = express();

// Connect to MongoDB
MongoDb();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Warranty & Sales Management System API",
    version: "1.0.0",
  });
});

// API Routes
app.use("/v1/auth", authRouter);
app.use("/v1/shop", shopRouter);
app.use("/v1/users", userRouter);
app.use("/v1/invoices", invoiceRouter);
app.use("/v1/customers", customerRouter);
app.use("/v1/products", productRouter);
app.use("/v1/services", serviceRouter);
// Removed unused service plan routes
app.use("/v1/dashboard", dashboardRouter);
app.use("/v1/files", fileUploadRouter);
// Dev-only debug endpoints
app.use("/v1/debug", debugRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    error_code: "NOT_FOUND",
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error_code: "SERVER_ERROR",
  });
});

const mainPort = process.env.PORT || 5000;

// Initialize scheduler and templates on startup
const initializeServices = async () => {
  try {
    // Start reminder scheduler
    const scheduler = new SchedulerService();
    scheduler.startScheduler();

    console.log("✅ Services initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing services:", error);
  }
};

app.listen(mainPort, "0.0.0.0", async () => {
  console.log(`🚀 Server started at PORT - ${mainPort}`);
  console.log(`📍 API Base URL: http://localhost:${mainPort}/v1`);

  // Initialize services after server starts
  await initializeServices();
});
