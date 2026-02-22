import mongoose from "mongoose";
import { AuditLogModel } from "./audit-log.model.js";

export async function createAuditLog(input: {
  actorUserId: string | mongoose.Types.ObjectId;
  action: string;
  targetType: string;
  targetId: string | mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
}) {
  const actorUserId =
    typeof input.actorUserId === "string"
      ? new mongoose.Types.ObjectId(input.actorUserId)
      : input.actorUserId;
  const targetId =
    typeof input.targetId === "string"
      ? new mongoose.Types.ObjectId(input.targetId)
      : input.targetId;

  await AuditLogModel.create({
    actorUserId,
    action: input.action,
    targetType: input.targetType,
    targetId,
    metadata: input.metadata,
  });
}
