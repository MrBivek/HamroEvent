import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { ReportStatus } from "../../common/enums.js";

const ReportSchema = new Schema(
  {
    createdBy: { type: Schema.Types.ObjectId, required: true, index: true, ref: "User" },
    targetType: { type: String, required: true, index: true },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(ReportStatus),
      default: ReportStatus.OPEN,
      index: true,
    },
  },
  { timestamps: true, collection: "reports" },
);

ReportSchema.index({ targetType: 1, targetId: 1, status: 1 });

export type ReportDoc = InferSchemaType<typeof ReportSchema> & { _id: mongoose.Types.ObjectId };

export const ReportModel =
  (mongoose.models.Report as mongoose.Model<ReportDoc>) ||
  mongoose.model<ReportDoc>("Report", ReportSchema);
