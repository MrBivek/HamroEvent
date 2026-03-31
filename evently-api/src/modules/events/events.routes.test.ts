import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../middlewares/errorHandler.js";
import { UserRole } from "../../common/enums.js";

const eventModelMock = {
    create: vi.fn(),
};

vi.mock("../../configurations/env.js", () => ({
    env: {
        JWT_SECRET: "route-test-secret",
    },
}));

vi.mock("./event.model.js", () => ({
    EventModel: eventModelMock,
}));

vi.mock("../bookings/booking.model.js", () => ({
    BookingModel: {
        aggregate: vi.fn(),
        find: vi.fn(),
    },
}));

vi.mock("../packages/package.model.js", () => ({
    PackageModel: {
        find: vi.fn(),
    },
}));

vi.mock("../vendors/vendor.model.js", () => ({
    VendorModel: {
        find: vi.fn(),
    },
}));

vi.mock("../categories/category.model.js", () => ({
    CategoryModel: {
        find: vi.fn(),
    },
}));

const { eventsRoutes } = await import("./events.routes.js");

function createToken(sub: string, role: UserRole) {
    return jwt.sign({ sub, role }, "route-test-secret");
}

async function runRoute(body: Record<string, unknown>) {
    const layer = eventsRoutes.stack.find(
        (entry) => {
            const route = entry.route as { path?: string; methods?: { post?: boolean } } | undefined;
            return route?.path === "/" && route.methods?.post;
        },
    );
    if (!layer?.route) throw new Error("POST / route not found");

    const req: any = {
        body,
        params: {},
        query: {},
        headers: {
            authorization: `Bearer ${createToken(new mongoose.Types.ObjectId().toString(), UserRole.CUSTOMER)}`,
        },
    };
    const res: any = {
        statusCode: 200,
        body: undefined,
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: unknown) {
            this.body = payload;
            return this;
        },
    };

    const handlers = layer.route.stack.map((entry) => entry.handle);

    const dispatch = async (index: number, err?: unknown): Promise<void> => {
        if (err) {
            errorHandler(err, req, res, () => {});
            return;
        }
        const handler = handlers[index];
        if (!handler) return;
        await new Promise<void>((resolve) => {
            let advanced = false;
            const next = (nextErr?: unknown) => {
                advanced = true;
                void dispatch(index + 1, nextErr).then(resolve);
            };

            Promise.resolve(handler(req, res, next))
                .then(() => {
                    if (!advanced) resolve();
                })
                .catch((caughtErr) => {
                    void dispatch(index + 1, caughtErr).then(resolve);
                });
        });
    };

    await dispatch(0);
    return res;
}

describe("events routes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("creates an event with normalized budget and location fields", async () => {
        const userId = new mongoose.Types.ObjectId();
        const createdAt = new Date("2026-04-01T10:00:00.000Z");
        eventModelMock.create.mockImplementation(async (body) => ({
            _id: new mongoose.Types.ObjectId(),
            ...body,
            createdAt,
            updatedAt: createdAt,
        }));

        const response = await runRoute({
            title: "Wedding Celebration",
            eventType: "Wedding",
            date: "2026-10-22",
            startTime: "10:00",
            endTime: "16:00",
            location: "Kathmandu",
            budget: 200000,
            notes: "Main family event",
        });

        expect(response.statusCode).toBe(201);
        expect(eventModelMock.create).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: expect.any(mongoose.Types.ObjectId),
                eventDate: new Date("2026-10-22"),
                locationText: "Kathmandu",
                budgetMin: 200000,
                budgetMax: 200000,
                startTime: "10:00",
                endTime: "16:00",
            }),
        );
        expect(response.body).toMatchObject({
            title: "Wedding Celebration",
            location: "Kathmandu",
            budget: 200000,
            startTime: "10:00",
            endTime: "16:00",
        });
    });

    it("rejects invalid time ranges during event creation", async () => {
        const userId = new mongoose.Types.ObjectId();

        const response = await runRoute({
            title: "Broken Event",
            eventType: "Wedding",
            date: "2026-10-22",
            startTime: "18:00",
            endTime: "10:00",
            location: "Kathmandu",
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toContain("Invalid time range");
        expect(eventModelMock.create).not.toHaveBeenCalled();
    });
});
