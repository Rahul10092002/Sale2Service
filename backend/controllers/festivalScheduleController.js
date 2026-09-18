import mongoose from "mongoose";
import FestivalSchedule from "../models/FestivalSchedule.js";
export default class FestivalScheduleController {
  /**
   * Create a new festival schedule
   * POST /festival-schedule
   */
  async createSchedule(req, res) {
    try {
      const { festival_name, schedule_date } = req.body;
      const { user } = req;

      if (!festival_name || !schedule_date) {
        return res.status(400).json({
          success: false,
          message: "Festival name and schedule date are required",
        });
      }

      // Check for duplicate schedule for the same date for this shop
      const dateStr = String(schedule_date).split("T")[0];
      const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
      const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

      const existingSchedule = await FestivalSchedule.findOne({
        shop_id: user.shopId,
        deleted_at: null,
        schedule_date: { $gte: startOfDay, $lte: endOfDay },
      });

      if (existingSchedule) {
        return res.status(400).json({
          success: false,
          message: `A festival schedule already exists for this date (${existingSchedule.festival_name})`,
        });
      }

      const newSchedule = await FestivalSchedule.create({
        shop_id: user.shopId,
        festival_name,
        schedule_date,
      });

      return res.status(201).json({
        success: true,
        message: "Festival schedule created successfully",
        data: newSchedule,
      });
    } catch (error) {
      console.error("createSchedule error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to create festival schedule",
      });
    }
  }

  /**
   * Get all festival schedules for a shop
   * GET /festival-schedule
   */
  async getSchedules(req, res) {
    try {
      const { user } = req;
      const { page = 1, limit = 10, search } = req.query;

      const query = { shop_id: user.shopId, deleted_at: null };

      if (search) {
        query.festival_name = { $regex: search, $options: "i" };
      }

      const skip = (page - 1) * parseInt(limit);

      const [schedules, totalCount] = await Promise.all([
        FestivalSchedule.find(query)
          .sort({ schedule_date: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        FestivalSchedule.countDocuments(query),
      ]);

      return res.json({
        success: true,
        data: {
          schedules,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      console.error("getSchedules error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch festival schedules",
      });
    }
  }

  /**
   * Get a single festival schedule by ID
   * GET /festival-schedule/:id
   */
  async getScheduleById(req, res) {
    try {
      const { id } = req.params;
      const { user } = req;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid schedule ID",
        });
      }

      const schedule = await FestivalSchedule.findOne({
        _id: id,
        shop_id: user.shopId,
        deleted_at: null,
      });

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: "Festival schedule not found",
        });
      }

      return res.json({
        success: true,
        data: schedule,
      });
    } catch (error) {
      console.error("getScheduleById error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch festival schedule",
      });
    }
  }

  /**
   * Update a festival schedule
   * PUT /festival-schedule/:id
   */
  async updateSchedule(req, res) {
    try {
      const { id } = req.params;
      const { festival_name, schedule_date } = req.body;
      const { user } = req;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid schedule ID",
        });
      }

      if (!festival_name && !schedule_date) {
        return res.status(400).json({
          success: false,
          message:
            "At least one field (festival_name or schedule_date) is required for update",
        });
      }

      if (schedule_date) {
        const dateStr = String(schedule_date).split("T")[0];
        const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
        const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

        const existingSchedule = await FestivalSchedule.findOne({
          shop_id: user.shopId,
          _id: { $ne: id },
          deleted_at: null,
          schedule_date: { $gte: startOfDay, $lte: endOfDay },
        });

        if (existingSchedule) {
          return res.status(400).json({
            success: false,
            message: `A festival schedule already exists for this date (${existingSchedule.festival_name})`,
          });
        }
      }

      const updateData = {};
      if (festival_name) updateData.festival_name = festival_name;
      if (schedule_date) updateData.schedule_date = schedule_date;

      const updatedSchedule = await FestivalSchedule.findOneAndUpdate(
        { _id: id, shop_id: user.shopId, deleted_at: null },
        updateData,
        { new: true, runValidators: true },
      );

      if (!updatedSchedule) {
        return res.status(404).json({
          success: false,
          message: "Festival schedule not found",
        });
      }

      return res.json({
        success: true,
        message: "Festival schedule updated successfully",
        data: updatedSchedule,
      });
    } catch (error) {
      console.error("updateSchedule error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to update festival schedule",
      });
    }
  }

  /**
   * Delete a festival schedule
   * DELETE /festival-schedule/:id
   */
  async deleteSchedule(req, res) {
    try {
      const { id } = req.params;
      const { user } = req;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid schedule ID",
        });
      }

      const schedule = await FestivalSchedule.findOne({
        _id: id,
        shop_id: user.shopId,
        deleted_at: null,
      });

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: "Festival schedule not found",
        });
      }

      schedule.deleted_at = new Date();
      await schedule.save();

      return res.json({
        success: true,
        message: "Festival schedule deleted successfully",
        data: schedule,
      });
    } catch (error) {
      console.error("deleteSchedule error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to delete festival schedule",
      });
    }
  }
}
