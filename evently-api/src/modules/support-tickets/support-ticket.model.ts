import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { SupportTicketStatus } from "../../common/enums.js";

const SupportTicketSchema = new Schema(
  {
    createdBy: { type: Schema.Types.ObjectId, required: true, index: true, ref: "User" },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(SupportTicketStatus),
      default: SupportTicketStatus.OPEN,
      index: true,
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", index: true },
  },
  { timestamps: true, collection: "supportTickets" },
);

SupportTicketSchema.index({ status: 1, createdAt: -1 });
SupportTicketSchema.index({ createdBy: 1, createdAt: -1 });
SupportTicketSchema.index({ assignedTo: 1, createdAt: -1 });

export type SupportTicketDoc = InferSchemaType<typeof SupportTicketSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SupportTicketModel =
  (mongoose.models.SupportTicket as mongoose.Model<SupportTicketDoc>) ||
  mongoose.model<SupportTicketDoc>("SupportTicket", SupportTicketSchema);
