export const UserRole = {
    CUSTOMER: "CUSTOMER",
    VENDOR: "VENDOR",
    ADMIN: "ADMIN",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
    ACTIVE: "ACTIVE",
    SUSPENDED: "SUSPENDED",
    PENDING: "PENDING",
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const VerificationStatus = {
    PENDING: "PENDING",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    RESUBMIT_REQUIRED: "RESUBMIT_REQUIRED",
} as const;

export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];

export const BookingStatus = {
    REQUESTED: "REQUESTED",
    ACCEPTED: "ACCEPTED",
    REJECTED: "REJECTED",
    CANCELLED: "CANCELLED",
    CONFIRMED_PENDING_PAYMENT: "CONFIRMED_PENDING_PAYMENT",
    CONFIRMED: "CONFIRMED",
    COMPLETED: "COMPLETED",
} as const;

export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const QuoteStatus = {
    PENDING: "PENDING",
    ACCEPTED: "ACCEPTED",
    REJECTED: "REJECTED",
    EXPIRED: "EXPIRED",
} as const;

export type QuoteStatus = (typeof QuoteStatus)[keyof typeof QuoteStatus];

export const PaymentStatus = {
    INITIATED: "INITIATED",
    PENDING: "PENDING",
    PAID: "PAID",
    FAILED: "FAILED",
    REFUNDED: "REFUNDED",
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const NotificationType = {
    BOOKING_REQUESTED: "BOOKING_REQUESTED",
    BOOKING_ACCEPTED: "BOOKING_ACCEPTED",
    BOOKING_REJECTED: "BOOKING_REJECTED",
    BOOKING_CONFIRMED: "BOOKING_CONFIRMED",
    BOOKING_CANCELLED: "BOOKING_CANCELLED",
    BOOKING_RESCHEDULED: "BOOKING_RESCHEDULED",
    VENDOR_APPROVED: "VENDOR_APPROVED",
    VENDOR_REJECTED: "VENDOR_REJECTED",
    VENDOR_RESUBMIT: "VENDOR_RESUBMIT",
    REVIEW_RECEIVED: "REVIEW_RECEIVED",
    MESSAGE: "MESSAGE",
    PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
    PAYMENT_CONFIRMED: "PAYMENT_CONFIRMED",
    SYSTEM: "SYSTEM",
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const SupportTicketStatus = {
    OPEN: "OPEN",
    IN_PROGRESS: "IN_PROGRESS",
    RESOLVED: "RESOLVED",
    CLOSED: "CLOSED",
} as const;

export type SupportTicketStatus = (typeof SupportTicketStatus)[keyof typeof SupportTicketStatus];

export const ReportStatus = {
    OPEN: "OPEN",
    REVIEWED: "REVIEWED",
    RESOLVED: "RESOLVED",
} as const;

export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

export const DocumentOwnerType = {
    VENDOR: "VENDOR",
    USER: "USER",
} as const;

export type DocumentOwnerType = (typeof DocumentOwnerType)[keyof typeof DocumentOwnerType];

export const PayoutStatus = {
    PROCESSING: "PROCESSING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
} as const;

export type PayoutStatus = (typeof PayoutStatus)[keyof typeof PayoutStatus];

export const EventType = {
    WEDDING: "WEDDING",
    ENGAGEMENT: "ENGAGEMENT",
    BIRTHDAY: "BIRTHDAY",
    CORPORATE: "CORPORATE",
    PARTY: "PARTY",
    OTHER: "OTHER",
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];
