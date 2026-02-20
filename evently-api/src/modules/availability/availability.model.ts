import mongoose, { Schema, type InferSchemaType } from "mongoose";

const AvailabilitySchema = new Schema(
  {
    vendorId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "Vendor" },
    date: { type: Date, required: true, index: true },
    isAvailable: { type: Boolean, default: true, index: true },
    slots: [
      {
        start: { type: String },
        end: { type: String },
      },
    ],
    note: { type: String },
  },
  { timestamps: true, collection: "availability" },
);

AvailabilitySchema.index({ vendorId: 1, date: 1 }, { unique: true });

export type AvailabilityDoc = InferSchemaType<typeof AvailabilitySchema> & { _id: mongoose.Types.ObjectId };

export const AvailabilityModel =
  (mongoose.models.Availability as mongoose.Model<AvailabilityDoc>) ||
  mongoose.model<AvailabilityDoc>("Availability", AvailabilitySchema);
