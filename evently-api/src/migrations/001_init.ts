import type mongoose from "mongoose";

export const name = "001_init_collections_and_indexes";

export async function up(conn: mongoose.Connection) {
  const collections = [
    "users",
    "vendors",
    "vendorServices",
    "packages",
    "events",
    "bookings",
    "availability",
    "quotes",
    "payments",
    "reviews",
    "verificationRequests",
    "documents",
    "auditLogs",
    "conversations",
    "messages",
    "notifications",
    "supportTickets",
    "categories",
    "locations",
    "mediaAssets",
    "vendorStaff",
    "bookingTasks",
    "discountCodes",
    "refunds",
    "favorites",
    "reports",
    "systemSettings",
  ];

  for (const c of collections) {
    await conn.createCollection(c).catch(() => {});
  }

  // Users
  await conn.collection("users").createIndex({ email: 1 }, { unique: true });
  await conn.collection("users").createIndex({ role: 1, status: 1 });

  // Vendor
  await conn.collection("vendors").createIndex({ userId: 1 }, { unique: true });
  await conn.collection("vendors").createIndex({ verifiedStatus: 1 });
  await conn.collection("vendors").createIndex({ locations: 1 });

  // Vendor Staff
  await conn.collection("vendorStaff").createIndex({ vendorId: 1, userId: 1 }, { unique: true });

  // Categories
  await conn.collection("categories").createIndex({ slug: 1 }, { unique: true });
  await conn.collection("categories").createIndex({ isActive: 1 });

  // Locations
  await conn.collection("locations").createIndex({ parentId: 1 });
  await conn.collection("locations").createIndex({ slug: 1 }, { unique: true, sparse: true });

  // Vendor Services
  await conn.collection("vendorServices").createIndex({ vendorId: 1, categoryId: 1 });
  await conn.collection("vendorServices").createIndex({ categoryId: 1 });
  await conn.collection("vendorServices").createIndex({ tags: 1 });

  // Packages
  await conn.collection("packages").createIndex({ vendorId: 1 });
  await conn.collection("packages").createIndex({ categoryId: 1, isActive: 1 });
  await conn
    .collection("packages")
    .createIndex(
      { title: "text", description: "text" },
      { name: "packages_text_search", default_language: "english" },
    );

  // Events
  await conn.collection("events").createIndex({ userId: 1 });
  await conn.collection("events").createIndex({ eventDate: 1 });
  await conn.collection("events").createIndex({ eventType: 1 });

  // Bookings
  await conn.collection("bookings").createIndex({ userId: 1, status: 1, createdAt: -1 });
  await conn.collection("bookings").createIndex({ vendorId: 1, status: 1, createdAt: -1 });
  await conn.collection("bookings").createIndex({ eventId: 1 });

  // Availability
  await conn.collection("availability").createIndex({ vendorId: 1, date: 1 }, { unique: true });

  // Quotes
  await conn.collection("quotes").createIndex({ vendorId: 1, status: 1, createdAt: -1 });
  await conn.collection("quotes").createIndex({ eventId: 1 });

  // Payments
  await conn.collection("payments").createIndex({ bookingId: 1 });
  await conn.collection("payments").createIndex({ status: 1 });
  await conn.collection("payments").createIndex({ providerRef: 1 }, { unique: true, sparse: true });

  // Refunds
  await conn.collection("refunds").createIndex({ paymentId: 1 });
  await conn.collection("refunds").createIndex({ bookingId: 1 });
  await conn.collection("refunds").createIndex({ providerRef: 1 }, { unique: true, sparse: true });

  // Reviews
  await conn.collection("reviews").createIndex({ bookingId: 1 }, { unique: true });
  await conn.collection("reviews").createIndex({ vendorId: 1, createdAt: -1 });

  // Verification Requests
  await conn.collection("verificationRequests").createIndex({ vendorId: 1, status: 1 });
  await conn.collection("verificationRequests").createIndex({ status: 1 });

  // Documents
  await conn.collection("documents").createIndex({ ownerType: 1, ownerId: 1 });
  await conn.collection("documents").createIndex({ uploadedBy: 1 });

  // Audit Logs
  await conn.collection("auditLogs").createIndex({ entityType: 1, entityId: 1, createdAt: -1 });
  await conn.collection("auditLogs").createIndex({ actorUserId: 1, createdAt: -1 });

  // Conversations and Messages
  await conn.collection("conversations").createIndex({ participants: 1 });
  await conn.collection("conversations").createIndex({ lastMessageAt: -1 });
  await conn.collection("messages").createIndex({ conversationId: 1, createdAt: 1 });
  await conn.collection("messages").createIndex({ senderId: 1, createdAt: -1 });

  // Notifications
  await conn.collection("notifications").createIndex({ userId: 1, createdAt: -1 });
  await conn.collection("notifications").createIndex({ userId: 1, readAt: 1 });

  // Support Tickets
  await conn.collection("supportTickets").createIndex({ status: 1, createdAt: -1 });
  await conn.collection("supportTickets").createIndex({ createdBy: 1, createdAt: -1 });
  await conn.collection("supportTickets").createIndex({ assignedTo: 1, createdAt: -1 });

  // Media Assets
  await conn.collection("mediaAssets").createIndex({ ownerType: 1, ownerId: 1 });

  // Booking Tasks
  await conn.collection("bookingTasks").createIndex({ bookingId: 1, status: 1 });
  await conn.collection("bookingTasks").createIndex({ assignedTo: 1, dueAt: 1 });

  // Discount Codes
  await conn.collection("discountCodes").createIndex({ code: 1 }, { unique: true });
  await conn.collection("discountCodes").createIndex({ validTo: 1 });

  // Favorites
  await conn
    .collection("favorites")
    .createIndex({ userId: 1, vendorId: 1 }, { unique: true, sparse: true });
  await conn
    .collection("favorites")
    .createIndex({ userId: 1, packageId: 1 }, { unique: true, sparse: true });

  // Reports
  await conn.collection("reports").createIndex({ targetType: 1, targetId: 1, status: 1 });
  await conn.collection("reports").createIndex({ status: 1, createdAt: -1 });

  // System Settings
  await conn.collection("systemSettings").createIndex({ key: 1 }, { unique: true });
}

export async function down(conn: mongoose.Connection) {
  const cols = (await conn.db?.listCollections().toArray()) ?? [];
  for (const c of cols) {
    if (c.name === "migrations") continue;
    await conn
      .collection(c.name)
      .dropIndexes()
      .catch(() => {});
  }
}
