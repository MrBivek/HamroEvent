import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { UserModel } from "./user.model.js";
import jwt, { SignOptions } from "jsonwebtoken";
import { UserRole } from "../../common/enums.js";
import { env } from "../../configurations/env.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { PackageModel } from "../packages/package.model.js";
import { BadRequestError, UnauthorizedError } from "../../common/errors.js";
import { toUiUser } from "../../common/mappers.js";
import { CategoryModel } from "../categories/category.model.js";
import { LocationModel } from "../locations/location.model.js";
import { saveBase64File } from "../../common/fileStorage.js";

function signToken(userId: string, role: UserRole) {
  const expiresIn = env.JWT_EXPIRES_IN as SignOptions["expiresIn"];
  return jwt.sign({ sub: userId, role }, env.JWT_SECRET, { expiresIn });
}

export async function registerCustomer(input: {
  fullName?: string;
  name?: string;
  email: string;
  phone?: string;
  password: string;
}) {
  const email = input.email.toLowerCase();
  const exists = await UserModel.findOne({ email });
  if (exists) throw new BadRequestError("Email already exists");

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await UserModel.create({
    fullName: input.fullName ?? input.name ?? "",
    email,
    phone: input.phone,
    passwordHash,
    role: UserRole.CUSTOMER,
  });

  return { user: toUiUser(user) };
}

export async function registerVendor(input: {
  account: { fullName?: string; name?: string; email: string; phone?: string; password: string };
  business: {
    businessName: string;
    categoryId?: string;
    category?: string;
    description?: string;
    primaryLocationId?: string;
    location?: string;
    serviceAreas?: string[];
    website?: string;
    instagram?: string;
    facebook?: string;
  };
  packages?: Array<{
    title?: string;
    name?: string;
    description?: string;
    priceMin?: number;
    priceMax?: number;
    includes?: string[];
    inclusions?: string[];
    duration?: string;
    policies?: string;
    addOns?: string[];
  }>;
  portfolioMedia?: string[];
}) {
  const email = input.account.email.toLowerCase();

  const exists = await UserModel.findOne({ email });
  if (exists) throw new BadRequestError("Email already exists");

  const passwordHash = await bcrypt.hash(input.account.password, 10);

  const user = await UserModel.create({
    fullName: input.account.fullName ?? input.account.name ?? "",
    email,
    phone: input.account.phone,
    passwordHash,
    role: UserRole.VENDOR,
  });

  try {
    let categoryId = input.business.categoryId;
    if (!categoryId && input.business.category) {
      const category = await CategoryModel.findOne({ slug: input.business.category }).lean();
      categoryId = category?._id.toString();
    }

    let primaryLocationId = input.business.primaryLocationId;
    if (!primaryLocationId && input.business.location) {
      const location = await LocationModel.findOne({ name: input.business.location }).lean();
      primaryLocationId = location?._id.toString();
    }

    const storedMedia: string[] = [];
    if (input.portfolioMedia?.length) {
      for (const media of input.portfolioMedia) {
        if (media.startsWith("data:")) {
          const saved = saveBase64File({
            data: media,
            folder: `vendors/${user._id.toString()}`,
            filenamePrefix: "portfolio",
          });
          storedMedia.push(saved.url);
        } else {
          storedMedia.push(media);
        }
      }
    }

    const packagePrices = (input.packages ?? [])
      .map((p) => p.priceMin)
      .filter((v): v is number => typeof v === "number");
    const packageMaxPrices = (input.packages ?? [])
      .map((p) => (typeof p.priceMax === "number" ? p.priceMax : p.priceMin))
      .filter((v): v is number => typeof v === "number");
    const pricingMin = packagePrices.length ? Math.min(...packagePrices) : undefined;
    const pricingMax = packageMaxPrices.length ? Math.max(...packageMaxPrices) : pricingMin;

    const vendor = await VendorModel.create({
      userId: user._id,
      businessName: input.business.businessName,
      description: input.business.description,
      categoryId: categoryId ? new mongoose.Types.ObjectId(categoryId) : undefined,
      primaryLocationId: primaryLocationId
        ? new mongoose.Types.ObjectId(primaryLocationId)
        : undefined,
      locationText: input.business.location,
      serviceAreas: input.business.serviceAreas ?? [],
      contactPhone: input.account.phone,
      contactEmail: input.account.email,
      social: {
        website: input.business.website,
        instagram: input.business.instagram,
        facebook: input.business.facebook,
      },
      locations: primaryLocationId ? [new mongoose.Types.ObjectId(primaryLocationId)] : [],
      portfolioMedia: storedMedia,
      pricingMin,
      pricingMax,
    });

    if (input.packages?.length) {
      await PackageModel.insertMany(
        input.packages.map((p) => ({
          vendorId: vendor._id,
          categoryId: categoryId ? new mongoose.Types.ObjectId(categoryId) : undefined,
          title: p.title ?? p.name ?? "Package",
          description: p.description,
          priceMin: p.priceMin,
          priceMax: p.priceMax,
          includes: p.includes ?? p.inclusions ?? [],
          duration: p.duration,
          policies: p.policies,
          addOns: p.addOns ?? [],
          isActive: false,
        })),
      );
    }

    return {
      user: toUiUser(user),
      vendor: {
        _id: vendor._id.toString(),
        businessName: vendor.businessName,
        verifiedStatus: vendor.verifiedStatus,
      },
    };
  } catch (err) {
    await UserModel.deleteOne({ _id: user._id }).catch(() => {});
    throw err;
  }
}

export async function login(input: { email: string; password: string }) {
  const email = input.email.toLowerCase();
  const user = await UserModel.findOne({ email });
  if (!user) throw new UnauthorizedError("Invalid credentials");

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw new UnauthorizedError("Invalid credentials");

  user.lastLoginAt = new Date();
  await user.save();

  const token = signToken(user._id.toString(), user.role);

  return {
    token,
    user: toUiUser(user),
  };
}
