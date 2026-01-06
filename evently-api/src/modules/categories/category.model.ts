import mongoose, { Schema, type InferSchemaType } from "mongoose";

const CategorySchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, index: true },
        icon: { type: String },
        isActive: { type: Boolean, default: true, index: true },
    },
    { timestamps: true, collection: "categories" }
);

CategorySchema.index({ isActive: 1 });

export type CategoryDoc = InferSchemaType<typeof CategorySchema> & { _id: mongoose.Types.ObjectId };

export const CategoryModel =
    (mongoose.models.Category as mongoose.Model<CategoryDoc>) ||
    mongoose.model<CategoryDoc>("Category", CategorySchema);
