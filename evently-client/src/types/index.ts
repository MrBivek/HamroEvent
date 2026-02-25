// User Types
export type UserRole = "customer" | "vendor" | "admin";

export interface User {
    _id: string;
    role: UserRole;
    name: string;
    email: string;
    phone?: string;
    isActive: boolean;
    createdAt: string;
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

export interface AuthRegisterResponse {
    user: User;
    otpSent?: boolean;
}

export interface VendorRegisterResponse {
    user: User;
    vendor: {
        _id: string;
        businessName: string;
        verifiedStatus: string;
    };
}

export interface AuthLoginResponse {
    token: string;
    user: User;
}

export interface AuthOtpResponse {
    sent: boolean;
}

// Vendor Types
export type VerificationStatus = "pending" | "verified" | "rejected";

export type VendorCategory =
    | "venue"
    | "catering"
    | "photography"
    | "decoration"
    | "makeup"
    | "dj-music"
    | "transport"
    | (string & {});

export interface Category {
    _id: string;
    name: string;
    slug?: string;
    description?: string;
    icon?: string;
    isActive?: boolean;
}

export interface Location {
    _id: string;
    name: string;
    region?: string;
    country?: string;
    isActive?: boolean;
}

export interface ServicePackage {
    _id: string;
    name: string;
    description: string;
    priceMin: number;
    priceMax?: number;
    inclusions: string[];
    duration?: string;
    policies?: string;
    addOns?: string[];
    isActive?: boolean;
}

export interface VendorProfile {
    _id: string;
    userId: string;
    businessName: string;
    category: VendorCategory;
    description: string;
    location: string;
    serviceAreas: string[];
    contact: {
        phone: string;
        email: string;
    };
    socialLinks?: {
        facebook?: string;
        instagram?: string;
        website?: string;
    };
    pricingRange: {
        min: number;
        max: number;
    };
    portfolioMedia: string[];
    packages: ServicePackage[];
    verificationStatus: VerificationStatus;
    verificationDocs: string[];
    rejectionReason?: string;
    ratingAvg: number;
    ratingCount: number;
    createdAt: string;
    verifiedStatus?: string;
}

// Booking Types
export type BookingStatus =
    | "pending"
    | "accepted"
    | "confirmed"
    | "completed"
    | "rejected"
    | "cancelled"
    | "reschedule-proposed";

export interface BookingHistoryEntry {
    status: BookingStatus;
    byRole: UserRole;
    at: string;
    note?: string;
}

export interface Booking {
    _id: string;
    customerId: string;
    vendorId: string;
    eventId?: string;
    packageId?: string;
    eventType: string;
    date: string;
    timeRange: {
        start: string;
        end: string;
    };
    location: string;
    notes?: string;
    status: BookingStatus;
    history: BookingHistoryEntry[];
    createdAt: string;
    updatedAt: string;
    // Populated fields
    vendor?: VendorProfile;
    customer?: User;
    vendorName?: string;
    vendorImage?: string;
    category?: string;
    vendorPhone?: string;
    vendorEmail?: string;
    packageName?: string;
    price?: number;
    messages?: BookingMessage[];
    customerName?: string;
}

// Event Types
export interface Event {
    _id: string;
    customerId: string;
    title: string;
    eventType: string;
    date: string;
    location: string;
    notes?: string;
    budget?: number;
    createdAt: string;
    vendorCount?: number;
    // Populated
    bookings?: Booking[];
}

// Message Types
export interface BookingMessage {
    id: string;
    sender: string;
    text: string;
    createdAt: string;
}

export interface Conversation {
    _id: string;
    participants: string[];
    bookingId?: string;
    vendorId?: string;
    lastMessageAt?: string;
    createdAt?: string;
}

export interface ConversationMessage {
    _id: string;
    conversationId: string;
    senderId: string;
    text: string;
    createdAt: string;
    readAt?: string | null;
}

// Review Types
export interface Review {
    _id: string;
    bookingId: string;
    customerId: string;
    vendorId: string;
    rating: number;
    comment: string;
    isHidden: boolean;
    moderationReason?: string;
    createdAt: string;
    // Populated
    customer?: User;
    customerName?: string;
    vendorName?: string;
    flagged?: boolean;
}

// Notification Types
export type NotificationType =
    | "booking-requested"
    | "booking-accepted"
    | "booking-rejected"
    | "booking-confirmed"
    | "booking-cancelled"
    | "booking-rescheduled"
    | "review-received"
    | "vendor-verified"
    | "vendor-rejected"
    | "message"
    | "payment"
    | "system";

export interface Notification {
    _id: string;
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    link?: string;
    isRead: boolean;
    createdAt: string;
}

// Audit Log Types
export interface AuditLog {
    _id: string;
    actorAdminId?: string;
    actorUserId?: string;
    actionType: string;
    action?: string;
    targetType: string;
    type?: string;
    targetId: string;
    targetLabel?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
}

export interface AvailabilityEntry {
    _id: string;
    vendorId: string;
    date: string;
    isAvailable: boolean;
    note?: string;
    slots?: Array<{ start: string; end: string }>;
}

export type QuoteStatus = "pending" | "accepted" | "rejected" | "expired";

export interface Quote {
    _id: string;
    bookingId: string;
    vendorId?: string;
    amount: number;
    note?: string;
    status: QuoteStatus;
    createdAt?: string;
    updatedAt?: string;
}

export type PaymentStatus = "INITIATED" | "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export interface Payment {
    _id: string;
    bookingId: string;
    amount: number;
    provider: string;
    status: PaymentStatus;
    payUrl?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Refund {
    _id: string;
    paymentId: string;
    bookingId?: string;
    amount: number;
    reason?: string;
    createdAt?: string;
}

export type VerificationDecision = "APPROVE" | "REJECT" | "RESUBMIT_REQUIRED";

export interface VerificationRequest {
    _id: string;
    id?: string;
    vendorId: string;
    status: string;
    note?: string;
    vendorNote?: string;
    adminNote?: string;
    documentIds?: string[];
    documents?: DocumentItem[];
    documentsCount?: number;
    submittedAt?: string;
    createdAt?: string;
    updatedAt?: string;
    vendor?: VendorProfile;
}

export interface DocumentItem {
    _id: string;
    url: string;
    name?: string;
    mimeType?: string;
    createdAt?: string;
}

export type SupportTicketStatus = "open" | "in_progress" | "resolved" | "closed";

export interface SupportTicket {
    _id: string;
    userId: string;
    subject: string;
    message: string;
    status: SupportTicketStatus;
    assignedTo?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Report {
    _id: string;
    targetType: string;
    targetId: string;
    reason: string;
    reporterId?: string;
    status?: string;
    createdAt?: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    from?: string;
    to?: string;
}

export interface ApiOkResponse {
    ok?: boolean;
    deleted?: boolean;
    updated?: number;
}

export interface VendorPaymentSummary {
    totalEarnings: number;
    pendingPayout: number;
    availableBalance: number;
    thisMonth: number;
    growth: number;
}

export interface VendorPaymentTransaction {
    id: string;
    booking: string;
    type: "credit" | "debit";
    amount: number;
    status: "completed" | "pending" | "failed";
    date: string;
}

export interface VendorPayout {
    id: string;
    bank: string;
    amount: number;
    status: "completed" | "pending" | "failed";
    date: string;
}

export interface AdminDashboardStats {
    totalUsers: number;
    activeVendors: number;
    totalBookings: number;
    avgRating: number;
}

export interface AdminDashboardPendingVendor {
    id: string;
    name: string;
    category: string;
}

export interface AdminDashboardResponse {
    stats: AdminDashboardStats;
    pendingVendors: AdminDashboardPendingVendor[];
}

export interface AdminAnalyticsResponse {
    bookingsByCategory: Array<{ category: string; count: number; percent: number }>;
    monthlyBookings: number[];
}

export interface AdminVendorVerificationResponse {
    vendor: VendorProfile | Record<string, unknown>;
    note?: string;
}

export interface VerificationDecisionResponse {
    request: VerificationRequest;
    vendor: VendorProfile | Record<string, unknown>;
}

// Filter Types
export interface VendorFilters {
    category?: VendorCategory;
    location?: string;
    keyword?: string;
    priceMin?: number;
    priceMax?: number;
    verified?: boolean;
    minRating?: number;
    sortBy?: "rating" | "latest" | "popularity";
}
