import type mongoose from "mongoose";

export const name = "001_init_collections_and_indexes";

function defaultIndexName(keys: Record<string, unknown>) {
    return Object.entries(keys)
        .map(([field, value]) => `${field}_${value}`)
        .join("_");
}

async function createIndexSafe(
    conn: mongoose.Connection,
    collection: string,
    keys: Record<string, unknown>,
    options?: { name?: string } & Record<string, unknown>,
) {
    const coll = conn.collection(collection);
    try {
        await coll.createIndex(keys as any, options as any);
    } catch (err: any) {
        const code = err?.code;
        if (code !== 85 && code !== 86) throw err;

        const name = options?.name ?? defaultIndexName(keys);
        try {
            await coll.dropIndex(name);
        } catch {
            // ignore drop failures
        }
        await coll.createIndex(keys as any, options as any);
    }
}

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
    await createIndexSafe(conn, "users", { email: 1 }, { unique: true });
    await createIndexSafe(conn, "users", { role: 1, status: 1 });

    // Vendor
    await createIndexSafe(conn, "vendors", { userId: 1 }, { unique: true });
    await createIndexSafe(conn, "vendors", { verifiedStatus: 1 });
    await createIndexSafe(conn, "vendors", { locations: 1 });

    // Vendor Staff
    await createIndexSafe(conn, "vendorStaff", { vendorId: 1, userId: 1 }, { unique: true });

    // Categories
    await createIndexSafe(conn, "categories", { slug: 1 }, { unique: true });
    await createIndexSafe(conn, "categories", { isActive: 1 });

    // Locations
    await createIndexSafe(conn, "locations", { parentId: 1 });
    await createIndexSafe(conn, "locations", { slug: 1 }, { unique: true, sparse: true });

    // Vendor Services
    await createIndexSafe(conn, "vendorServices", { vendorId: 1, categoryId: 1 });
    await createIndexSafe(conn, "vendorServices", { categoryId: 1 });
    await createIndexSafe(conn, "vendorServices", { tags: 1 });

    // Packages
    await createIndexSafe(conn, "packages", { vendorId: 1 });
    await createIndexSafe(conn, "packages", { categoryId: 1, isActive: 1 });
    await createIndexSafe(
        conn,
        "packages",
        { title: "text", description: "text" },
        { name: "packages_text_search", default_language: "english" },
    );

    // Events
    await createIndexSafe(conn, "events", { userId: 1 });
    await createIndexSafe(conn, "events", { eventDate: 1 });
    await createIndexSafe(conn, "events", { eventType: 1 });

    // Bookings
    await createIndexSafe(conn, "bookings", { userId: 1, status: 1, createdAt: -1 });
    await createIndexSafe(conn, "bookings", { vendorId: 1, status: 1, createdAt: -1 });
    await createIndexSafe(conn, "bookings", { eventId: 1 });

    // Availability
    await createIndexSafe(conn, "availability", { vendorId: 1, date: 1 }, { unique: true });

    // Quotes
    await createIndexSafe(conn, "quotes", { vendorId: 1, status: 1, createdAt: -1 });
    await createIndexSafe(conn, "quotes", { eventId: 1 });

    // Payments
    await createIndexSafe(conn, "payments", { bookingId: 1 });
    await createIndexSafe(conn, "payments", { status: 1 });
    await createIndexSafe(conn, "payments", { providerRef: 1 }, { unique: true, sparse: true });

    // Refunds
    await createIndexSafe(conn, "refunds", { paymentId: 1 });
    await createIndexSafe(conn, "refunds", { bookingId: 1 });
    await createIndexSafe(conn, "refunds", { providerRef: 1 }, { unique: true, sparse: true });

    // Reviews
    await createIndexSafe(conn, "reviews", { bookingId: 1 }, { unique: true });
    await createIndexSafe(conn, "reviews", { vendorId: 1, createdAt: -1 });

    // Verification Requests
    await createIndexSafe(conn, "verificationRequests", { vendorId: 1, status: 1 });
    await createIndexSafe(conn, "verificationRequests", { status: 1 });

    // Documents
    await createIndexSafe(conn, "documents", { ownerType: 1, ownerId: 1 });
    await createIndexSafe(conn, "documents", { uploadedBy: 1 });

    // Audit Logs
    await createIndexSafe(conn, "auditLogs", { entityType: 1, entityId: 1, createdAt: -1 });
    await createIndexSafe(conn, "auditLogs", { actorUserId: 1, createdAt: -1 });

    // Conversations and Messages
    await createIndexSafe(conn, "conversations", { participants: 1 });
    await createIndexSafe(conn, "conversations", { lastMessageAt: -1 });
    await createIndexSafe(conn, "messages", { conversationId: 1, createdAt: 1 });
    await createIndexSafe(conn, "messages", { senderId: 1, createdAt: -1 });

    // Notifications
    await createIndexSafe(conn, "notifications", { userId: 1, createdAt: -1 });
    await createIndexSafe(conn, "notifications", { userId: 1, readAt: 1 });

    // Support Tickets
    await createIndexSafe(conn, "supportTickets", { status: 1, createdAt: -1 });
    await createIndexSafe(conn, "supportTickets", { createdBy: 1, createdAt: -1 });
    await createIndexSafe(conn, "supportTickets", { assignedTo: 1, createdAt: -1 });

    // Media Assets
    await createIndexSafe(conn, "mediaAssets", { ownerType: 1, ownerId: 1 });

    // Booking Tasks
    await createIndexSafe(conn, "bookingTasks", { bookingId: 1, status: 1 });
    await createIndexSafe(conn, "bookingTasks", { assignedTo: 1, dueAt: 1 });

    // Discount Codes
    await createIndexSafe(conn, "discountCodes", { code: 1 }, { unique: true });
    await createIndexSafe(conn, "discountCodes", { validTo: 1 });

    // Favorites
    await createIndexSafe(
        conn,
        "favorites",
        { userId: 1, vendorId: 1 },
        { unique: true, sparse: true },
    );
    await createIndexSafe(
        conn,
        "favorites",
        { userId: 1, packageId: 1 },
        { unique: true, sparse: true },
    );

    // Reports
    await createIndexSafe(conn, "reports", { targetType: 1, targetId: 1, status: 1 });
    await createIndexSafe(conn, "reports", { status: 1, createdAt: -1 });

    // System Settings
    await createIndexSafe(conn, "systemSettings", { key: 1 }, { unique: true });
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
