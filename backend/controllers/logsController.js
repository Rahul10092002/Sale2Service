import MessageLog from "../models/MessageLog.js";
import ReminderLog from "../models/ReminderLog.js";

/**
 * Get reminder logs with pagination and filtering
 */
export const getReminderLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      entity_type,
      message_status,
      start_date,
      end_date,
      recipient_number,
    } = req.query;

    const skip = (page - 1) * limit;
    const query = { deleted_at: null };

    // Apply filters
    if (entity_type) query.entity_type = entity_type;
    if (message_status) query.message_status = message_status;
    if (recipient_number) {
      query.recipient_number = { $regex: recipient_number, $options: "i" };
    }

    // Date range filter
    if (start_date || end_date) {
      query.createdAt = {};
      if (start_date) query.createdAt.$gte = new Date(start_date);
      if (end_date) query.createdAt.$lte = new Date(end_date);
    }

    const [logs, total] = await Promise.all([
      ReminderLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("reminder_rule_id", "rule_name rule_type")
        .lean(),
      ReminderLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching reminder logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reminder logs",
      error: error.message,
    });
  }
};

/**
 * Get reminder logs statistics
 */
export const getReminderStats = async (req, res) => {
  try {
    const { start_date, end_date, entity_type } = req.query;

    const matchStage = { deleted_at: null };

    // Apply date filter if provided
    if (start_date || end_date) {
      matchStage.createdAt = {};
      if (start_date) matchStage.createdAt.$gte = new Date(start_date);
      if (end_date) matchStage.createdAt.$lte = new Date(end_date);
    }

    // Apply entity type filter if provided
    if (entity_type) {
      matchStage.entity_type = entity_type;
    }

    const stats = await ReminderLog.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          sent: {
            $sum: {
              $cond: [
                { $in: ["$message_status", ["SENT", "DELIVERED", "READ"]] },
                1,
                0,
              ],
            },
          },
          failed: {
            $sum: { $cond: [{ $eq: ["$message_status", "FAILED"] }, 1, 0] },
          },
          pending: {
            $sum: { $cond: [{ $eq: ["$message_status", "PENDING"] }, 1, 0] },
          },
          delivered: {
            $sum: { $cond: [{ $eq: ["$message_status", "DELIVERED"] }, 1, 0] },
          },
        },
      },
    ]);

    // Get stats by entity type
    const entityStats = await ReminderLog.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$entity_type",
          count: { $sum: 1 },
          sent: {
            $sum: {
              $cond: [
                { $in: ["$message_status", ["SENT", "DELIVERED", "READ"]] },
                1,
                0,
              ],
            },
          },
          failed: {
            $sum: { $cond: [{ $eq: ["$message_status", "FAILED"] }, 1, 0] },
          },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Get stats by day for the last 7 days
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const dailyStats = await ReminderLog.aggregate([
      {
        $match: {
          deleted_at: null,
          createdAt: { $gte: last7Days },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          },
          count: { $sum: 1 },
          sent: {
            $sum: {
              $cond: [
                { $in: ["$message_status", ["SENT", "DELIVERED", "READ"]] },
                1,
                0,
              ],
            },
          },
          failed: {
            $sum: { $cond: [{ $eq: ["$message_status", "FAILED"] }, 1, 0] },
          },
        },
      },
      { $sort: { "_id.date": -1 } },
    ]);

    res.json({
      success: true,
      data: {
        summary: stats[0] || {
          total: 0,
          sent: 0,
          failed: 0,
          pending: 0,
          delivered: 0,
        },
        byEntityType: entityStats,
        dailyStats,
      },
    });
  } catch (error) {
    console.error("Error fetching reminder stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reminder statistics",
      error: error.message,
    });
  }
};

/**
 * Get message logs (legacy logs)
 */
export const getMessageLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      messageType,
      start_date,
      end_date,
      destination,
    } = req.query;

    const skip = (page - 1) * limit;
    const query = {};

    // Apply filters
    if (status) query.status = status;
    if (messageType) query.messageType = messageType;
    if (destination) {
      query.destination = { $regex: destination, $options: "i" };
    }

    // Date range filter
    if (start_date || end_date) {
      query.createdAt = {};
      if (start_date) query.createdAt.$gte = new Date(start_date);
      if (end_date) query.createdAt.$lte = new Date(end_date);
    }

    const [logs, total] = await Promise.all([
      MessageLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      MessageLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching message logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch message logs",
      error: error.message,
    });
  }
};

/**
 * Get recent reminder activity
 */
export const getRecentActivity = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const recentActivity = await ReminderLog.find({ deleted_at: null })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate("reminder_rule_id", "rule_name rule_type")
      .select(
        "entity_type recipient_name message_status sent_at createdAt reminder_rule_id entity_id",
      )
      .lean();

    res.json({
      success: true,
      data: recentActivity,
    });
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch recent activity",
      error: error.message,
    });
  }
};
