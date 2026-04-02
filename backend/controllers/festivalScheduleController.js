import mongoose from "mongoose";
import FestivalSchedule from "../models/festivalSchedule.js";
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

      const query = { shop_id: user.shopId };

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

      const updateData = {};
      if (festival_name) updateData.festival_name = festival_name;
      if (schedule_date) updateData.schedule_date = schedule_date;

      const updatedSchedule = await FestivalSchedule.findOneAndUpdate(
        { _id: id, shop_id: user.shopId },
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

      const deletedSchedule = await FestivalSchedule.findOneAndDelete({
        _id: id,
        shop_id: user.shopId,
      });

      if (!deletedSchedule) {
        return res.status(404).json({
          success: false,
          message: "Festival schedule not found",
        });
      }

      return res.json({
        success: true,
        message: "Festival schedule deleted successfully",
        data: deletedSchedule,
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
