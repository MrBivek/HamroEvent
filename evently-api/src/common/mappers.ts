import { BookingStatus, NotificationType, UserRole, UserStatus, VerificationStatus } from "./enums.js";
import type { UserDoc } from "../modules/auth/user.model.js";

export function mapUserRoleToUi(role: UserRole) {
  return role.toLowerCase();
}

export function mapUserStatusToIsActive(status: UserStatus) {
  return status === UserStatus.ACTIVE;
}

export function mapVerificationStatusToUi(status: VerificationStatus) {
  switch (status) {
    case VerificationStatus.APPROVED:
      return "verified";
    case VerificationStatus.PENDING:
      return "pending";
    case VerificationStatus.REJECTED:
    case VerificationStatus.RESUBMIT_REQUIRED:
      return "rejected";
    default:
      return "pending";
  }
}

export function mapUiVerificationStatusToInternal(status?: string) {
  if (!status) return undefined;
  const normalized = status.toUpperCase();
  if (normalized === "VERIFIED") return VerificationStatus.APPROVED;
  if (normalized === "PENDING") return VerificationStatus.PENDING;
  if (normalized === "REJECTED") return VerificationStatus.REJECTED;
  if (normalized === "RESUBMIT_REQUIRED") return VerificationStatus.RESUBMIT_REQUIRED;
  if (Object.values(VerificationStatus).includes(normalized as VerificationStatus)) {
    return normalized as VerificationStatus;
  }
  return undefined;
}

export function mapBookingStatusToUi(status: BookingStatus) {
  switch (status) {
    case BookingStatus.REQUESTED:
      return "pending";
    case BookingStatus.ACCEPTED:
    case BookingStatus.CONFIRMED_PENDING_PAYMENT:
      return "accepted";
    case BookingStatus.CONFIRMED:
      return "confirmed";
    case BookingStatus.COMPLETED:
      return "completed";
    case BookingStatus.REJECTED:
      return "rejected";
    case BookingStatus.CANCELLED:
      return "cancelled";
    default:
      return "pending";
  }
}

export function mapUiBookingStatusToInternal(status: string) {
  const normalized = status.toUpperCase();
  if ((BookingStatus as Record<string, string>)[normalized]) {
    return normalized as BookingStatus;
  }
  switch (status) {
    case "pending":
      return BookingStatus.REQUESTED;
    case "accepted":
      return BookingStatus.ACCEPTED;
    case "confirmed":
      return BookingStatus.CONFIRMED;
    case "completed":
      return BookingStatus.COMPLETED;
    case "rejected":
      return BookingStatus.REJECTED;
    case "cancelled":
      return BookingStatus.CANCELLED;
    default:
      return undefined;
  }
}

export function mapNotificationTypeToUi(type: NotificationType) {
  switch (type) {
    case NotificationType.BOOKING_REQUESTED:
      return "booking-requested";
    case NotificationType.BOOKING_ACCEPTED:
      return "booking-accepted";
    case NotificationType.BOOKING_REJECTED:
      return "booking-rejected";
    case NotificationType.BOOKING_CONFIRMED:
      return "booking-confirmed";
    case NotificationType.BOOKING_CANCELLED:
      return "booking-cancelled";
    case NotificationType.BOOKING_RESCHEDULED:
      return "booking-rescheduled";
    case NotificationType.VENDOR_APPROVED:
      return "vendor-verified";
    case NotificationType.VENDOR_REJECTED:
    case NotificationType.VENDOR_RESUBMIT:
      return "vendor-rejected";
    case NotificationType.REVIEW_RECEIVED:
      return "review-received";
    case NotificationType.MESSAGE:
      return "message";
    case NotificationType.PAYMENT_CONFIRMED:
    case NotificationType.PAYMENT_RECEIVED:
      return "payment";
    case NotificationType.SYSTEM:
      return "system";
    default:
      return "system";
  }
}

export function formatEventType(input?: string) {
  if (!input) return "";
  const cleaned = input.replace(/_/g, " ").toLowerCase();
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function toUiUser(user: UserDoc) {
  return {
    _id: user._id.toString(),
    role: mapUserRoleToUi(user.role),
    name: user.fullName,
    email: user.email,
    phone: user.phone,
    isActive: mapUserStatusToIsActive(user.status),
    createdAt: user.createdAt?.toISOString(),
  };
}
