import express from "express";
import {
  getReminderLogs,
  getReminderStats,
  getMessageLogs,
  getRecentActivity,
} from "../controllers/logsController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route GET /v1/logs/reminders
 * @desc Get reminder logs with pagination and filtering
 * @access Private
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 20)
 * @query {string} entity_type - Filter by entity type (INVOICE, PRODUCT, SERVICE, CUSTOMER)
 * @query {string} message_status - Filter by message status (PENDING, SENT, DELIVERED, FAILED, READ)
 * @query {string} start_date - Start date filter (ISO format)
 * @query {string} end_date - End date filter (ISO format)
 * @query {string} recipient_number - Filter by recipient phone number
 */
router.get("/reminders", getReminderLogs);

/**
 * @route GET /v1/logs/stats
 * @desc Get reminder statistics and analytics
 * @access Private
 * @query {string} start_date - Start date filter (ISO format)
 * @query {string} end_date - End date filter (ISO format)
 * @query {string} entity_type - Filter by entity type
 */
router.get("/stats", getReminderStats);

/**
 * @route GET /v1/logs/messages
 * @desc Get legacy message logs
 * @access Private
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 20)
 * @query {string} status - Filter by status (success, failed, error)
 * @query {string} messageType - Filter by message type
 * @query {string} start_date - Start date filter (ISO format)
 * @query {string} end_date - End date filter (ISO format)
 * @query {string} destination - Filter by destination phone number
 */
router.get("/messages", getMessageLogs);

/**
 * @route GET /v1/logs/recent
 * @desc Get recent reminder activity
 * @access Private
 * @query {number} limit - Number of recent activities (default: 10)
 */
router.get("/recent", getRecentActivity);

export default router;
