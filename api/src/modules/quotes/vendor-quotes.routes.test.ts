import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../middlewares/errorHandler.js";
import { BookingStatus, QuoteStatus, UserRole } from "../../common/enums.js";

const vendorModelMock = {
    findOne: vi.fn(),
};

const bookingModelMock = {
    findOne: vi.fn(),
};

const quoteModelMock = {
    findOne: vi.fn(),
    create: vi.fn(),
};

const packageModelMock = {
    findById: vi.fn(),
};

const emitQuoteUpdateMock = vi.fn();
const emitBookingUpdateMock = vi.fn();
const sendQuoteApprovedEmailsMock = vi.fn();

vi.mock("../../configurations/env.js", () => ({
    env: {
        JWT_SECRET: "quote-route-secret",
    },
}));

vi.mock("../vendors/vendor.model.js", () => ({
    VendorModel: vendorModelMock,
}));

vi.mock("../bookings/booking.model.js", () => ({
    BookingModel: bookingModelMock,
}));

vi.mock("./quote.model.js", () => ({
    QuoteModel: quoteModelMock,
}));

vi.mock("../packages/package.model.js", () => ({
    PackageModel: packageModelMock,
}));

vi.mock("../../socket.js", () => ({
    emitQuoteUpdate: emitQuoteUpdateMock,
    emitBookingUpdate: emitBookingUpdateMock,
}));

vi.mock("./quotes.service.js", () => ({
    sendQuoteApprovedEmails: sendQuoteApprovedEmailsMock,
}));

const { vendorQuotesRoutes } = await import("./vendor-quotes.routes.js");

function createToken(sub: string, role: UserRole) {
    return jwt.sign({ sub, role }, "quote-route-secret");
}

function leanResult<T>(value: T) {
    return {
        lean: vi.fn().mockResolvedValue(value),
    };
}

async function runPostQuote(
    pathBookingId: string,
    body: Record<string, unknown>,
    tokenSub: string,
) {
    const layer = vendorQuotesRoutes.stack.find((entry) => {
        const route = entry.route as { path?: string; methods?: { post?: boolean } } | undefined;
        return route?.path === "/me/bookings/:id/quote" && route.methods?.post;
    });
    if (!layer?.route) throw new Error("POST quote route not found");

    const req: any = {
        body,
        params: { id: pathBookingId },
        query: {},
        headers: {
            authorization: `Bearer ${createToken(tokenSub, UserRole.VENDOR)}`,
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

describe("vendor quotes routes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("creates a proposal for a pending booking and appends booking history", async () => {
        const vendorId = new mongoose.Types.ObjectId();
        const vendorUserId = new mongoose.Types.ObjectId();
        const customerId = new mongoose.Types.ObjectId();
        const packageId = new mongoose.Types.ObjectId();
        const bookingId = new mongoose.Types.ObjectId();
        const save = vi.fn().mockResolvedValue(undefined);

        vendorModelMock.findOne.mockReturnValue(
            leanResult({ _id: vendorId, userId: vendorUserId }),
        );
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

        const response = await runPostQuote(
            bookingId.toString(),
            {
                amount: 50000,
                message: "Updated proposal",
                packageInclusions: ["Photography"],
                customInclusions: ["Drone shot"],
            },
            vendorUserId.toString(),
        );

        expect(response.statusCode).toBe(201);
        expect(quoteModelMock.create).toHaveBeenCalledWith(
            expect.objectContaining({
                bookingId,
                vendorId,
                customerId,
                amount: 50000,
                packageInclusions: ["Photography"],
                customInclusions: ["Drone shot"],
            }),
        );
        expect(save).toHaveBeenCalledTimes(1);
        expect(emitQuoteUpdateMock).toHaveBeenCalled();
        expect(emitBookingUpdateMock).toHaveBeenCalled();
        expect(response.body).toMatchObject({
            amount: 50000,
            message: "Updated proposal",
            status: "pending",
        });
    });

    it("rejects invalid package inclusions in a proposal", async () => {
        const vendorId = new mongoose.Types.ObjectId();
        const vendorUserId = new mongoose.Types.ObjectId();
        const customerId = new mongoose.Types.ObjectId();
        const packageId = new mongoose.Types.ObjectId();
        const bookingId = new mongoose.Types.ObjectId();

        vendorModelMock.findOne.mockReturnValue(
            leanResult({ _id: vendorId, userId: vendorUserId }),
        );
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

        const response = await runPostQuote(
            bookingId.toString(),
            {
                amount: 50000,
                packageInclusions: ["Photography", "Live Band"],
            },
            vendorUserId.toString(),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Invalid package inclusions selected");
        expect(quoteModelMock.create).not.toHaveBeenCalled();
    });
});
