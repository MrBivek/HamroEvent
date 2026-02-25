import {
  mapVerificationStatusToUi,
  formatEventType,
  mapBookingStatusToUi,
  toUiUser,
} from "./mappers.js";
import type { VendorDoc } from "../modules/vendors/vendor.model.js";
import type { PackageDoc } from "../modules/packages/package.model.js";
import type { CategoryDoc } from "../modules/categories/category.model.js";
import type { LocationDoc } from "../modules/locations/location.model.js";
import type { DocumentDoc } from "../modules/documents/document.model.js";
import type { UserDoc } from "../modules/auth/user.model.js";
import type { EventDoc } from "../modules/events/event.model.js";
import type { BookingDoc } from "../modules/bookings/booking.model.js";
import type { MessageDoc } from "../modules/conversations/message.model.js";

const DEFAULT_VENDOR_MEDIA = "/uploads/placeholders/vendor.svg";

export function mapPackageToUi(pkg: PackageDoc) {
  return {
    _id: pkg._id.toString(),
    name: pkg.title,
    description: pkg.description,
    priceMin: pkg.priceMin ?? 0,
    priceMax: pkg.priceMax ?? pkg.priceMin ?? 0,
    inclusions: pkg.includes ?? [],
    duration: pkg.duration,
    policies: pkg.policies,
    addOns: pkg.addOns ?? [],
    isActive: pkg.isActive ?? false,
  };
}

function computePricingRange(packages: PackageDoc[], vendor: VendorDoc) {
  if (vendor.pricingMin !== undefined || vendor.pricingMax !== undefined) {
    return {
      min: vendor.pricingMin ?? 0,
      max: vendor.pricingMax ?? vendor.pricingMin ?? 0,
    };
  }
  const mins = packages.map((p) => p.priceMin).filter((v): v is number => typeof v === "number");
  const maxs = packages
    .map((p) => p.priceMax ?? p.priceMin)
    .filter((v): v is number => typeof v === "number");
  return {
    min: mins.length ? Math.min(...mins) : 0,
    max: maxs.length ? Math.max(...maxs) : 0,
  };
}

export function buildVendorProfile({
  vendor,
  user,
  category,
  location,
  packages = [],
  documents = [],
  includePackages = true,
}: {
  vendor: VendorDoc;
  user?: UserDoc | null;
  category?: CategoryDoc | null;
  location?: LocationDoc | null;
  packages?: PackageDoc[];
  documents?: DocumentDoc[];
  includePackages?: boolean;
}) {
  const pricingRange = computePricingRange(packages, vendor);
  const portfolioMedia =
    vendor.portfolioMedia && vendor.portfolioMedia.length > 0
      ? vendor.portfolioMedia
      : [DEFAULT_VENDOR_MEDIA];

  return {
    _id: vendor._id.toString(),
    userId: vendor.userId.toString(),
    businessName: vendor.businessName,
    category: category?.slug ?? "",
    description: vendor.description ?? "",
    location: vendor.locationText ?? location?.name ?? vendor.serviceAreas?.[0] ?? "",
    serviceAreas: vendor.serviceAreas ?? [],
    contact: {
      phone: vendor.contactPhone ?? user?.phone ?? "",
      email: vendor.contactEmail ?? user?.email ?? "",
    },
    socialLinks: {
      website: vendor.social?.website,
      instagram: vendor.social?.instagram,
      facebook: vendor.social?.facebook,
    },
    pricingRange,
    portfolioMedia,
    packages: includePackages ? packages.map(mapPackageToUi) : [],
    verificationStatus: mapVerificationStatusToUi(vendor.verifiedStatus),
    verificationDocs: documents.map((doc) => doc.url),
    rejectionReason: vendor.verificationNote,
    ratingAvg: vendor.ratingAvg ?? 0,
    ratingCount: vendor.ratingCount ?? 0,
    createdAt: vendor.createdAt?.toISOString(),
  };
}

export function buildEventDto(event: EventDoc & { _id: unknown }, vendorCount?: number) {
  return {
    _id: (event._id as any).toString(),
    customerId: event.userId.toString(),
    title: event.title,
    eventType: formatEventType(event.eventType),
    date: event.eventDate instanceof Date ? event.eventDate.toISOString() : String(event.eventDate),
    location: event.locationText ?? "",
    notes: event.notes,
    budget: event.budgetMax ?? event.budgetMin ?? 0,
    createdAt: event.createdAt?.toISOString(),
    vendorCount,
  };
}

export function buildBookingDto({
  booking,
  event,
  vendorProfile,
  customer,
  packageTitle,
  packagePrice,
  packageInclusions,
  includeHistory = true,
  messages,
  messageRoleMap,
}: {
  booking: BookingDoc;
  event?: EventDoc | null;
  vendorProfile?: ReturnType<typeof buildVendorProfile> | null;
  customer?: UserDoc | null;
  packageTitle?: string;
  packagePrice?: number;
  packageInclusions?: string[];
  includeHistory?: boolean;
  messages?: MessageDoc[];
  messageRoleMap?: Map<string, string>;
}) {
  return {
    _id: booking._id.toString(),
    customerId: booking.userId.toString(),
    vendorId: booking.vendorId.toString(),
    eventId: booking.eventId.toString(),
    packageId: booking.packageId?.toString(),
    eventType: event ? formatEventType(event.eventType) : "",
    date: event?.eventDate ? event.eventDate.toISOString() : "",
    timeRange: {
      start: event?.startTime ?? "",
      end: event?.endTime ?? "",
    },
    location: event?.locationText ?? "",
    notes: booking.customerNote,
    status: mapBookingStatusToUi(booking.status),
    history: includeHistory ? (booking.history ?? []) : [],
    createdAt: booking.createdAt?.toISOString(),
    updatedAt: booking.updatedAt?.toISOString(),
    vendor: vendorProfile ?? undefined,
    customer: customer ? toUiUser(customer) : undefined,
    vendorName: vendorProfile?.businessName,
    vendorImage: vendorProfile?.portfolioMedia?.[0],
    category: vendorProfile?.category,
    vendorPhone: vendorProfile?.contact?.phone,
    vendorEmail: vendorProfile?.contact?.email,
    packageName: packageTitle,
    price: packagePrice,
    packageInclusions: packageInclusions ?? [],
    messages: messages
      ? messages.map((msg) => ({
          id: msg._id.toString(),
          sender: messageRoleMap?.get(msg.senderId.toString()) ?? msg.senderId.toString(),
          text: msg.text,
          createdAt: msg.createdAt?.toISOString(),
        }))
      : undefined,
  };
}
