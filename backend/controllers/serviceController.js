import mongoose from "mongoose";
import ServiceSchedule from "../models/ServiceSchedule.js";
import ServiceVisit from "../models/ServiceVisit.js";
import ServicePlan from "../models/ServicePlan.js";
import InvoiceItem from "../models/InvoiceItem.js";

export default class ServiceController {
  /**
   * Get service schedules for a shop
   */
  async getServiceSchedules(req, res) {
    try {
      const { user } = req;
      const { page = 1, limit = 10, status, date_from, date_to } = req.query;

      // Build query to filter by shop through service plan
      const matchQuery = {
        deleted_at: null,
      };

      if (status) {
        matchQuery.status = status;
      }

      if (date_from || date_to) {
        matchQuery.scheduled_date = {};
        if (date_from) {
          matchQuery.scheduled_date.$gte = new Date(date_from);
        }
        if (date_to) {
          matchQuery.scheduled_date.$lte = new Date(date_to);
        }
      }

      const schedules = await ServiceSchedule.aggregate([
        {
          $lookup: {
            from: "serviceplans",
            localField: "service_plan_id",
            foreignField: "_id",
            as: "service_plan",
          },
        },
        {
          $unwind: "$service_plan",
        },
        {
          $match: {
            "service_plan.shop_id": new mongoose.Types.ObjectId(user.shopId),
            ...matchQuery,
          },
        },
        {
          $lookup: {
            from: "invoiceitems",
            localField: "service_plan.invoice_item_id",
            foreignField: "_id",
            as: "invoice_item",
          },
        },
        {
          $unwind: "$invoice_item",
        },
        {
          $lookup: {
            from: "invoices",
            localField: "invoice_item.invoice_id",
            foreignField: "_id",
            as: "invoice",
          },
        },
        {
          $unwind: "$invoice",
        },
        {
          $lookup: {
            from: "customers",
            localField: "invoice.customer_id",
            foreignField: "_id",
            as: "customer",
          },
        },
        {
          $unwind: "$customer",
        },
        {
          $project: {
            service_schedule_id: 1,
            scheduled_date: 1,
            service_number: 1,
            status: 1,
            original_date: 1,
            rescheduled_date: 1,
            reschedule_reason: 1,
            "customer.full_name": 1,
            "customer.whatsapp_number": 1,
            "customer.address": 1,
            "invoice_item.product_name": 1,
            "invoice_item.serial_number": 1,
            "invoice_item.company": 1,
            "invoice.invoice_number": 1,
            createdAt: 1,
          },
        },
        {
          $sort: { scheduled_date: 1 },
        },
        {
          $skip: (page - 1) * limit,
        },
        {
          $limit: parseInt(limit),
        },
      ]);

      // Get total count
      const totalResult = await ServiceSchedule.aggregate([
        {
          $lookup: {
            from: "serviceplans",
            localField: "service_plan_id",
            foreignField: "_id",
            as: "service_plan",
          },
        },
        {
          $unwind: "$service_plan",
        },
        {
          $match: {
            "service_plan.shop_id": new mongoose.Types.ObjectId(user.shopId),
            ...matchQuery,
          },
        },
        {
          $count: "total",
        },
      ]);

      const total = totalResult[0]?.total || 0;

      res.json({
        success: true,
        data: {
          schedules,
          pagination: {
            current: parseInt(page),
            total: Math.ceil(total / limit),
            count: schedules.length,
            totalRecords: total,
          },
        },
      });
    } catch (error) {
      console.error("Get service schedules error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get service schedules",
      });
    }
  }

  /**
   * Reschedule a service
   */
  async rescheduleService(req, res) {
    try {
      const { id } = req.params;
      const { new_date, reason, rescheduled_by = "SHOP" } = req.body;
      const { user } = req;

      if (!new_date) {
        return res.status(400).json({
          success: false,
          message: "New date is required",
        });
      }

      // Get service schedule with shop validation
      const schedule = await ServiceSchedule.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(id),
            deleted_at: null,
          },
        },
        {
          $lookup: {
            from: "serviceplans",
            localField: "service_plan_id",
            foreignField: "_id",
            as: "service_plan",
          },
        },
        {
          $unwind: "$service_plan",
        },
        {
          $match: {
            "service_plan.shop_id": new mongoose.Types.ObjectId(user.shopId),
          },
        },
      ]);

      if (!schedule || schedule.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Service schedule not found or access denied",
        });
      }

      const serviceSchedule = schedule[0];

      if (
        serviceSchedule.status !== "PENDING" &&
        serviceSchedule.status !== "MISSED"
      ) {
        return res.status(400).json({
          success: false,
          message: "Only pending or missed services can be rescheduled",
        });
      }

      // Update schedule
      const updateData = {
        scheduled_date: new Date(new_date),
        status: "RESCHEDULED",
        rescheduled_date: new Date(new_date),
        reschedule_reason: reason,
        rescheduled_by,
        rescheduled_at: new Date(),
      };

      await ServiceSchedule.findByIdAndUpdate(id, updateData);

      res.json({
        success: true,
        message: "Service rescheduled successfully",
      });
    } catch (error) {
      console.error("Reschedule service error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to reschedule service",
      });
    }
  }

  /**
   * Create service visit record
   */
  async createServiceVisit(req, res) {
    const session = await mongoose.startSession();

    try {
      await session.startTransaction();

      const {
        service_schedule_id,
        visit_date,
        service_type,
        technician_name,
        technician_contact,
        issue_reported,
        work_done,
        next_action,
        service_duration_minutes,
        parts_replaced = [],
        service_cost = 0,
        customer_rating,
        customer_feedback,
        internal_notes,
      } = req.body;

      const { user } = req;

      // Validate required fields
      if (
        !service_schedule_id ||
        !visit_date ||
        !service_type ||
        !technician_name ||
        !issue_reported ||
        !work_done
      ) {
        return res.status(400).json({
          success: false,
          message: "All required fields must be provided",
        });
      }

      // Validate service schedule exists and belongs to user's shop
      const schedule = await ServiceSchedule.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(service_schedule_id),
            deleted_at: null,
          },
        },
        {
          $lookup: {
            from: "serviceplans",
            localField: "service_plan_id",
            foreignField: "_id",
            as: "service_plan",
          },
        },
        {
          $unwind: "$service_plan",
        },
        {
          $match: {
            "service_plan.shop_id": new mongoose.Types.ObjectId(user.shopId),
          },
        },
      ]);

      if (!schedule || schedule.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Service schedule not found or access denied",
        });
      }

      const serviceSchedule = schedule[0];

      // Check if visit already exists
      const existingVisit = await ServiceVisit.findOne({
        service_schedule_id,
        deleted_at: null,
      }).session(session);

      if (existingVisit) {
        return res.status(400).json({
          success: false,
          message: "Service visit record already exists for this schedule",
        });
      }

      // Create service visit
      const serviceVisit = new ServiceVisit({
        service_schedule_id,
        visit_date: new Date(visit_date),
        service_type,
        technician_name,
        technician_contact,
        issue_reported,
        work_done,
        next_action,
        service_duration_minutes,
        parts_replaced,
        service_cost,
        customer_rating,
        customer_feedback,
        internal_notes,
        created_by: user.userId,
      });

      await serviceVisit.save({ session });

      // Update service schedule status to completed
      await ServiceSchedule.findByIdAndUpdate(
        service_schedule_id,
        { status: "COMPLETED" },
        { session },
      );

      await session.commitTransaction();

      res.status(201).json({
        success: true,
        data: serviceVisit,
        message: "Service visit recorded successfully",
      });
    } catch (error) {
      await session.abortTransaction();
      console.error("Create service visit error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to record service visit",
      });
    } finally {
      session.endSession();
    }
  }

  async getServiceVisits(req, res) {
    try {
      const { user } = req;
      const {
        page = 1,
        limit = 10,
        technician,
        date_from,
        date_to,
      } = req.query;

      const matchQuery = {
        deleted_at: null,
      };

      if (technician) {
        matchQuery.technician_name = new RegExp(technician, "i");
      }

      if (date_from || date_to) {
        matchQuery.visit_date = {};
        if (date_from) {
          matchQuery.visit_date.$gte = new Date(date_from);
        }
        if (date_to) {
          matchQuery.visit_date.$lte = new Date(date_to);
        }
      }

      const visits = await ServiceVisit.aggregate([
        {
          $lookup: {
            from: "serviceschedules",
            localField: "service_schedule_id",
            foreignField: "_id",
            as: "service_schedule",
          },
        },
        {
          $unwind: "$service_schedule",
        },
        {
          $lookup: {
            from: "serviceplans",
            localField: "service_schedule.service_plan_id",
            foreignField: "_id",
            as: "service_plan",
          },
        },
        {
          $unwind: "$service_plan",
        },
        {
          $match: {
            "service_plan.shop_id": new mongoose.Types.ObjectId(user.shopId),
            ...matchQuery,
          },
        },
        {
          $lookup: {
            from: "invoiceitems",
            localField: "service_plan.invoice_item_id",
            foreignField: "_id",
            as: "invoice_item",
          },
        },
        {
          $unwind: "$invoice_item",
        },
        {
          $lookup: {
            from: "invoices",
            localField: "invoice_item.invoice_id",
            foreignField: "_id",
            as: "invoice",
          },
        },
        {
          $unwind: "$invoice",
        },
        {
          $lookup: {
            from: "customers",
            localField: "invoice.customer_id",
            foreignField: "_id",
            as: "customer",
          },
        },
        {
          $unwind: "$customer",
        },
        {
          $project: {
            service_visit_id: 1,
            visit_date: 1,
            service_type: 1,
            technician_name: 1,
            technician_contact: 1,
            issue_reported: 1,
            work_done: 1,
            service_duration_minutes: 1,
            parts_replaced: 1,
            service_cost: 1,
            customer_rating: 1,
            customer_feedback: 1,
            "customer.full_name": 1,
            "customer.whatsapp_number": 1,
            "invoice_item.product_name": 1,
            "invoice_item.serial_number": 1,
            "invoice.invoice_number": 1,
            "service_schedule.service_number": 1,
            createdAt: 1,
          },
        },
        {
          $sort: { visit_date: -1 },
        },
        {
          $skip: (page - 1) * limit,
        },
        {
          $limit: parseInt(limit),
        },
      ]);

      // Get total count
      const totalResult = await ServiceVisit.aggregate([
        {
          $lookup: {
            from: "serviceschedules",
            localField: "service_schedule_id",
            foreignField: "_id",
            as: "service_schedule",
          },
        },
        {
          $unwind: "$service_schedule",
        },
        {
          $lookup: {
            from: "serviceplans",
            localField: "service_schedule.service_plan_id",
            foreignField: "_id",
            as: "service_plan",
          },
        },
        {
          $unwind: "$service_plan",
        },
        {
          $match: {
            "service_plan.shop_id": new mongoose.Types.ObjectId(user.shopId),
            ...matchQuery,
          },
        },
        {
          $count: "total",
        },
      ]);

      const total = totalResult[0]?.total || 0;

      res.json({
        success: true,
        data: {
          visits,
          pagination: {
            current: parseInt(page),
            total: Math.ceil(total / limit),
            count: visits.length,
            totalRecords: total,
          },
        },
      });
    } catch (error) {
      console.error("Get service visits error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get service visits",
      });
    }
  }

  /**
   * Get dashboard statistics
   */
  async getServiceDashboard(req, res) {
    try {
      const { user } = req;
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      // Aggregate service statistics
      const stats = await ServiceSchedule.aggregate([
        {
          $lookup: {
            from: "serviceplans",
            localField: "service_plan_id",
            foreignField: "_id",
            as: "service_plan",
          },
        },
        {
          $unwind: "$service_plan",
        },
        {
          $match: {
            "service_plan.shop_id": new mongoose.Types.ObjectId(user.shopId),
            deleted_at: null,
          },
        },
        {
          $lookup: {
            from: "invoiceitems",
            localField: "service_plan.invoice_item_id",
            foreignField: "_id",
            as: "invoice_item",
          },
        },
        {
          $unwind: "$invoice_item",
        },
        {
          $addFields: {
            is_under_warranty: {
              $gt: ["$invoice_item.warranty_end_date", new Date()],
            },
          },
        },
        {
          $facet: {
            total: [{ $count: "count" }],
            pending: [{ $match: { status: "PENDING" } }, { $count: "count" }],
            completed: [
              { $match: { status: "COMPLETED" } },
              { $count: "count" },
            ],
            missed: [{ $match: { status: "MISSED" } }, { $count: "count" }],
            warrantyServices: [
              { $match: { is_under_warranty: true } },
              { $count: "count" },
            ],
            outOfWarrantyServices: [
              { $match: { is_under_warranty: false } },
              { $count: "count" },
            ],
            thisWeek: [
              {
                $match: {
                  scheduled_date: {
                    $gte: startOfWeek,
                    $lte: endOfWeek,
                  },
                },
              },
              { $count: "count" },
            ],
            overdue: [
              {
                $match: {
                  scheduled_date: { $lt: new Date() },
                  status: "PENDING",
                },
              },
              { $count: "count" },
            ],
            monthlyRevenue: [
              {
                $match: {
                  scheduled_date: {
                    $gte: startOfMonth,
                    $lte: endOfMonth,
                  },
                  status: "COMPLETED",
                },
              },
              {
                $group: {
                  _id: null,
                  total: { $sum: "$service_charge" },
                  warranty: {
                    $sum: {
                      $cond: [
                        "$is_under_warranty",
                        0, // Free warranty services
                        "$service_charge",
                      ],
                    },
                  },
                  paid: {
                    $sum: {
                      $cond: ["$is_under_warranty", "$service_charge", 0],
                    },
                  },
                },
              },
            ],
          },
        },
      ]);

      const result = stats[0];
      const revenueData = result.monthlyRevenue[0] || {
        total: 0,
        warranty: 0,
        paid: 0,
      };

      const dashboard = {
        total_services: result.total[0]?.count || 0,
        pending_services: result.pending[0]?.count || 0,
        completed_services: result.completed[0]?.count || 0,
        missed_services: result.missed[0]?.count || 0,
        warranty_services: result.warrantyServices[0]?.count || 0,
        out_of_warranty_services: result.outOfWarrantyServices[0]?.count || 0,
        this_week_services: result.thisWeek[0]?.count || 0,
        overdue_services: result.overdue[0]?.count || 0,
        monthly_service_revenue: revenueData.total,
        free_service_revenue: revenueData.warranty,
        paid_service_revenue: revenueData.paid,
        // Calculate additional metrics
        completion_rate:
          result.total[0]?.count > 0
            ? Math.round(
                ((result.completed[0]?.count || 0) / result.total[0].count) *
                  100,
              )
            : 0,
        // Service plans statistics
        active_service_plans: await ServicePlan.countDocuments({
          shop_id: user.shopId,
          is_active: true,
          deleted_at: null,
        }),
        avg_customer_rating: await this.getAverageCustomerRating(user.shopId),
      };

      res.json({
        success: true,
        data: dashboard,
      });
    } catch (error) {
      console.error("Get service dashboard error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get dashboard data",
      });
    }
  }

  /**
   * Get services organized by product with warranty information
   */
  async getServicesByProduct(req, res) {
    try {
      const { user } = req;
      const { warranty_filter = "all", limit = 20, page = 1 } = req.query;

      const skip = (page - 1) * limit;

      // Build aggregation pipeline
      const pipeline = [
        // Match shop's invoice items with service plans
        {
          $match: {
            shop_id: user.shopId,
            deleted_at: null,
            service_plan_id: { $exists: true, $ne: null },
          },
        },

        // Lookup invoice and customer info
        {
          $lookup: {
            from: "invoices",
            localField: "invoice_id",
            foreignField: "_id",
            as: "invoice",
          },
        },
        {
          $lookup: {
            from: "customers",
            localField: "invoice.customer_id",
            foreignField: "_id",
            as: "customer",
          },
        },

        // Lookup service plan
        {
          $lookup: {
            from: "serviceplans",
            localField: "service_plan_id",
            foreignField: "_id",
            as: "service_plan",
          },
        },

        // Lookup service schedules
        {
          $lookup: {
            from: "serviceschedules",
            localField: "service_plan_id",
            foreignField: "service_plan_id",
            as: "service_schedules",
            pipeline: [
              {
                $lookup: {
                  from: "servicevisits",
                  localField: "_id",
                  foreignField: "service_schedule_id",
                  as: "service_visit",
                },
              },
              {
                $addFields: {
                  service_visit: { $arrayElemAt: ["$service_visit", 0] },
                },
              },
              { $sort: { scheduled_date: -1 } },
            ],
          },
        },

        // Unwind arrays
        { $unwind: { path: "$invoice", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
        {
          $unwind: { path: "$service_plan", preserveNullAndEmptyArrays: true },
        },

        // Add warranty status field
        {
          $addFields: {
            is_under_warranty: {
              $gt: ["$warranty_end_date", new Date()],
            },
          },
        },

        // Filter by warranty status if specified
        ...(warranty_filter !== "all"
          ? [
              {
                $match: {
                  is_under_warranty: warranty_filter === "warranty",
                },
              },
            ]
          : []),

        // Project fields
        {
          $project: {
            _id: 1,
            invoice_item_id: "$_id",
            serial_number: 1,
            product_name: 1,
            product_category: 1,
            company: 1,
            model_number: 1,
            warranty_start_date: 1,
            warranty_end_date: 1,
            warranty_type: 1,
            is_under_warranty: 1,
            service_schedules: 1,
            customer_info: {
              full_name: "$customer.full_name",
              whatsapp_number: "$customer.whatsapp_number",
              address: "$customer.address",
            },
            invoice_info: {
              invoice_number: "$invoice.invoice_number",
              invoice_date: "$invoice.invoice_date",
            },
            service_plan_info: {
              service_interval_type: "$service_plan.service_interval_type",
              service_interval_value: "$service_plan.service_interval_value",
              service_description: "$service_plan.service_description",
              is_active: "$service_plan.is_active",
            },
          },
        },

        // Sort by most recent invoice
        { $sort: { "invoice_info.invoice_date": -1 } },

        // Pagination
        { $skip: skip },
        { $limit: parseInt(limit) },
      ];

      const products = await InvoiceItem.aggregate(pipeline);

      // Get total count for pagination
      const totalCountPipeline = [
        {
          $match: {
            shop_id: user.shopId,
            deleted_at: null,
            service_plan_id: { $exists: true, $ne: null },
          },
        },
        {
          $addFields: {
            is_under_warranty: {
              $gt: ["$warranty_end_date", new Date()],
            },
          },
        },
        ...(warranty_filter !== "all"
          ? [
              {
                $match: {
                  is_under_warranty: warranty_filter === "warranty",
                },
              },
            ]
          : []),
        { $count: "total" },
      ];

      const totalCountResult = await InvoiceItem.aggregate(totalCountPipeline);
      const totalCount = totalCountResult[0]?.total || 0;

      res.status(200).json({
        success: true,
        data: {
          products,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            totalProducts: totalCount,
            totalPages: Math.ceil(totalCount / limit),
          },
          warranty_filter,
        },
      });
    } catch (error) {
      console.error("Get services by product error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch services by product",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }

  /**
   * Helper method to calculate average customer rating
   */
  async getAverageCustomerRating(shopId) {
    try {
      const ratingStats = await ServiceVisit.aggregate([
        {
          $lookup: {
            from: "serviceschedules",
            localField: "service_schedule_id",
            foreignField: "_id",
            as: "schedule",
          },
        },
        {
          $unwind: "$schedule",
        },
        {
          $lookup: {
            from: "serviceplans",
            localField: "schedule.service_plan_id",
            foreignField: "_id",
            as: "service_plan",
          },
        },
        {
          $unwind: "$service_plan",
        },
        {
          $match: {
            "service_plan.shop_id": new mongoose.Types.ObjectId(shopId),
            customer_rating: { $exists: true, $ne: null },
            deleted_at: null,
          },
        },
        {
          $group: {
            _id: null,
            avgRating: { $avg: "$customer_rating" },
            totalRatings: { $sum: 1 },
          },
        },
      ]);

      return ratingStats[0]?.avgRating
        ? Math.round(ratingStats[0].avgRating * 10) / 10
        : 0;
    } catch (error) {
      console.error("Error calculating average customer rating:", error);
      return 0;
    }
  }

  /**
   * Mark a service schedule as complete
   */
  async markServiceComplete(req, res) {
    try {
      const { user } = req;
      const { id } = req.params;
      const {
        notes,
        amount_collected = 0,
        payment_method = "CASH",
        technician_name = "",
        issue_reported = "",
        work_done = "",
        service_type = "MAINTENANCE",
      } = req.body;

      // Validate required fields
      if (!technician_name?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Technician name is required",
        });
      }

      if (!issue_reported?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Issue reported is required",
        });
      }

      if (!work_done?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Work done description is required",
        });
      }

      // Find the service schedule and validate ownership FIRST
      const schedule =
        await ServiceSchedule.findById(id).populate("service_plan_id");

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: "Service schedule not found",
        });
      }

      // Verify the service belongs to user's shop
      if (schedule.service_plan_id.shop_id.toString() !== user.shopId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Check if already completed
      if (schedule.status === "COMPLETED") {
        return res.status(400).json({
          success: false,
          message: "Service is already marked as completed",
        });
      }

      // Map frontend service category to business service type
      const getBusinessServiceType = (
        category,
        serviceCharge,
        amountCollected,
      ) => {
        if (serviceCharge === 0) return "FREE";
        if (amountCollected >= serviceCharge) return "PAID";
        if (category === "WARRANTY_SERVICE" || amountCollected === 0)
          return "WARRANTY";
        return "GOODWILL";
      };

      const businessServiceType = getBusinessServiceType(
        service_type,
        schedule.service_charge || 0,
        parseFloat(amount_collected) || 0,
      );

      // Ensure required fields have proper values
      const finalIssueReported =
        issue_reported?.trim() || "Regular maintenance service";
      const finalWorkDone =
        work_done?.trim() || notes?.trim() || "Service completed successfully";
      const finalTechnicianName =
        technician_name?.trim() || "Unknown Technician";

      // Create service visit record with proper linking
      const serviceVisit = new ServiceVisit({
        service_schedule_id: schedule._id,
        visit_date: new Date(),
        service_type: businessServiceType,
        service_category: service_type,
        technician_name: finalTechnicianName,
        technician_contact: "",
        issue_reported: finalIssueReported,
        work_done: finalWorkDone,
        service_cost: schedule.service_charge || 0,
        amount_collected: parseFloat(amount_collected) || 0,
        payment_method: payment_method,
        internal_notes: notes || "",
        created_by: user.userId,
      });

      await serviceVisit.save();

      // Update schedule with completion details and link to service visit
      schedule.status = "COMPLETED";
      schedule.completed_at = new Date();
      schedule.completed_by = user.userId;
      schedule.amount_collected = parseFloat(amount_collected) || 0;
      schedule.service_visit_id = serviceVisit._id;

      // Update payment status based on amount collected vs service charge
      if (schedule.service_charge === 0) {
        schedule.payment_status = "FREE";
      } else if (schedule.amount_collected >= schedule.service_charge) {
        schedule.payment_status = "PAID";
      } else if (schedule.amount_collected > 0) {
        schedule.payment_status = "PARTIAL";
      } else {
        schedule.payment_status = "PENDING";
      }

      if (notes) schedule.notes = notes;
      await schedule.save();

      res.status(200).json({
        success: true,
        message: "Service marked as completed successfully",
        data: {
          schedule: schedule,
          visit: serviceVisit,
        },
      });
    } catch (error) {
      console.error("Error marking service complete:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * Cancel a service schedule
   */
  async cancelService(req, res) {
    try {
      const { user } = req;
      const { id } = req.params;
      const { reason } = req.body;

      // Find the service schedule and validate ownership
      const schedule =
        await ServiceSchedule.findById(id).populate("service_plan_id");

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: "Service schedule not found",
        });
      }

      // Verify the service belongs to user's shop
      if (schedule.service_plan_id.shop_id.toString() !== user.shopId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Check if already completed or cancelled
      if (schedule.status === "COMPLETED") {
        return res.status(400).json({
          success: false,
          message: "Cannot cancel a completed service",
        });
      }

      if (schedule.status === "CANCELLED") {
        return res.status(400).json({
          success: false,
          message: "Service is already cancelled",
        });
      }

      // Update schedule status
      schedule.status = "CANCELLED";
      schedule.cancelled_at = new Date();
      schedule.cancelled_by = user.userId;
      if (reason) schedule.cancellation_reason = reason;
      await schedule.save();

      res.status(200).json({
        success: true,
        message: "Service cancelled successfully",
        data: schedule,
      });
    } catch (error) {
      console.error("Error cancelling service:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
}

const serviceController = new ServiceController();
export { serviceController };
