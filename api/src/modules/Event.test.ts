import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { errorHandler } from "../middlewares/errorHandler.js";
import {
    BookingStatus,
    NotificationType,
    QuoteStatus,
    UserRole,
    UserStatus,
} from "../common/enums.js";

const userModelMock = {
    findOne: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
};

const vendorModelMock = {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    updateOne: vi.fn(),
};

const bookingModelMock = {
    aggregate: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    countDocuments: vi.fn(),
    updateOne: vi.fn(),
};

const eventModelMock = {
    create: vi.fn(),
    find: vi.fn(),
};

const packageModelMock = {
    find: vi.fn(),
    findById: vi.fn(),
};

const categoryModelMock = {
    find: vi.fn(),
};

const locationModelMock = {
    find: vi.fn(),
};

const availabilityModelMock = {
    find: vi.fn(),
    countDocuments: vi.fn(),
    findOneAndUpdate: vi.fn(),
    deleteOne: vi.fn(),
};

const conversationModelMock = {
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
};

const messageModelMock = {
    create: vi.fn(),
};

const quoteModelMock = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
};

const paymentModelMock = {
    aggregate: vi.fn(),
};

const reportModelMock = {
    find: vi.fn(),
    countDocuments: vi.fn(),
    findByIdAndUpdate: vi.fn(),
};

const notificationModelMock = {
    find: vi.fn(),
    countDocuments: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateMany: vi.fn(),
};

const favoriteModelMock = {
    updateOne: vi.fn(),
    deleteOne: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
};

const supportTicketModelMock = {
    create: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
};

const reviewModelMock = {
    findOne: vi.fn(),
    create: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
};

const createNotificationMock = vi.fn();
const createNotificationsForAdminsMock = vi.fn();
const emitMessageMock = vi.fn();
const emitQuoteUpdateMock = vi.fn();
const emitBookingUpdateMock = vi.fn();
const sendQuoteApprovedEmailsMock = vi.fn();
const sendEmailMock = vi.fn();
const buildPaymentReminderEmailMock = vi.fn();
const { resolveVendorForUserMock, generateSecretMock, generateURIMock, qrcodeToDataUrlMock } =
    vi.hoisted(() => ({
        resolveVendorForUserMock: vi.fn(),
        generateSecretMock: vi.fn(),
        generateURIMock: vi.fn(),
        qrcodeToDataUrlMock: vi.fn(),
    }));

vi.mock("../configurations/env.js", () => ({
    env: {
        JWT_SECRET: "major-modules-secret",
        JWT_EXPIRES_IN: "1h",
        OTP_CODE_LENGTH: 6,
        OTP_EXPIRES_MINUTES: 10,
        CLIENT_URL: "http://localhost:8085",
        PAYMENT_REMINDER_COOLDOWN_MINUTES: 60,
        NODE_ENV: "test",
    },
}));

vi.mock("../modules/auth/user.model.js", () => ({
    UserModel: userModelMock,
}));

vi.mock("../modules/vendors/vendor.model.js", () => ({
    VendorModel: vendorModelMock,
}));

vi.mock("../modules/bookings/booking.model.js", () => ({
    BookingModel: bookingModelMock,
}));

vi.mock("../modules/events/event.model.js", () => ({
    EventModel: eventModelMock,
}));

vi.mock("../modules/packages/package.model.js", () => ({
    PackageModel: packageModelMock,
}));

vi.mock("../modules/categories/category.model.js", () => ({
    CategoryModel: categoryModelMock,
}));

vi.mock("../modules/locations/location.model.js", () => ({
    LocationModel: locationModelMock,
}));

vi.mock("../modules/availability/availability.model.js", () => ({
    AvailabilityModel: availabilityModelMock,
}));

vi.mock("../modules/conversations/conversation.model.js", () => ({
    ConversationModel: conversationModelMock,
}));

vi.mock("../modules/conversations/message.model.js", () => ({
    MessageModel: messageModelMock,
}));

vi.mock("../modules/quotes/quote.model.js", () => ({
    QuoteModel: quoteModelMock,
}));

vi.mock("../modules/reports/report.model.js", () => ({
    ReportModel: reportModelMock,
}));

vi.mock("../modules/notifications/notification.model.js", () => ({
    NotificationModel: notificationModelMock,
}));

vi.mock("../modules/favorites/favorite.model.js", () => ({
    FavoriteModel: favoriteModelMock,
}));

vi.mock("../modules/support-tickets/support-ticket.model.js", () => ({
    SupportTicketModel: supportTicketModelMock,
}));

vi.mock("../modules/reviews/review.model.js", () => ({
    ReviewModel: reviewModelMock,
}));

vi.mock("../modules/notifications/notifications.service.js", () => ({
    createNotification: createNotificationMock,
    createNotificationsForAdmins: createNotificationsForAdminsMock,
}));

vi.mock("../socket.js", () => ({
    emitMessage: emitMessageMock,
    emitQuoteUpdate: emitQuoteUpdateMock,
    emitBookingUpdate: emitBookingUpdateMock,
}));

vi.mock("../modules/quotes/quotes.service.js", () => ({
    sendQuoteApprovedEmails: sendQuoteApprovedEmailsMock,
}));

vi.mock("../modules/payments/payment.model.js", () => ({
    PaymentModel: paymentModelMock,
}));

vi.mock("../common/email.js", () => ({
    sendEmail: sendEmailMock,
}));

vi.mock("../common/emailTemplates.js", () => ({
    buildPaymentReminderEmail: buildPaymentReminderEmailMock,
}));

vi.mock("bcrypt", () => ({
    default: {
        compare: vi.fn(),
        hash: vi.fn(),
    },
}));

vi.mock("otplib", () => ({
    verifySync: vi.fn(),
    generateSecret: generateSecretMock,
    generateURI: generateURIMock,
}));

vi.mock("qrcode", () => ({
    default: {
        toDataURL: qrcodeToDataUrlMock,
    },
}));

vi.mock("../common/vendor.js", () => ({
    resolveVendorForUser: resolveVendorForUserMock,
}));

const { login, loginTwoFactor } = await import("./auth/auth.service.js");
const { accountRoutes } = await import("./account/account.routes.js");
const { availabilityRoutes } = await import("./availability/availability.routes.js");
const { eventsRoutes } = await import("./events/events.routes.js");
const { vendorQuotesRoutes } = await import("./quotes/vendor-quotes.routes.js");
const { conversationsRoutes } = await import("./conversations/conversations.routes.js");
const { notificationsRoutes } = await import("./notifications/notifications.routes.js");
const { favoritesRoutes } = await import("./favorites/favorites.routes.js");
const { supportTicketsRoutes } = await import("./support-tickets/support-tickets.routes.js");
const { reviewsRoutes } = await import("./reviews/reviews.routes.js");
const { vendorReviewsRoutes } = await import("./reviews/vendor-reviews.routes.js");
const { adminReportsRoutes } = await import("./reports/admin-reports.routes.js");
const { categoriesRoutes } = await import("./categories/categories.routes.js");
const { locationsRoutes } = await import("./locations/locations.routes.js");
const { runPaymentReminderCycle } = await import("../common/jobs/paymentReminder.js");

function createToken(sub: string, role: UserRole) {
    return jwt.sign({ sub, role }, "major-modules-secret");
}

function leanResult<T>(value: T) {
    return {
        lean: vi.fn().mockResolvedValue(value),
    };
}

function reportFindResult(items: unknown[]) {
    return {
        sort: vi.fn().mockReturnValue({
            skip: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                    lean: vi.fn().mockResolvedValue(items),
                }),
            }),
        }),
    };
}

function paginatedFindResult(items: unknown[]) {
    return {
        sort: vi.fn().mockReturnValue({
            skip: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                    lean: vi.fn().mockResolvedValue(items),
                }),
            }),
        }),
    };
}

function sortedListResult(items: unknown[]) {
    return {
        sort: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(items),
            limit: vi.fn().mockReturnValue({
                lean: vi.fn().mockResolvedValue(items),
            }),
        }),
    };
}

async function runExpressRoute({
    router,
    path,
    method,
    role,
    sub,
    body = {},
    params = {},
    query = {},
}: {
    router: any;
    path: string;
    method: "get" | "post" | "patch" | "put" | "delete";
    role: UserRole;
    sub: string;
    body?: Record<string, unknown>;
    params?: Record<string, string>;
    query?: Record<string, unknown>;
}) {
    const layer = router.stack.find((entry: any) => {
        const route = entry.route as { path?: string; methods?: Record<string, boolean> } | undefined;
        return route?.path === path && route.methods?.[method];
    });
    if (!layer?.route) throw new Error(`${method.toUpperCase()} ${path} route not found`);

    const req: any = {
        body,
        params,
        query,
        headers: {
            authorization: `Bearer ${createToken(sub, role)}`,
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

    const handlers = layer.route.stack.map((entry: any) => entry.handle);

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

describe("Major backend modules", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        buildPaymentReminderEmailMock.mockReturnValue({
            subject: "Pending payment reminder",
            text: "Please pay",
            html: "<p>Please pay</p>",
        });
    });

    describe("Auth Module", () => {
        it("returns a temporary 2FA challenge for users with 2FA enabled", async () => {
            userModelMock.findOne.mockResolvedValue({
                _id: { toString: () => "user-1" },
                role: UserRole.CUSTOMER,
                email: "customer@example.com",
                passwordHash: "hashed-password",
                status: UserStatus.ACTIVE,
                twoFactorEnabled: true,
                twoFactorSecret: "SECRET",
            });
            vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

            const result = await login({
                email: "customer@example.com",
                password: "password123",
            });

            expect(result.requiresTwoFactor).toBe(true);
            expect(result.email).toBe("customer@example.com");
            expect(result.tempToken).toEqual(expect.any(String));
        });

        it("completes login after validating the authenticator code", async () => {
            const save = vi.fn().mockResolvedValue(undefined);
            const tempToken = jwt.sign(
                { sub: "507f1f77bcf86cd799439011", role: UserRole.VENDOR, purpose: "2fa-login" },
                "major-modules-secret",
                { expiresIn: "10m" },
            );

            userModelMock.findById.mockResolvedValue({
                _id: { toString: () => "507f1f77bcf86cd799439011" },
                fullName: "Vendor User",
                email: "vendor@example.com",
                phone: "9800000000",
                role: UserRole.VENDOR,
                status: UserStatus.ACTIVE,
                twoFactorEnabled: true,
                twoFactorSecret: "SECRET",
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
                save,
            });
            vi.mocked(verifySync).mockReturnValue({ valid: true } as never);

            const result = await loginTwoFactor({
                tempToken,
                code: "123456",
            });

            expect(result.token).toEqual(expect.any(String));
            expect(result.user).toMatchObject({
                email: "vendor@example.com",
                role: "vendor",
                twoFactorEnabled: true,
            });
            expect(save).toHaveBeenCalledTimes(1);
        });
    });

    describe("Events Module", () => {
        it("creates an event with normalized date, budget, and location fields", async () => {
            eventModelMock.create.mockImplementation(async (body) => ({
                _id: new mongoose.Types.ObjectId(),
                ...body,
                createdAt: new Date("2026-04-01T10:00:00.000Z"),
                updatedAt: new Date("2026-04-01T10:00:00.000Z"),
            }));

            const response = await runExpressRoute({
                router: eventsRoutes,
                path: "/",
                method: "post",
                role: UserRole.CUSTOMER,
                sub: new mongoose.Types.ObjectId().toString(),
                body: {
                    title: "Wedding Celebration",
                    eventType: "Wedding",
                    date: "2026-10-22",
                    startTime: "10:00",
                    endTime: "16:00",
                    location: "Kathmandu",
                    budget: 200000,
                    notes: "Main family event",
                },
            });

            expect(response.statusCode).toBe(201);
            expect(eventModelMock.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventDate: new Date("2026-10-22"),
                    locationText: "Kathmandu",
                    budgetMin: 200000,
                    budgetMax: 200000,
                }),
            );
            expect(response.body).toMatchObject({
                title: "Wedding Celebration",
                location: "Kathmandu",
                budget: 200000,
            });
        });

        it("rejects invalid time ranges during event creation", async () => {
            const response = await runExpressRoute({
                router: eventsRoutes,
                path: "/",
                method: "post",
                role: UserRole.CUSTOMER,
                sub: new mongoose.Types.ObjectId().toString(),
                body: {
                    title: "Broken Event",
                    eventType: "Wedding",
                    date: "2026-10-22",
                    startTime: "18:00",
                    endTime: "10:00",
                    location: "Kathmandu",
                },
            });

            expect(response.statusCode).toBe(400);
            expect(response.body.error).toContain("Invalid time range");
            expect(eventModelMock.create).not.toHaveBeenCalled();
        });
    });

    describe("Quotes Module", () => {
        it("creates a vendor proposal for a pending booking", async () => {
            const vendorId = new mongoose.Types.ObjectId();
            const vendorUserId = new mongoose.Types.ObjectId();
            const customerId = new mongoose.Types.ObjectId();
            const packageId = new mongoose.Types.ObjectId();
            const bookingId = new mongoose.Types.ObjectId();
            const save = vi.fn().mockResolvedValue(undefined);

            vendorModelMock.findOne.mockReturnValue(leanResult({ _id: vendorId, userId: vendorUserId }));
            bookingModelMock.findOne.mockResolvedValue({
                _id: bookingId,
                vendorId,
                userId: customerId,
                packageId,
                status: BookingStatus.REQUESTED,
                history: [],
                save,
            });
            quoteModelMock.findOne.mockReturnValue(leanResult(null));
            packageModelMock.findById.mockReturnValue(
                leanResult({
                    _id: packageId,
                    includes: ["Photography", "Videography"],
                }),
            );
            quoteModelMock.create.mockResolvedValue({
                _id: new mongoose.Types.ObjectId(),
                bookingId,
                vendorId,
                customerId,
                amount: 50000,
                message: "Updated proposal",
                packageInclusions: ["Photography"],
                customInclusions: ["Drone shot"],
                vendorApproved: false,
                customerApproved: false,
                lastUpdatedBy: UserRole.VENDOR,
                status: QuoteStatus.PENDING,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const response = await runExpressRoute({
                router: vendorQuotesRoutes,
                path: "/me/bookings/:id/quote",
                method: "post",
                role: UserRole.VENDOR,
                sub: vendorUserId.toString(),
                params: { id: bookingId.toString() },
                body: {
                    amount: 50000,
                    message: "Updated proposal",
                    packageInclusions: ["Photography"],
                    customInclusions: ["Drone shot"],
                },
            });

            expect(response.statusCode).toBe(201);
            expect(quoteModelMock.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    bookingId,
                    amount: 50000,
                    packageInclusions: ["Photography"],
                    customInclusions: ["Drone shot"],
                }),
            );
            expect(save).toHaveBeenCalledTimes(1);
            expect(emitQuoteUpdateMock).toHaveBeenCalled();
            expect(emitBookingUpdateMock).toHaveBeenCalled();
        });

        it("rejects invalid package inclusions in a proposal", async () => {
            const vendorId = new mongoose.Types.ObjectId();
            const vendorUserId = new mongoose.Types.ObjectId();
            const customerId = new mongoose.Types.ObjectId();
            const packageId = new mongoose.Types.ObjectId();
            const bookingId = new mongoose.Types.ObjectId();

            vendorModelMock.findOne.mockReturnValue(leanResult({ _id: vendorId, userId: vendorUserId }));
            bookingModelMock.findOne.mockResolvedValue({
                _id: bookingId,
                vendorId,
                userId: customerId,
                packageId,
                status: BookingStatus.REQUESTED,
                history: [],
                save: vi.fn(),
            });
            quoteModelMock.findOne.mockReturnValue(leanResult(null));
            packageModelMock.findById.mockReturnValue(
                leanResult({
                    _id: packageId,
                    includes: ["Photography"],
                }),
            );

            const response = await runExpressRoute({
                router: vendorQuotesRoutes,
                path: "/me/bookings/:id/quote",
                method: "post",
                role: UserRole.VENDOR,
                sub: vendorUserId.toString(),
                params: { id: bookingId.toString() },
                body: {
                    amount: 50000,
                    packageInclusions: ["Photography", "Live Band"],
                },
            });

            expect(response.statusCode).toBe(400);
            expect(response.body.error).toBe("Invalid package inclusions selected");
            expect(quoteModelMock.create).not.toHaveBeenCalled();
        });
    });

    describe("Conversations Module", () => {
        it("blocks chat messages for cancelled bookings", async () => {
            const conversationId = new mongoose.Types.ObjectId();
            const bookingId = new mongoose.Types.ObjectId();
            const customerId = new mongoose.Types.ObjectId();
            const vendorUserId = new mongoose.Types.ObjectId();

            conversationModelMock.findOne.mockReturnValue(
                leanResult({
                    _id: conversationId,
                    participants: [customerId, vendorUserId],
                    bookingId,
                }),
            );
            bookingModelMock.findById.mockReturnValue(
                leanResult({
                    _id: bookingId,
                    status: BookingStatus.CANCELLED,
                }),
            );

            const response = await runExpressRoute({
                router: conversationsRoutes,
                path: "/:id/messages",
                method: "post",
                role: UserRole.CUSTOMER,
                sub: customerId.toString(),
                params: { id: conversationId.toString() },
                body: { text: "Hello?" },
            });

            expect(response.statusCode).toBe(400);
            expect(response.body.error).toBe("Messaging is disabled for cancelled bookings");
            expect(messageModelMock.create).not.toHaveBeenCalled();
        });

        it("stores and emits a new chat message for active bookings", async () => {
            const conversationId = new mongoose.Types.ObjectId();
            const bookingId = new mongoose.Types.ObjectId();
            const vendorId = new mongoose.Types.ObjectId();
            const customerId = new mongoose.Types.ObjectId();
            const vendorUserId = new mongoose.Types.ObjectId();

            conversationModelMock.findOne.mockReturnValue(
                leanResult({
                    _id: conversationId,
                    participants: [customerId, vendorUserId],
                    bookingId,
                }),
            );
            bookingModelMock.findById.mockReturnValue(
                leanResult({
                    _id: bookingId,
                    vendorId,
                    status: BookingStatus.ACCEPTED,
                }),
            );
            messageModelMock.create.mockResolvedValue({
                toObject: () => ({
                    _id: new mongoose.Types.ObjectId(),
                    conversationId,
                    senderId: customerId,
                    text: "See you soon",
                    createdAt: new Date("2026-04-05T10:00:00.000Z"),
                }),
            });
            conversationModelMock.findByIdAndUpdate.mockReturnValue(
                leanResult({
                    _id: conversationId,
                    participants: [customerId, vendorUserId],
                    bookingId,
                }),
            );
            vendorModelMock.findById.mockReturnValue(
                leanResult({
                    _id: vendorId,
                    userId: vendorUserId,
                }),
            );

            const response = await runExpressRoute({
                router: conversationsRoutes,
                path: "/:id/messages",
                method: "post",
                role: UserRole.CUSTOMER,
                sub: customerId.toString(),
                params: { id: conversationId.toString() },
                body: { text: "See you soon" },
            });

            expect(response.statusCode).toBe(201);
            expect(messageModelMock.create).toHaveBeenCalledWith({
                conversationId,
                senderId: expect.any(mongoose.Types.ObjectId),
                text: "See you soon",
            });
            expect(createNotificationMock).toHaveBeenCalled();
            expect(emitMessageMock).toHaveBeenCalledWith(
                conversationId.toString(),
                expect.objectContaining({ text: "See you soon" }),
            );
            expect(response.body.text).toBe("See you soon");
        });
    });

    describe("Admin Reports Module", () => {
        it("lists enriched user-submitted reports for admin review", async () => {
            const reportId = new mongoose.Types.ObjectId();
            const reporterId = new mongoose.Types.ObjectId();
            const vendorId = new mongoose.Types.ObjectId();

            reportModelMock.find.mockReturnValue(
                reportFindResult([
                    {
                        _id: reportId,
                        targetType: "vendor",
                        targetId: vendorId,
                        reason: "Abusive response in chat",
                        createdBy: reporterId,
                        status: "OPEN",
                        createdAt: new Date("2026-04-01T10:00:00.000Z"),
                        updatedAt: new Date("2026-04-01T10:00:00.000Z"),
                    },
                ]),
            );
            reportModelMock.countDocuments.mockResolvedValue(1);
            userModelMock.find.mockReturnValue(
                {
                    select: vi.fn().mockReturnValue({
                        lean: vi.fn().mockResolvedValue([
                            {
                                _id: reporterId,
                                fullName: "Customer One",
                                email: "customer@example.com",
                            },
                        ]),
                    }),
                } as any,
            );
            vendorModelMock.find.mockReturnValue(
                {
                    select: vi.fn().mockReturnValue({
                        lean: vi.fn().mockResolvedValue([
                            {
                                _id: vendorId,
                                businessName: "Vendor Studio",
                            },
                        ]),
                    }),
                } as any,
            );

            const response = await runExpressRoute({
                router: adminReportsRoutes,
                path: "/reports",
                method: "get",
                role: UserRole.ADMIN,
                sub: new mongoose.Types.ObjectId().toString(),
                query: { status: "OPEN", page: "1", limit: "50" },
            });

            expect(response.statusCode).toBe(200);
            expect(response.body.items).toHaveLength(1);
            expect(response.body.items[0]).toMatchObject({
                reporterName: "Customer One",
                targetName: "Vendor Studio",
                reason: "Abusive response in chat",
                status: "OPEN",
            });
        });

        it("updates a report status for admin moderation", async () => {
            const reportId = new mongoose.Types.ObjectId();
            reportModelMock.findByIdAndUpdate.mockReturnValue(
                leanResult({
                    _id: reportId,
                    targetType: "vendor",
                    targetId: new mongoose.Types.ObjectId(),
                    reason: "Spam listing",
                    createdBy: new mongoose.Types.ObjectId(),
                    status: "RESOLVED",
                    createdAt: new Date("2026-04-01T10:00:00.000Z"),
                    updatedAt: new Date("2026-04-02T11:00:00.000Z"),
                }),
            );

            const response = await runExpressRoute({
                router: adminReportsRoutes,
                path: "/reports/:id",
                method: "patch",
                role: UserRole.ADMIN,
                sub: new mongoose.Types.ObjectId().toString(),
                params: { id: reportId.toString() },
                body: { status: "RESOLVED" },
            });

            expect(response.statusCode).toBe(200);
            expect(reportModelMock.findByIdAndUpdate).toHaveBeenCalled();
            expect(response.body.status).toBe("RESOLVED");
        });
    });

    describe("Account Module", () => {
        it("returns account security details for the authenticated user", async () => {
            userModelMock.findById.mockReturnValue(
                leanResult({
                    _id: new mongoose.Types.ObjectId(),
                    email: "customer@example.com",
                    twoFactorEnabled: true,
                    twoFactorTempSecret: "TEMPSECRET",
                }),
            );

            const response = await runExpressRoute({
                router: accountRoutes,
                path: "/security",
                method: "get",
                role: UserRole.CUSTOMER,
                sub: new mongoose.Types.ObjectId().toString(),
            });

            expect(response.statusCode).toBe(200);
            expect(response.body).toMatchObject({
                email: "customer@example.com",
                twoFactorEnabled: true,
                hasPendingSetup: true,
            });
        });

        it("starts 2FA setup and returns a QR code payload", async () => {
            const save = vi.fn().mockResolvedValue(undefined);
            userModelMock.findById.mockResolvedValue({
                _id: new mongoose.Types.ObjectId(),
                email: "customer@example.com",
                twoFactorTempSecret: undefined,
                save,
            });
            generateSecretMock.mockReturnValue("SECRETKEY");
            generateURIMock.mockReturnValue("otpauth://evently");
            qrcodeToDataUrlMock.mockResolvedValue("data:image/png;base64,abc");

            const response = await runExpressRoute({
                router: accountRoutes,
                path: "/2fa/setup",
                method: "post",
                role: UserRole.CUSTOMER,
                sub: new mongoose.Types.ObjectId().toString(),
            });

            expect(response.statusCode).toBe(200);
            expect(generateSecretMock).toHaveBeenCalled();
            expect(qrcodeToDataUrlMock).toHaveBeenCalledWith("otpauth://evently");
            expect(save).toHaveBeenCalledTimes(1);
            expect(response.body).toMatchObject({
                qrCodeDataUrl: "data:image/png;base64,abc",
                manualEntryKey: "SECRETKEY",
                email: "customer@example.com",
            });
        });

        it("enables 2FA after a valid authenticator code is provided", async () => {
            const save = vi.fn().mockResolvedValue(undefined);
            userModelMock.findById.mockResolvedValue({
                _id: new mongoose.Types.ObjectId(),
                fullName: "Customer One",
                email: "customer@example.com",
                phone: "9800000000",
                role: UserRole.CUSTOMER,
                status: UserStatus.ACTIVE,
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
                twoFactorTempSecret: "TEMPSECRET",
                twoFactorEnabled: false,
                save,
            });
            vi.mocked(verifySync).mockReturnValue({ valid: true } as never);

            const response = await runExpressRoute({
                router: accountRoutes,
                path: "/2fa/enable",
                method: "post",
                role: UserRole.CUSTOMER,
                sub: new mongoose.Types.ObjectId().toString(),
                body: { code: "123456" },
            });

            expect(response.statusCode).toBe(200);
            expect(save).toHaveBeenCalledTimes(1);
            expect(response.body.twoFactorEnabled).toBe(true);
        });

        it("disables 2FA after a valid authenticator code is provided", async () => {
            const save = vi.fn().mockResolvedValue(undefined);
            userModelMock.findById.mockResolvedValue({
                _id: new mongoose.Types.ObjectId(),
                fullName: "Customer One",
                email: "customer@example.com",
                phone: "9800000000",
                role: UserRole.CUSTOMER,
                status: UserStatus.ACTIVE,
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
                twoFactorSecret: "REALSECRET",
                twoFactorEnabled: true,
                save,
            });
            vi.mocked(verifySync).mockReturnValue({ valid: true } as never);

            const response = await runExpressRoute({
                router: accountRoutes,
                path: "/2fa/disable",
                method: "post",
                role: UserRole.CUSTOMER,
                sub: new mongoose.Types.ObjectId().toString(),
                body: { code: "123456" },
            });

            expect(response.statusCode).toBe(200);
            expect(save).toHaveBeenCalledTimes(1);
            expect(response.body.twoFactorEnabled).toBe(false);
        });
    });

    describe("Availability Module", () => {
        it("lists vendor availability records within a date range", async () => {
            const vendorId = new mongoose.Types.ObjectId();
            resolveVendorForUserMock.mockResolvedValue({ _id: vendorId });
            availabilityModelMock.find.mockReturnValue(
                paginatedFindResult([
                    {
                        _id: new mongoose.Types.ObjectId(),
                        vendorId,
                        date: new Date("2026-02-15T00:00:00.000Z"),
                        isAvailable: false,
                        slots: [],
                    },
                ]),
            );
            availabilityModelMock.countDocuments.mockResolvedValue(1);

            const response = await runExpressRoute({
                router: availabilityRoutes,
                path: "/me/availabilities",
                method: "get",
                role: UserRole.VENDOR,
                sub: new mongoose.Types.ObjectId().toString(),
                query: { from: "2026-02-01", to: "2026-02-28", page: "1", limit: "20" },
            });

            expect(response.statusCode).toBe(200);
            expect(response.body.items).toHaveLength(1);
            expect(response.body.total).toBe(1);
        });

        it("creates a blocked availability date when no conflicting bookings exist", async () => {
            const vendorId = new mongoose.Types.ObjectId();
            resolveVendorForUserMock.mockResolvedValue({ _id: vendorId });
            eventModelMock.find.mockReturnValue(leanResult([]));
            availabilityModelMock.findOneAndUpdate.mockReturnValue(
                leanResult({
                    _id: new mongoose.Types.ObjectId(),
                    vendorId,
                    date: new Date("2026-02-20T00:00:00.000Z"),
                    isAvailable: false,
                    slots: [],
                }),
            );

            const response = await runExpressRoute({
                router: availabilityRoutes,
                path: "/me/availability/:date",
                method: "put",
                role: UserRole.VENDOR,
                sub: new mongoose.Types.ObjectId().toString(),
                params: { date: "2026-02-20" },
                body: { isAvailable: false, slots: [] },
            });

            expect(response.statusCode).toBe(200);
            expect(availabilityModelMock.findOneAndUpdate).toHaveBeenCalled();
            expect(response.body.isAvailable).toBe(false);
        });
    });

    describe("Notifications Module", () => {
        it("lists notifications for the authenticated user", async () => {
            const userId = new mongoose.Types.ObjectId();
            notificationModelMock.find.mockReturnValue(
                paginatedFindResult([
                    {
                        _id: new mongoose.Types.ObjectId(),
                        userId,
                        type: NotificationType.BOOKING_REQUESTED,
                        title: "New booking",
                        body: "A booking was created",
                        link: "/vendor/bookings",
                        createdAt: new Date("2026-04-01T00:00:00.000Z"),
                    },
                ]),
            );
            notificationModelMock.countDocuments.mockResolvedValue(1);

            const response = await runExpressRoute({
                router: notificationsRoutes,
                path: "/",
                method: "get",
                role: UserRole.CUSTOMER,
                sub: userId.toString(),
                query: { page: "1", limit: "20" },
            });

            expect(response.statusCode).toBe(200);
            expect(response.body.items).toHaveLength(1);
            expect(response.body.items[0]).toMatchObject({
                title: "New booking",
                isRead: false,
            });
        });

        it("marks a single notification as read", async () => {
            const notificationId = new mongoose.Types.ObjectId();
            const userId = new mongoose.Types.ObjectId();
            notificationModelMock.findOneAndUpdate.mockReturnValue(
                leanResult({
                    _id: notificationId,
                    userId,
                    type: NotificationType.MESSAGE,
                    title: "New message",
                    body: "You have a message",
                    link: "/messages",
                    readAt: new Date("2026-04-02T00:00:00.000Z"),
                    createdAt: new Date("2026-04-01T00:00:00.000Z"),
                }),
            );

            const response = await runExpressRoute({
                router: notificationsRoutes,
                path: "/:id/read",
                method: "post",
                role: UserRole.CUSTOMER,
                sub: userId.toString(),
                params: { id: notificationId.toString() },
            });

            expect(response.statusCode).toBe(200);
            expect(response.body.isRead).toBe(true);
        });

        it("marks all unread notifications as read", async () => {
            notificationModelMock.updateMany.mockResolvedValue({ modifiedCount: 3 });

            const response = await runExpressRoute({
                router: notificationsRoutes,
                path: "/read-all",
                method: "post",
                role: UserRole.CUSTOMER,
                sub: new mongoose.Types.ObjectId().toString(),
            });

            expect(response.statusCode).toBe(200);
            expect(response.body.updated).toBe(3);
        });
    });

    describe("Favorites Module", () => {
        it("adds a vendor to customer favorites", async () => {
            favoriteModelMock.updateOne.mockResolvedValue({ acknowledged: true });

            const response = await runExpressRoute({
                router: favoritesRoutes,
                path: "/vendors/:vendorId",
                method: "post",
                role: UserRole.CUSTOMER,
                sub: new mongoose.Types.ObjectId().toString(),
                params: { vendorId: new mongoose.Types.ObjectId().toString() },
            });

            expect(response.statusCode).toBe(200);
            expect(favoriteModelMock.updateOne).toHaveBeenCalled();
            expect(response.body.ok).toBe(true);
        });

        it("removes a vendor from customer favorites", async () => {
            favoriteModelMock.deleteOne.mockResolvedValue({ deletedCount: 1 });

            const response = await runExpressRoute({
                router: favoritesRoutes,
                path: "/vendors/:vendorId",
                method: "delete",
                role: UserRole.CUSTOMER,
                sub: new mongoose.Types.ObjectId().toString(),
                params: { vendorId: new mongoose.Types.ObjectId().toString() },
            });

            expect(response.statusCode).toBe(200);
            expect(response.body.deleted).toBe(true);
        });

        it("lists favorited vendors for the authenticated customer", async () => {
            const vendorId = new mongoose.Types.ObjectId();
            const userId = new mongoose.Types.ObjectId();
            const categoryId = new mongoose.Types.ObjectId();
            const locationId = new mongoose.Types.ObjectId();
            favoriteModelMock.find.mockReturnValue(
                paginatedFindResult([
                    {
                        _id: new mongoose.Types.ObjectId(),
                        userId,
                        vendorId,
                    },
                ]),
            );
            favoriteModelMock.countDocuments.mockResolvedValue(1);
            vendorModelMock.find.mockReturnValue(
                leanResult([
                    {
                        _id: vendorId,
                        userId,
                        businessName: "Vendor Studio",
                        categoryId,
                        primaryLocationId: locationId,
                        locationText: "Kathmandu",
                        serviceAreas: ["Kathmandu"],
                        contactEmail: "vendor@example.com",
                        contactPhone: "9800000000",
                        social: {},
                        portfolioMedia: ["/uploads/vendor.jpg"],
                        verifiedStatus: "APPROVED",
                        ratingAvg: 4.8,
                        ratingCount: 9,
                        createdAt: new Date("2026-01-01T00:00:00.000Z"),
                    },
                ]),
            );
            categoryModelMock.find.mockReturnValue(
                leanResult([{ _id: categoryId, name: "Photography", slug: "photography" }]),
            );
            locationModelMock.find.mockReturnValue(
                leanResult([{ _id: locationId, name: "Kathmandu" }]),
            );
            userModelMock.find.mockReturnValue(
                leanResult([
                    {
                        _id: userId,
                        fullName: "Vendor Owner",
                        email: "vendor@example.com",
                        phone: "9800000000",
                    },
                ]),
            );

            const response = await runExpressRoute({
                router: favoritesRoutes,
                path: "/",
                method: "get",
                role: UserRole.CUSTOMER,
                sub: userId.toString(),
                query: { page: "1", limit: "20" },
            });

            expect(response.statusCode).toBe(200);
            expect(response.body.items).toHaveLength(1);
            expect(response.body.items[0]).toMatchObject({
                businessName: "Vendor Studio",
                category: "Photography",
            });
        });
    });

    describe("Support Tickets Module", () => {
        it("creates a support ticket and notifies admins", async () => {
            supportTicketModelMock.create.mockResolvedValue({
                _id: new mongoose.Types.ObjectId(),
                subject: "Need help",
                message: "Please assist",
                status: "OPEN",
            });

            const response = await runExpressRoute({
                router: supportTicketsRoutes,
                path: "/",
                method: "post",
                role: UserRole.CUSTOMER,
                sub: new mongoose.Types.ObjectId().toString(),
                body: { subject: "Need help", message: "Please assist" },
            });

            expect(response.statusCode).toBe(201);
            expect(supportTicketModelMock.create).toHaveBeenCalled();
            expect(createNotificationsForAdminsMock).toHaveBeenCalled();
        });

        it("lists support tickets created by the authenticated user", async () => {
            supportTicketModelMock.find.mockReturnValue(
                paginatedFindResult([
                    {
                        _id: new mongoose.Types.ObjectId(),
                        subject: "Need help",
                        message: "Please assist",
                        status: "OPEN",
                    },
                ]),
            );
            supportTicketModelMock.countDocuments.mockResolvedValue(1);

            const response = await runExpressRoute({
                router: supportTicketsRoutes,
                path: "/",
                method: "get",
                role: UserRole.CUSTOMER,
                sub: new mongoose.Types.ObjectId().toString(),
                query: { page: "1", limit: "20" },
            });

            expect(response.statusCode).toBe(200);
            expect(response.body.items).toHaveLength(1);
            expect(response.body.total).toBe(1);
        });
    });

    describe("Reviews Module", () => {
        it("returns the existing review for a completed booking", async () => {
            const bookingId = new mongoose.Types.ObjectId();
            const userId = new mongoose.Types.ObjectId();
            bookingModelMock.findOne.mockReturnValue(
                leanResult({ _id: bookingId, userId }),
            );
            reviewModelMock.findOne.mockReturnValue(
                leanResult({
                    _id: new mongoose.Types.ObjectId(),
                    bookingId,
                    customerId: userId,
                    rating: 5,
                    comment: "Great work",
                }),
            );

            const response = await runExpressRoute({
                router: reviewsRoutes,
                path: "/booking/:bookingId",
                method: "get",
                role: UserRole.CUSTOMER,
                sub: userId.toString(),
                params: { bookingId: bookingId.toString() },
            });

            expect(response.statusCode).toBe(200);
            expect(response.body.rating).toBe(5);
        });

        it("creates a review for a completed booking and updates vendor rating", async () => {
            const bookingId = new mongoose.Types.ObjectId();
            const userId = new mongoose.Types.ObjectId();
            const vendorId = new mongoose.Types.ObjectId();
            bookingModelMock.findOne.mockReturnValue(
                leanResult({
                    _id: bookingId,
                    userId,
                    vendorId,
                    status: BookingStatus.COMPLETED,
                }),
            );
            reviewModelMock.findOne.mockReturnValueOnce(leanResult(null));
            reviewModelMock.create.mockResolvedValue({
                _id: new mongoose.Types.ObjectId(),
                bookingId,
                vendorId,
                customerId: userId,
                rating: 5,
                comment: "Excellent service",
            });
            vendorModelMock.findById.mockReturnValue(
                leanResult({
                    _id: vendorId,
                    userId: new mongoose.Types.ObjectId(),
                    ratingAvg: 4,
                    ratingCount: 1,
                }),
            );
            vendorModelMock.updateOne.mockResolvedValue({ acknowledged: true });

            const response = await runExpressRoute({
                router: reviewsRoutes,
                path: "/",
                method: "post",
                role: UserRole.CUSTOMER,
                sub: userId.toString(),
                body: { bookingId: bookingId.toString(), rating: 5, comment: "Excellent service" },
            });

            expect(response.statusCode).toBe(201);
            expect(reviewModelMock.create).toHaveBeenCalled();
            expect(vendorModelMock.updateOne).toHaveBeenCalled();
            expect(createNotificationMock).toHaveBeenCalled();
        });

        it("rejects review creation for bookings that are not completed", async () => {
            const bookingId = new mongoose.Types.ObjectId();
            const userId = new mongoose.Types.ObjectId();
            bookingModelMock.findOne.mockReturnValue(
                leanResult({
                    _id: bookingId,
                    userId,
                    vendorId: new mongoose.Types.ObjectId(),
                    status: BookingStatus.ACCEPTED,
                }),
            );

            const response = await runExpressRoute({
                router: reviewsRoutes,
                path: "/",
                method: "post",
                role: UserRole.CUSTOMER,
                sub: userId.toString(),
                body: { bookingId: bookingId.toString(), rating: 5, comment: "Excellent service" },
            });

            expect(response.statusCode).toBe(400);
            expect(response.body.error).toContain("completed bookings");
        });

        it("lists public vendor reviews with customer details", async () => {
            const reviewId = new mongoose.Types.ObjectId();
            const bookingId = new mongoose.Types.ObjectId();
            const userId = new mongoose.Types.ObjectId();
            const vendorId = new mongoose.Types.ObjectId();
            reviewModelMock.find.mockReturnValue(
                paginatedFindResult([
                    {
                        _id: reviewId,
                        bookingId,
                        customerId: userId,
                        vendorId,
                        rating: 5,
                        comment: "Excellent",
                        createdAt: new Date("2026-04-03T00:00:00.000Z"),
                    },
                ]),
            );
            reviewModelMock.countDocuments.mockResolvedValue(1);
            userModelMock.find.mockReturnValue(
                leanResult([
                    {
                        _id: userId,
                        fullName: "Customer One",
                        email: "customer@example.com",
                        phone: "9800000000",
                        role: UserRole.CUSTOMER,
                        status: UserStatus.ACTIVE,
                        isActive: true,
                        createdAt: new Date("2026-01-01T00:00:00.000Z"),
                    },
                ]),
            );

            const response = await runExpressRoute({
                router: reviewsRoutes,
                path: "/",
                method: "get",
                role: UserRole.CUSTOMER,
                sub: userId.toString(),
                query: { vendorId: vendorId.toString(), page: "1", limit: "20" },
            });

            expect(response.statusCode).toBe(200);
            expect(response.body.items).toHaveLength(1);
            expect(response.body.items[0].customer.email).toBe("customer@example.com");
        });

        it("lists reviews for the authenticated vendor", async () => {
            const vendorId = new mongoose.Types.ObjectId();
            const userId = new mongoose.Types.ObjectId();
            reviewModelMock.find.mockReturnValue(
                paginatedFindResult([
                    {
                        _id: new mongoose.Types.ObjectId(),
                        bookingId: new mongoose.Types.ObjectId(),
                        customerId: userId,
                        vendorId,
                        rating: 4,
                        comment: "Great",
                        createdAt: new Date("2026-04-03T00:00:00.000Z"),
                    },
                ]),
            );
            reviewModelMock.countDocuments.mockResolvedValue(1);
            vendorModelMock.findOne.mockReturnValue(leanResult({ _id: vendorId, userId }));
            userModelMock.find.mockReturnValue(
                leanResult([
                    {
                        _id: userId,
                        fullName: "Customer One",
                        email: "customer@example.com",
                        phone: "9800000000",
                        role: UserRole.CUSTOMER,
                        status: UserStatus.ACTIVE,
                        isActive: true,
                        createdAt: new Date("2026-01-01T00:00:00.000Z"),
                    },
                ]),
            );

            const response = await runExpressRoute({
                router: vendorReviewsRoutes,
                path: "/me/reviews",
                method: "get",
                role: UserRole.VENDOR,
                sub: userId.toString(),
                query: { page: "1", limit: "20" },
            });

            expect(response.statusCode).toBe(200);
            expect(response.body.items).toHaveLength(1);
            expect(response.body.items[0].rating).toBe(4);
        });
    });

    describe("Catalog Modules", () => {
        it("lists active categories from the catalog", async () => {
            categoryModelMock.find.mockReturnValue(
                sortedListResult([{ _id: new mongoose.Types.ObjectId(), name: "Photography" }]),
            );

            const response = await runExpressRoute({
                router: categoriesRoutes,
                path: "/",
                method: "get",
                role: UserRole.CUSTOMER,
                sub: new mongoose.Types.ObjectId().toString(),
                query: { active: "true" },
            });

            expect(response.statusCode).toBe(200);
            expect(response.body.items).toHaveLength(1);
            expect(response.body.items[0].name).toBe("Photography");
        });

        it("lists locations filtered by search query", async () => {
            locationModelMock.find.mockReturnValue(
                sortedListResult([{ _id: new mongoose.Types.ObjectId(), name: "Kathmandu" }]),
            );

            const response = await runExpressRoute({
                router: locationsRoutes,
                path: "/",
                method: "get",
                role: UserRole.CUSTOMER,
                sub: new mongoose.Types.ObjectId().toString(),
                query: { q: "kath", type: "CITY" },
            });

            expect(response.statusCode).toBe(200);
            expect(response.body.items).toHaveLength(1);
            expect(response.body.items[0].name).toBe("Kathmandu");
        });
    });

    describe("Payment Reminder Job", () => {
        it("sends a reminder when a completed booking still has unpaid balance", async () => {
            const bookingId = new mongoose.Types.ObjectId();
            const userId = new mongoose.Types.ObjectId();

            bookingModelMock.find.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    lean: vi
                        .fn()
                        .mockResolvedValue([{ _id: bookingId, userId, eventId: new mongoose.Types.ObjectId() }]),
                }),
            });
            quoteModelMock.find.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    lean: vi.fn().mockResolvedValue([{ bookingId, amount: 5000 }]),
                }),
            });
            paymentModelMock.aggregate.mockResolvedValue([{ _id: bookingId, totalPaid: 2000 }]);
            userModelMock.find.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    lean: vi.fn().mockResolvedValue([
                        { _id: userId, email: "customer@example.com", fullName: "Customer One" },
                    ]),
                }),
            });

            await runPaymentReminderCycle();

            expect(buildPaymentReminderEmailMock).toHaveBeenCalledWith({
                recipientName: "Customer One",
                bookingId: bookingId.toString(),
                amount: 3000,
                paymentUrl: `http://localhost:8085/customer/bookings/${bookingId.toString()}`,
            });
            expect(sendEmailMock).toHaveBeenCalledTimes(1);
            expect(bookingModelMock.updateOne).toHaveBeenCalledTimes(1);
        });

        it("skips reminder emails when the booking is already fully paid", async () => {
            const bookingId = new mongoose.Types.ObjectId();
            const userId = new mongoose.Types.ObjectId();

            bookingModelMock.find.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    lean: vi
                        .fn()
                        .mockResolvedValue([{ _id: bookingId, userId, eventId: new mongoose.Types.ObjectId() }]),
                }),
            });
            quoteModelMock.find.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    lean: vi.fn().mockResolvedValue([{ bookingId, amount: 5000 }]),
                }),
            });
            paymentModelMock.aggregate.mockResolvedValue([{ _id: bookingId, totalPaid: 5000 }]);
            userModelMock.find.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    lean: vi.fn().mockResolvedValue([
                        { _id: userId, email: "customer@example.com", fullName: "Customer One" },
                    ]),
                }),
            });

            await runPaymentReminderCycle();

            expect(sendEmailMock).not.toHaveBeenCalled();
            expect(bookingModelMock.updateOne).not.toHaveBeenCalled();
        });
    });
});
