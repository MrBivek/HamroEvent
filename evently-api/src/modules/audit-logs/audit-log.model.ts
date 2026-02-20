import mongoose, { Schema, type InferSchemaType } from "mongoose";

const AuditLogSchema = new Schema(
  {
    actorUserId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "User" },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true, index: true },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, collection: "auditLogs" },
);

AuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

export type AuditLogDoc = InferSchemaType<typeof AuditLogSchema> & { _id: mongoose.Types.ObjectId };

export const AuditLogModel =
  (mongoose.models.AuditLog as mongoose.Model<AuditLogDoc>) ||
  mongoose.model<AuditLogDoc>("AuditLog", AuditLogSchema);
