import bcrypt from "bcrypt";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { UserModel } from "./user.model.js";
import jwt, { SignOptions } from "jsonwebtoken";
import {
  DocumentOwnerType,
  UserRole,
  VerificationStatus,
  NotificationType,
  UserStatus,
} from "../../common/enums.js";
import { env } from "../../configurations/env.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { PackageModel } from "../packages/package.model.js";
import { BadRequestError, UnauthorizedError, ForbiddenError } from "../../common/errors.js";
import { toUiUser } from "../../common/mappers.js";
import { CategoryModel } from "../categories/category.model.js";
import { LocationModel } from "../locations/location.model.js";
import { saveBase64File } from "../../common/fileStorage.js";
import { VerificationRequestModel } from "../verification-requests/verification-request.model.js";
import { DocumentModel } from "../documents/document.model.js";
import { createNotificationsForAdmins } from "../notifications/notifications.service.js";
import { EmailOtpModel } from "./email-otp.model.js";
import { sendEmail } from "../../common/email.js";

function signToken(userId: string, role: UserRole) {
  const expiresIn = env.JWT_EXPIRES_IN as SignOptions["expiresIn"];
  return jwt.sign({ sub: userId, role }, env.JWT_SECRET, { expiresIn });
}

function generateOtp(length: number) {
  const min = 10 ** (length - 1);
  const max = 10 ** length;
  return crypto.randomInt(min, max).toString();
}

function hashOtp(email: string, otp: string) {
  return crypto.createHmac("sha256", env.JWT_SECRET).update(`${email}:${otp}`).digest("hex");
}

async function issueOtp(user: { _id: mongoose.Types.ObjectId; email: string }) {
  const otp = generateOtp(env.OTP_CODE_LENGTH);
  const codeHash = hashOtp(user.email, otp);
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60 * 1000);

  await EmailOtpModel.findOneAndUpdate(
    { email: user.email },
    {
      $set: {
        userId: user._id,
        codeHash,
        expiresAt,
        attempts: 0,
        lastSentAt: new Date(),
      },
    },
    { upsert: true, new: true },
  );

  await sendEmail({
    to: user.email,
    subject: "Evently account verification",
    text: `Your verification code is ${otp}. It expires in ${env.OTP_EXPIRES_MINUTES} minutes.`,
  });

  return { sent: true };
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
  if (input.phone) {
    const phoneExists = await UserModel.findOne({ phone: input.phone });
    if (phoneExists) throw new BadRequestError("Phone already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await UserModel.create({
    fullName: input.fullName ?? input.name ?? "",
    email,
    phone: input.phone,
    passwordHash,
    role: UserRole.CUSTOMER,
    status: UserStatus.PENDING,
  });

  await issueOtp(user);

  return { user: toUiUser(user), otpSent: true };
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
  verificationDocuments?: Array<{
    data: string;
    filename?: string;
    name?: string;
    mimeType?: string;
    type?: string;
  }>;
}) {
  const email = input.account.email.toLowerCase();

  const exists = await UserModel.findOne({ email });
  if (exists) throw new BadRequestError("Email already exists");
  if (input.account.phone) {
    const phoneExists = await UserModel.findOne({ phone: input.account.phone });
    if (phoneExists) throw new BadRequestError("Phone already exists");
  }

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

    let verificationDocumentIds: mongoose.Types.ObjectId[] = [];
    if (input.verificationDocuments?.length) {
      const docs = input.verificationDocuments;
      const savedDocs = docs.map((doc, index) => {
        const saved = saveBase64File({
          data: doc.data,
          folder: `vendors/${user._id.toString()}`,
          filenamePrefix: "verification",
          mimeTypeHint: doc.mimeType ?? doc.type,
        });
        return {
          ownerType: DocumentOwnerType.VENDOR,
          ownerId: vendor._id,
          name: doc.filename ?? doc.name ?? `document-${index + 1}`,
          type: doc.mimeType ?? doc.type,
          url: saved.url,
          uploadedBy: user._id,
        };
      });
      const created = await DocumentModel.insertMany(savedDocs);
      verificationDocumentIds = created.map((d) => d._id);
    }

    const verificationUpdate: Record<string, unknown> = {
      $setOnInsert: {
        vendorId: vendor._id,
        status: VerificationStatus.PENDING,
        submittedAt: new Date(),
      },
    };
    if (verificationDocumentIds.length) {
      verificationUpdate.$set = {
        documentIds: verificationDocumentIds,
      };
    }

    await VerificationRequestModel.updateOne(
      { vendorId: vendor._id, status: VerificationStatus.PENDING },
      verificationUpdate,
      { upsert: true },
    );

    await createNotificationsForAdmins({
      type: NotificationType.SYSTEM,
      title: "New vendor registration",
      body: `Vendor ${vendor.businessName} registered and is pending verification.`,
      link: "/admin/vendors/pending",
    });

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

  if (user.status !== UserStatus.ACTIVE) {
    throw new UnauthorizedError("Account not verified");
  }

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

export async function requestOtp(input: { email: string }) {
  const email = input.email.toLowerCase();
  const user = await UserModel.findOne({ email });
  if (!user) throw new BadRequestError("Account not found");
  if (user.status === UserStatus.SUSPENDED) throw new ForbiddenError("Account is suspended");
  if (user.status === UserStatus.ACTIVE) {
    throw new BadRequestError("Account already verified");
  }

  return issueOtp({ _id: user._id, email: user.email });
}

export async function verifyOtp(input: { email: string; otp: string }) {
  const email = input.email.toLowerCase();
  const user = await UserModel.findOne({ email });
  if (!user) throw new BadRequestError("Account not found");
  if (user.status === UserStatus.SUSPENDED) throw new ForbiddenError("Account is suspended");
  if (user.status === UserStatus.ACTIVE) {
    const token = signToken(user._id.toString(), user.role);
    return { token, user: toUiUser(user) };
  }

  const record = await EmailOtpModel.findOne({ email });
  if (!record) throw new BadRequestError("OTP expired or not found");
  if (record.expiresAt.getTime() < Date.now()) {
    await EmailOtpModel.deleteOne({ _id: record._id });
    throw new BadRequestError("OTP expired");
  }

  if ((record.attempts ?? 0) >= 5) {
    throw new BadRequestError("Too many attempts. Please request a new OTP.");
  }

  const expected = hashOtp(email, input.otp);
  if (expected !== record.codeHash) {
    await EmailOtpModel.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
    throw new BadRequestError("Invalid OTP");
  }

  const updated = await UserModel.findByIdAndUpdate(
    user._id,
    { $set: { status: UserStatus.ACTIVE } },
    { new: true },
  );
  await EmailOtpModel.deleteOne({ _id: record._id });

  const token = signToken(user._id.toString(), user.role);
  return { token, user: toUiUser(updated ?? user) };
}
