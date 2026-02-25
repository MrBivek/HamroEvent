import { VendorModel } from "../modules/vendors/vendor.model.js";
import { UserModel } from "../modules/auth/user.model.js";

type ResolveVendorOptions = {
  lean?: boolean;
};

export async function resolveVendorForUser(userId: string, options: ResolveVendorOptions = {}) {
  if (options.lean) {
    const vendor = await VendorModel.findOne({ userId }).lean();
    if (vendor) return vendor;
  } else {
    const vendor = await VendorModel.findOne({ userId });
    if (vendor) return vendor;
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

  if (orFilters.length === 0) return null;
  const candidate = await VendorModel.findOne({ $or: orFilters });
  if (!candidate) return null;

  if (candidate.userId.toString() !== user._id.toString()) {
    candidate.userId = user._id;
    await candidate.save();
  }

  return options.lean ? candidate.toObject() : candidate;
}
