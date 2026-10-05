import MessageLog from "../models/MessageLog.js";
import ReminderLog from "../models/ReminderLog.js";

/**
 * Get reminder logs with pagination and filtering
 */
import mongoose from "mongoose";

/** Resolve shop from denormalized log.shop_id or linked invoice / service / product */
function buildReminderLogShopScopeStages(shopId) {
  if (shopId == null || shopId === "") return [];
  const shopOid = new mongoose.Types.ObjectId(shopId);
  return [
    {
      $addFields: {
        entityObjectId: {
          $cond: {
            if: {
              $and: [
                { $ne: ["$entity_id", null] },
                { $ne: ["$entity_id", ""] },
              ],
            },
            then: { $toObjectId: "$entity_id" },
            else: null,
          },
        },
      },
    },
    {
      $lookup: {
        from: "invoices",
        localField: "entityObjectId",
        foreignField: "_id",
        as: "invoice",
      },
    },
    {
      $lookup: {
        from: "serviceschedules",
        localField: "entityObjectId",
        foreignField: "_id",
        as: "service",
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "entityObjectId",
        foreignField: "_id",
        as: "product",
      },
    },
    {
      $addFields: {
        resolved_shop_id: {
          $ifNull: [
            "$shop_id",
            {
              $ifNull: [
                { $arrayElemAt: ["$invoice.shop_id", 0] },
                {
                  $ifNull: [
                    { $arrayElemAt: ["$service.shop_id", 0] },
                    { $arrayElemAt: ["$product.shop_id", 0] },
                  ],
                },
              ],
            },
          ],
        },
      },
    },
    {
      $match: {
        resolved_shop_id: shopOid,
      },
    },
  ];
}

export const getReminderLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      entity_type,
      message_status,
      start_date,
      end_date,
      recipient_number,
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const { user } = req;
    const shop_id = user?.shopId;
    const match = {
      deleted_at: null,
    };

    // if(shop_id) match.shop_id = shop_id;
    if (entity_type) match.entity_type = entity_type;
    if (message_status) match.message_status = message_status;

    if (recipient_number) {
      match.recipient_number = {
        $regex: recipient_number,
        $options: "i",
      };
    }

    if (start_date || end_date) {
      match.createdAt = {};
      if (start_date) match.createdAt.$gte = new Date(start_date);
      if (end_date) match.createdAt.$lte = new Date(end_date);
    }

    const pipeline = [
      { $match: match },

      // 🔹 Convert entity_id → ObjectId
      {
        $addFields: {
          entityObjectId: {
            $toObjectId: "$entity_id",
          },
        },
      },

      // 🔹 Lookup INVOICE
      {
        $lookup: {
          from: "invoices",
          localField: "entityObjectId",
          foreignField: "_id",
          as: "invoice",
        },
      },

      // 🔹 Lookup SERVICE
      {
        $lookup: {
          from: "serviceschedules",
          localField: "entityObjectId",
          foreignField: "_id",
          as: "service",
        },
      },

      // 🔹 Lookup PRODUCT (if needed)
      {
        $lookup: {
          from: "products",
          localField: "entityObjectId",
          foreignField: "_id",
          as: "product",
        },
      },

      // Prefer denormalized shop_id on the log; else resolve from linked entity
      {
        $addFields: {
          resolved_shop_id: {
            $ifNull: [
              "$shop_id",
              {
                $ifNull: [
                  { $arrayElemAt: ["$invoice.shop_id", 0] },
                  {
                    $ifNull: [
                      { $arrayElemAt: ["$service.shop_id", 0] },
                      { $arrayElemAt: ["$product.shop_id", 0] },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },

      ...(shop_id
        ? [
            {
              $match: {
                resolved_shop_id: new mongoose.Types.ObjectId(shop_id),
              },
            },
          ]
        : []),

      // 🔹 Lookup reminder rule
      {
        $lookup: {
          from: "reminderrules",
          localField: "reminder_rule_id",
          foreignField: "_id",
          as: "reminder_rule",
        },
      },
      {
        $unwind: {
          path: "$reminder_rule",
          preserveNullAndEmptyArrays: true,
        },
      },

      { $sort: { createdAt: -1 } },

      {
        $facet: {
          logs: [{ $skip: skip }, { $limit: limitNum }],
          totalCount: [{ $count: "total" }],
        },
      },
    ];

    const result = await ReminderLog.aggregate(pipeline);

    const logs = result[0]?.logs || [];
    const total = result[0]?.totalCount[0]?.total || 0;

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
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
    const shopId = req.user?.shopId;

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

    const shopScopeStages = buildReminderLogShopScopeStages(shopId);

    const stats = await ReminderLog.aggregate([
      { $match: matchStage },
      ...shopScopeStages,
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
      ...shopScopeStages,
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

    const dailyMatch = {
      deleted_at: null,
      createdAt: { $gte: last7Days },
    };

    const dailyStats = await ReminderLog.aggregate([
      { $match: dailyMatch },
      ...shopScopeStages,
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
      campaignName,
      delivery_status,
      search,
      start_date,
      end_date,
      destination,
    } = req.query;

    const limitNum = parseInt(limit, 10) || 20;
    const pageNum = parseInt(page, 10) || 1;
    const skip = (pageNum - 1) * limitNum;
    const query = {};

    // Apply filters
    if (status) query.status = status;
    if (messageType) query.messageType = messageType;
    if (campaignName) query.campaignName = campaignName;
    if (delivery_status) {
      if (["read", "delivered", "sent", "failed"].includes(delivery_status)) {
        query["meta.delivery_status"] = delivery_status;
      }
    }

    if (search) {
      query.$or = [
        { destination: { $regex: search, $options: "i" } },
        { userName: { $regex: search, $options: "i" } },
        { campaignName: { $regex: search, $options: "i" } },
      ];
    } else if (destination) {
      query.destination = { $regex: destination, $options: "i" };
    }

    // Date range filter
    if (start_date || end_date) {
      query.createdAt = {};
      if (start_date) query.createdAt.$gte = new Date(start_date);
      if (end_date) query.createdAt.$lte = new Date(end_date);
    }

    const [logs, total, templates, summaryStats] = await Promise.all([
      MessageLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      MessageLog.countDocuments(query),
      MessageLog.distinct("campaignName"),
      MessageLog.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            sent: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ["$meta.delivery_status", "sent"] },
                      {
                        $and: [
                          { $eq: ["$status", "success"] },
                          {
                            $or: [
                              { $eq: [{ $ifNull: ["$meta.delivery_status", null] }, null] },
                              { $eq: ["$meta.delivery_status", ""] }
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  1,
                  0
                ]
              },
            },
            delivered: {
              $sum: {
                $cond: [{ $eq: ["$meta.delivery_status", "delivered"] }, 1, 0],
              },
            },
            read: {
              $sum: {
                $cond: [{ $eq: ["$meta.delivery_status", "read"] }, 1, 0],
              },
            },
            failed: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ["$meta.delivery_status", "failed"] },
                      { $eq: ["$status", "failed"] },
                      { $eq: ["$status", "error"] },
                    ]
                  },
                  1,
                  0
                ]
              },
            },
          },
        },
      ]),
    ]);

    const summary = summaryStats[0] || {
      total: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
    };

    res.json({
      success: true,
      data: {
        logs,
        summary,
        templates: templates.filter(Boolean),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
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
    const shopId = req.user?.shopId;
    const limitNum = parseInt(limit, 10);

    const pipeline = [
      { $match: { deleted_at: null } },
      ...buildReminderLogShopScopeStages(shopId),
      { $sort: { createdAt: -1 } },
      { $limit: limitNum },
      {
        $lookup: {
          from: "reminderrules",
          localField: "reminder_rule_id",
          foreignField: "_id",
          as: "_ruleDoc",
        },
      },
      {
        $unwind: {
          path: "$_ruleDoc",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          reminder_rule_id: {
            $cond: {
              if: "$_ruleDoc._id",
              then: {
                _id: "$_ruleDoc._id",
                rule_name: "$_ruleDoc.rule_name",
                rule_type: "$_ruleDoc.rule_type",
              },
              else: null,
            },
          },
        },
      },
      {
        $project: {
          invoice: 0,
          service: 0,
          product: 0,
          entityObjectId: 0,
          resolved_shop_id: 0,
          _ruleDoc: 0,
        },
      },
    ];

    const recentActivity = await ReminderLog.aggregate(pipeline);

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
