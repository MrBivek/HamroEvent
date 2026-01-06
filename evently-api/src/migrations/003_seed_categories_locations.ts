import type mongoose from "mongoose";

export const name = "003_seed_categories_and_locations";

function slugify(input: string) {
    return input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

export async function up(conn: mongoose.Connection) {
    const categories = [
        "Photography",
        "Videography",
        "Catering",
        "Venue",
        "Decoration",
        "Makeup Artist",
        "DJ / Music",
        "Event Planner",
        "Mehendi Artist",
        "Car Rental",
        "Florist",
        "Sound & Lighting",
    ].map((name) => ({
        name,
        slug: slugify(name),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    }));

    // Categories
    for (const c of categories) {
        const now = new Date();
        await conn.collection("categories").updateOne(
            { slug: c.slug },
            {
                $set: { name: c.name, isActive: true, updatedAt: now },
                $setOnInsert: { slug: c.slug, createdAt: now },
            },
            { upsert: true }
        );
    }

    const locations = [
        { name: "Kathmandu", type: "CITY" },
        { name: "Lalitpur", type: "CITY" },
        { name: "Bhaktapur", type: "CITY" },
        { name: "Pokhara", type: "CITY" },
        { name: "Chitwan", type: "CITY" },
        { name: "Butwal", type: "CITY" },
        { name: "Biratnagar", type: "CITY" },
        { name: "Dharan", type: "CITY" },
        { name: "Nepalgunj", type: "CITY" },
        { name: "Hetauda", type: "CITY" },
    ].map((l) => ({
        ...l,
        slug: slugify(l.name),
        createdAt: new Date(),
        updatedAt: new Date(),
    }));

    for (const l of locations) {
        const now = new Date();
        await conn.collection("locations").updateOne(
            { slug: l.slug },
            {
                $set: { name: l.name, type: l.type, updatedAt: now },
                $setOnInsert: { slug: l.slug, createdAt: now },
            },
            { upsert: true }
        );
    }
}

export async function down(conn: mongoose.Connection) {
    const categorySlugs = [
        "photography",
        "videography",
        "catering",
        "venue",
        "decoration",
        "makeup-artist",
        "dj-music",
        "event-planner",
        "mehendi-artist",
        "car-rental",
        "florist",
        "sound-lighting",
    ];

    const locationSlugs = [
        "kathmandu",
        "lalitpur",
        "bhaktapur",
        "pokhara",
        "chitwan",
        "butwal",
        "biratnagar",
        "dharan",
        "nepalgunj",
        "hetauda",
    ];

    await conn.collection("categories").deleteMany({ slug: { $in: categorySlugs } });
    await conn.collection("locations").deleteMany({ slug: { $in: locationSlugs } });
}
