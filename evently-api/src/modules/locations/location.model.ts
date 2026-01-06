import mongoose, { Schema, type InferSchemaType } from "mongoose";

const LocationSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        slug: { type: String, index: true },
        type: { type: String, required: true }, // CITY / AREA / etc.
        parentId: { type: Schema.Types.ObjectId, ref: "Location" },
        geo: {
            lat: { type: Number },
            lng: { type: Number },
        },
    },
    { timestamps: true, collection: "locations" }
);

LocationSchema.index({ parentId: 1 });

export type LocationDoc = InferSchemaType<typeof LocationSchema> & { _id: mongoose.Types.ObjectId };

export const LocationModel =
    (mongoose.models.Location as mongoose.Model<LocationDoc>) ||
    mongoose.model<LocationDoc>("Location", LocationSchema);
