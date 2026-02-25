import mongoose, { type HydratedDocument } from "mongoose";
import { VendorModel, type VendorDoc } from "../modules/vendors/vendor.model.js";
import { UserModel } from "../modules/auth/user.model.js";

type ResolveVendorOptions = {
  lean?: boolean;
};

type VendorHydrated = HydratedDocument<VendorDoc>;

export async function resolveVendorForUser(
  userId: string,
  options: { lean: true },
): Promise<VendorDoc | null>;
export async function resolveVendorForUser(
  userId: string,
  options?: ResolveVendorOptions,
): Promise<VendorHydrated | null>;
export async function resolveVendorForUser(userId: string, options: ResolveVendorOptions = {}) {
  const wantLean = options.lean === true;
  const findDoc = (query: Record<string, unknown>) => VendorModel.findOne(query);

  if (wantLean) {
    const direct = await findDoc({ userId });
    if (direct) return direct.toObject();
    if (mongoose.isValidObjectId(userId)) {
      const byObjectId = await findDoc({ userId: new mongoose.Types.ObjectId(userId) });
      if (byObjectId) return byObjectId.toObject();
    }
  } else {
    const direct = await findDoc({ userId });
    if (direct) return direct;
    if (mongoose.isValidObjectId(userId)) {
      const byObjectId = await findDoc({ userId: new mongoose.Types.ObjectId(userId) });
      if (byObjectId) return byObjectId;
    }
  }

  const user = await UserModel.findById(userId).lean();
  if (!user) return null;

  const email = user.email?.trim();
  const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const orFilters: Record<string, unknown>[] = [];

  if (email) {
    orFilters.push({ contactEmail: email });
    orFilters.push({ contactEmail: { $regex: `^${escapeRegex(email)}$`, $options: "i" } });
  }
  if (user.phone) {
    orFilters.push({ contactPhone: user.phone });
  }

  const portfolioMatch = {
    portfolioMedia: { $regex: `/uploads/vendors/${escapeRegex(userId)}/`, $options: "i" },
  };

  const orQuery = { $or: [...orFilters, portfolioMatch] };
  const candidate = await findDoc(orQuery);
  if (!candidate) return null;

  if (candidate.userId.toString() !== user._id.toString()) {
    candidate.userId = user._id;
    await candidate.save();
  }

  return wantLean ? candidate.toObject() : candidate;
}
