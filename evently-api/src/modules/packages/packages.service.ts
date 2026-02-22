import mongoose from "mongoose";
import { PackageModel } from "./package.model.js";
import { VendorModel } from "../vendors/vendor.model.js";

export async function recalculateVendorPricingRange(vendorId: mongoose.Types.ObjectId) {
  const packages = await PackageModel.find({ vendorId, isActive: true }).lean();
  const mins = packages.map((p) => p.priceMin).filter((v): v is number => typeof v === "number");
  const maxs = packages
    .map((p) => (typeof p.priceMax === "number" ? p.priceMax : p.priceMin))
    .filter((v): v is number => typeof v === "number");

  const pricingMin = mins.length ? Math.min(...mins) : 0;
  const pricingMax = maxs.length ? Math.max(...maxs) : pricingMin;

  await VendorModel.updateOne({ _id: vendorId }, { $set: { pricingMin, pricingMax } });
}
