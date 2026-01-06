// User Types
export type UserRole = 'customer' | 'vendor' | 'admin';

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

// Vendor Types
export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export type VendorCategory = 
  | 'venue'
  | 'catering'
  | 'photography'
  | 'decoration'
  | 'makeup'
  | 'dj-music'
  | 'transport';

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
}

// Booking Types
export type BookingStatus = 
  | 'pending'
  | 'accepted'
  | 'confirmed'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'reschedule-proposed';

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
  // Populated
  bookings?: Booking[];
}

// Message Types
export interface Message {
  _id: string;
  bookingId: string;
  senderId: string;
  senderRole: UserRole;
  text: string;
  createdAt: string;
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
}

// Notification Types
export type NotificationType = 
  | 'booking-requested'
  | 'booking-accepted'
  | 'booking-rejected'
  | 'booking-confirmed'
  | 'booking-cancelled'
  | 'booking-rescheduled'
  | 'review-received'
  | 'vendor-verified'
  | 'vendor-rejected';

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
  actorAdminId: string;
  actionType: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
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
  sortBy?: 'rating' | 'latest' | 'popularity';
}
