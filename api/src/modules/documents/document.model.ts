import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { DocumentOwnerType } from "../../common/enums.js";

const DocumentSchema = new Schema(
    {
        ownerType: {
            type: String,
            enum: Object.values(DocumentOwnerType),
            required: true,
            index: true,
        },
        ownerId: { type: Schema.Types.ObjectId, required: true, index: true },
        name: { type: String, required: true },
        type: { type: String },
        url: { type: String, required: true },
        uploadedBy: { type: Schema.Types.ObjectId, ref: "User", index: true },
    },
    { timestamps: true, collection: "documents" },
);

DocumentSchema.index({ ownerType: 1, ownerId: 1 });

export type DocumentDoc = InferSchemaType<typeof DocumentSchema> & { _id: mongoose.Types.ObjectId };

export const DocumentModel =
    (mongoose.models.Document as mongoose.Model<DocumentDoc>) ||
    mongoose.model<DocumentDoc>("Document", DocumentSchema);
