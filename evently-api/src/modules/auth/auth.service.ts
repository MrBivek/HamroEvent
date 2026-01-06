import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { UserModel } from "./user.model.js";
import jwt, { SignOptions } from "jsonwebtoken";
import { UserRole } from "../../common/enums.js";
import { env } from "../../configurations/env.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { PackageModel } from "../packages/package.model.js";
import { BadRequestError, UnauthorizedError } from "../../common/errors.js";

function signToken(userId: string, role: UserRole) {
  const expiresIn = env.JWT_EXPIRES_IN as SignOptions["expiresIn"];
  return jwt.sign({ sub: userId, role }, env.JWT_SECRET, { expiresIn });
}

export async function registerCustomer(input: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}) {
  const email = input.email.toLowerCase();
  const exists = await UserModel.findOne({ email });
  if (exists) throw new BadRequestError("Email already exists");

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await UserModel.create({
    fullName: input.fullName,
    email,
    phone: input.phone,
    passwordHash,
    role: UserRole.CUSTOMER,
  });

  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

export async function registerVendor(input: {
  account: { fullName: string; email: string; phone?: string; password: string };
  business: {
    businessName: string;
    categoryId?: string;
    description?: string;
    primaryLocationId?: string;
    serviceAreas?: string[];
    website?: string;
    instagram?: string;
    facebook?: string;
  };
  packages?: Array<{
    title: string;
    description?: string;
    priceMin?: number;
    priceMax?: number;
    includes?: string[];
  }>;
}) {
  const email = input.account.email.toLowerCase();

  const exists = await UserModel.findOne({ email });
  if (exists) throw new BadRequestError("Email already exists");

  const passwordHash = await bcrypt.hash(input.account.password, 10);

  const user = await UserModel.create({
    fullName: input.account.fullName,
    email,
    phone: input.account.phone,
    passwordHash,
    role: UserRole.VENDOR,
  });

  try {
    const vendor = await VendorModel.create({
      userId: user._id,
      businessName: input.business.businessName,
      description: input.business.description,
      categoryId: input.business.categoryId
        ? new mongoose.Types.ObjectId(input.business.categoryId)
        : undefined,
      primaryLocationId: input.business.primaryLocationId
        ? new mongoose.Types.ObjectId(input.business.primaryLocationId)
        : undefined,
      serviceAreas: input.business.serviceAreas ?? [],
      social: {
        website: input.business.website,
        instagram: input.business.instagram,
        facebook: input.business.facebook,
      },
      locations: input.business.primaryLocationId
        ? [new mongoose.Types.ObjectId(input.business.primaryLocationId)]
        : [],
    });

    if (input.packages?.length) {
      await PackageModel.insertMany(
        input.packages.map((p) => ({
          vendorId: vendor._id,
          categoryId: input.business.categoryId
            ? new mongoose.Types.ObjectId(input.business.categoryId)
            : undefined,
          title: p.title,
          description: p.description,
          priceMin: p.priceMin,
          priceMax: p.priceMax,
          includes: p.includes ?? [],
          isActive: false,
        })),
      );
    }

    return {
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      vendor: {
        id: vendor._id.toString(),
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
    user: {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
    },
  };
}
