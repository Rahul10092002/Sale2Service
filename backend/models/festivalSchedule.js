import mongoose from "mongoose";

const festivalScheduleSchema = new mongoose.Schema(
    {
        shop_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Shop",
            required: true,
        },
        festival_name: {
            type: String,
            required: true,
            trim: true,
        },
        schedule_date: {
            type: Date,
            required: true,
        },
    },
    { timestamps: true }
);  

const FestivalSchedule =
  mongoose.models.FestivalSchedule ||
  mongoose.model("FestivalSchedule", festivalScheduleSchema);
export default FestivalSchedule;