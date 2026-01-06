import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { EventType } from "../../common/enums.js";

const EventSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "User" },

        title: { type: String, required: true, trim: true },
        eventType: { type: String, enum: Object.values(EventType), required: true },

        // Workable choice: store as Date
        eventDate: { type: Date, required: true, index: true },
        startTime: { type: String }, // "10:00"
        endTime: { type: String },   // "16:00"

        locationText: { type: String }, // free text (works even without locations)
        locationId: { type: Schema.Types.ObjectId, ref: "Location" },

        guestCount: { type: Number },
        budgetMin: { type: Number },
        budgetMax: { type: Number },

        notes: { type: String },
    },
    { timestamps: true, collection: "events" }
);

EventSchema.index({ eventType: 1 });

export type EventDoc = InferSchemaType<typeof EventSchema> & { _id: mongoose.Types.ObjectId };

export const EventModel =
    (mongoose.models.Event as mongoose.Model<EventDoc>) ||
    mongoose.model<EventDoc>("Event", EventSchema);
