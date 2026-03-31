import mongoose, { Schema, type InferSchemaType } from "mongoose";

const FavoriteSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "User" },
        vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", index: true },
        packageId: { type: Schema.Types.ObjectId, ref: "Package", index: true },
    },
    { timestamps: true, collection: "favorites" },
);

FavoriteSchema.index({ userId: 1, vendorId: 1 }, { unique: true, sparse: true });
FavoriteSchema.index({ userId: 1, packageId: 1 }, { unique: true, sparse: true });

export type FavoriteDoc = InferSchemaType<typeof FavoriteSchema> & { _id: mongoose.Types.ObjectId };

export const FavoriteModel =
    (mongoose.models.Favorite as mongoose.Model<FavoriteDoc>) ||
    mongoose.model<FavoriteDoc>("Favorite", FavoriteSchema);
