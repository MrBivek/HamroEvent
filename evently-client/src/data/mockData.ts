import type { VendorProfile, VendorCategory, User, Booking, Review, Notification } from '@/types';

// Mock Users
export const mockUsers: User[] = [
  {
    _id: 'user-1',
    role: 'customer',
    name: 'Sita Sharma',
    email: 'sita@example.com',
    phone: '+977-9801234567',
    isActive: true,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    _id: 'user-2',
    role: 'vendor',
    name: 'Raj Kumar Photography',
    email: 'raj@photography.com',
    phone: '+977-9812345678',
    isActive: true,
    createdAt: '2024-01-10T10:00:00Z',
  },
  {
    _id: 'user-3',
    role: 'admin',
    name: 'Admin User',
    email: 'admin@evently.com',
    phone: '+977-9800000000',
    isActive: true,
    createdAt: '2024-01-01T10:00:00Z',
  },
];

// Mock Vendors
export const mockVendors: VendorProfile[] = [
  {
    _id: 'vendor-1',
    userId: 'user-2',
    businessName: 'Himalayan Moments Photography',
    category: 'photography',
    description: 'Capturing your precious moments with artistic vision. We specialize in wedding, pre-wedding, and event photography with a team of experienced professionals.',
    location: 'Kathmandu',
    serviceAreas: ['Kathmandu', 'Bhaktapur', 'Lalitpur', 'Pokhara'],
    contact: {
      phone: '+977-9812345678',
      email: 'himalayan@photography.com',
    },
    socialLinks: {
      instagram: '@himalayanmoments',
      facebook: 'himalayan.moments',
    },
    pricingRange: { min: 25000, max: 150000 },
    portfolioMedia: [
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
      'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800',
    ],
    packages: [
      {
        _id: 'pkg-1',
        name: 'Essential Package',
        description: 'Perfect for intimate ceremonies',
        priceMin: 25000,
        priceMax: 35000,
        inclusions: ['4 hours coverage', '100 edited photos', 'Online gallery'],
        duration: '4 hours',
      },
      {
        _id: 'pkg-2',
        name: 'Premium Package',
        description: 'Complete wedding day coverage',
        priceMin: 75000,
        priceMax: 100000,
        inclusions: ['Full day coverage', '500+ edited photos', 'Photo album', 'Pre-wedding shoot'],
        duration: 'Full day',
      },
    ],
    verificationStatus: 'verified',
    verificationDocs: [],
    ratingAvg: 4.8,
    ratingCount: 127,
    createdAt: '2024-01-10T10:00:00Z',
  },
  {
    _id: 'vendor-2',
    userId: 'user-4',
    businessName: 'Grand Banquet Hall',
    category: 'venue',
    description: 'The most prestigious venue in Kathmandu for weddings and corporate events. Features stunning mountain views and modern amenities.',
    location: 'Kathmandu',
    serviceAreas: ['Kathmandu'],
    contact: {
      phone: '+977-9823456789',
      email: 'info@grandbanquet.com',
    },
    socialLinks: {
      website: 'www.grandbanquet.com',
      facebook: 'grandbanquet.ktm',
    },
    pricingRange: { min: 100000, max: 500000 },
    portfolioMedia: [
      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800',
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800',
    ],
    packages: [
      {
        _id: 'pkg-3',
        name: 'Hall Rental (Day)',
        description: 'Full day venue rental',
        priceMin: 100000,
        priceMax: 150000,
        inclusions: ['Hall setup', 'Basic decor', 'Parking', 'Sound system'],
        duration: '12 hours',
      },
    ],
    verificationStatus: 'verified',
    verificationDocs: [],
    ratingAvg: 4.6,
    ratingCount: 89,
    createdAt: '2024-01-12T10:00:00Z',
  },
  {
    _id: 'vendor-3',
    userId: 'user-5',
    businessName: 'Spice Route Catering',
    category: 'catering',
    description: 'Authentic Nepali and international cuisine for all events. Fresh ingredients, traditional recipes, modern presentation.',
    location: 'Lalitpur',
    serviceAreas: ['Kathmandu', 'Bhaktapur', 'Lalitpur'],
    contact: {
      phone: '+977-9834567890',
      email: 'orders@spiceroute.com',
    },
    pricingRange: { min: 500, max: 2500 },
    portfolioMedia: [
      'https://images.unsplash.com/photo-1555244162-803834f70033?w=800',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
    ],
    packages: [
      {
        _id: 'pkg-4',
        name: 'Standard Menu',
        description: 'Per plate pricing',
        priceMin: 500,
        priceMax: 800,
        inclusions: ['Welcome drinks', '4 starters', 'Main course', 'Dessert'],
      },
      {
        _id: 'pkg-5',
        name: 'Premium Menu',
        description: 'Luxury dining experience',
        priceMin: 1500,
        priceMax: 2500,
        inclusions: ['Premium beverages', '8 starters', 'Multi-course meal', 'Live cooking stations'],
      },
    ],
    verificationStatus: 'verified',
    verificationDocs: [],
    ratingAvg: 4.9,
    ratingCount: 203,
    createdAt: '2024-01-08T10:00:00Z',
  },
  {
    _id: 'vendor-4',
    userId: 'user-6',
    businessName: 'Dream Decorators',
    category: 'decoration',
    description: 'Transform any venue into a magical wonderland. Specializing in floral arrangements, lighting, and themed decorations.',
    location: 'Bhaktapur',
    serviceAreas: ['Kathmandu', 'Bhaktapur', 'Lalitpur'],
    contact: {
      phone: '+977-9845678901',
      email: 'hello@dreamdecor.com',
    },
    pricingRange: { min: 30000, max: 200000 },
    portfolioMedia: [
      'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=800',
      'https://images.unsplash.com/photo-1510076857177-7470076d4098?w=800',
    ],
    packages: [
      {
        _id: 'pkg-6',
        name: 'Basic Decor',
        description: 'Essential decorations',
        priceMin: 30000,
        priceMax: 50000,
        inclusions: ['Stage backdrop', 'Basic floral', 'Entry gate'],
      },
    ],
    verificationStatus: 'verified',
    verificationDocs: [],
    ratingAvg: 4.7,
    ratingCount: 156,
    createdAt: '2024-01-14T10:00:00Z',
  },
  {
    _id: 'vendor-5',
    userId: 'user-7',
    businessName: 'Glow Beauty Studio',
    category: 'makeup',
    description: 'Bridal makeup experts with international training. We bring out your natural beauty for your special day.',
    location: 'Kathmandu',
    serviceAreas: ['Kathmandu', 'Lalitpur'],
    contact: {
      phone: '+977-9856789012',
      email: 'book@glowbeauty.com',
    },
    socialLinks: {
      instagram: '@glowbeautynp',
    },
    pricingRange: { min: 15000, max: 75000 },
    portfolioMedia: [
      'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800',
    ],
    packages: [
      {
        _id: 'pkg-7',
        name: 'Bridal Package',
        description: 'Complete bridal look',
        priceMin: 35000,
        priceMax: 50000,
        inclusions: ['Bridal makeup', 'Hair styling', 'Touch-ups', 'Accessories'],
      },
    ],
    verificationStatus: 'verified',
    verificationDocs: [],
    ratingAvg: 4.9,
    ratingCount: 178,
    createdAt: '2024-01-11T10:00:00Z',
  },
  {
    _id: 'vendor-6',
    userId: 'user-8',
    businessName: 'Beat Masters DJ',
    category: 'dj-music',
    description: 'Professional DJ services for weddings, parties, and corporate events. State-of-the-art sound and lighting systems.',
    location: 'Pokhara',
    serviceAreas: ['Pokhara', 'Kathmandu'],
    contact: {
      phone: '+977-9867890123',
      email: 'book@beatmasters.com',
    },
    pricingRange: { min: 20000, max: 80000 },
    portfolioMedia: [
      'https://images.unsplash.com/photo-1571266028243-d220c6a8e4cf?w=800',
    ],
    packages: [
      {
        _id: 'pkg-8',
        name: 'Standard DJ Package',
        description: '4 hours of entertainment',
        priceMin: 20000,
        priceMax: 30000,
        inclusions: ['Professional DJ', 'Sound system', 'Basic lighting'],
        duration: '4 hours',
      },
    ],
    verificationStatus: 'pending',
    verificationDocs: [],
    ratingAvg: 4.5,
    ratingCount: 67,
    createdAt: '2024-01-16T10:00:00Z',
  },
];

// Category metadata
export const vendorCategories: { value: VendorCategory; label: string; icon: string; description: string }[] = [
  { value: 'venue', label: 'Venue', icon: '🏛️', description: 'Wedding halls, banquet spaces' },
  { value: 'catering', label: 'Catering', icon: '🍽️', description: 'Food & beverage services' },
  { value: 'photography', label: 'Photography', icon: '📸', description: 'Photo & video coverage' },
  { value: 'decoration', label: 'Decoration', icon: '💐', description: 'Event styling & décor' },
  { value: 'makeup', label: 'Makeup', icon: '💄', description: 'Bridal & event makeup' },
  { value: 'dj-music', label: 'DJ & Music', icon: '🎵', description: 'Entertainment & sound' },
  { value: 'transport', label: 'Transport', icon: '🚗', description: 'Vehicle rentals' },
];

// Nepal locations
export const nepalLocations = [
  'Kathmandu',
  'Pokhara',
  'Lalitpur',
  'Bhaktapur',
  'Biratnagar',
  'Birgunj',
  'Bharatpur',
  'Dharan',
  'Butwal',
  'Nepalgunj',
];

// Mock Reviews
export const mockReviews: Review[] = [
  {
    _id: 'review-1',
    bookingId: 'booking-1',
    customerId: 'user-1',
    vendorId: 'vendor-1',
    rating: 5,
    comment: 'Absolutely amazing photography! They captured every moment beautifully. Highly recommend!',
    isHidden: false,
    createdAt: '2024-02-15T10:00:00Z',
    customer: mockUsers[0],
  },
  {
    _id: 'review-2',
    bookingId: 'booking-2',
    customerId: 'user-1',
    vendorId: 'vendor-3',
    rating: 5,
    comment: 'The food was exceptional! All our guests were impressed with the quality and presentation.',
    isHidden: false,
    createdAt: '2024-02-10T10:00:00Z',
    customer: mockUsers[0],
  },
];

// Mock Notifications
export const mockNotifications: Notification[] = [
  {
    _id: 'notif-1',
    userId: 'user-1',
    type: 'booking-confirmed',
    title: 'Booking Confirmed',
    body: 'Your booking with Himalayan Moments Photography has been confirmed.',
    link: '/customer/bookings/booking-1',
    isRead: false,
    createdAt: '2024-02-01T10:00:00Z',
  },
];
