import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../middlewares/errorHandler.js";
import { BookingStatus, UserRole } from "../../common/enums.js";

const conversationModelMock = {
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
};

const messageModelMock = {
    create: vi.fn(),
};

const bookingModelMock = {
    findById: vi.fn(),
};

const vendorModelMock = {
    findById: vi.fn(),
};

const createNotificationMock = vi.fn();
const emitMessageMock = vi.fn();

vi.mock("../../configurations/env.js", () => ({
    env: {
        JWT_SECRET: "conversation-route-secret",
    },
}));

vi.mock("./conversation.model.js", () => ({
    ConversationModel: conversationModelMock,
}));

vi.mock("./message.model.js", () => ({
    MessageModel: messageModelMock,
}));

vi.mock("../bookings/booking.model.js", () => ({
    BookingModel: bookingModelMock,
}));

vi.mock("../vendors/vendor.model.js", () => ({
    VendorModel: vendorModelMock,
}));

vi.mock("../notifications/notifications.service.js", () => ({
    createNotification: createNotificationMock,
}));

vi.mock("../../socket.js", () => ({
    emitMessage: emitMessageMock,
}));

const { conversationsRoutes } = await import("./conversations.routes.js");

function createToken(sub: string, role: UserRole) {
    return jwt.sign({ sub, role }, "conversation-route-secret");
}

function leanResult<T>(value: T) {
    return {
        lean: vi.fn().mockResolvedValue(value),
    };
}

async function runSendMessage(paramsId: string, body: Record<string, unknown>, tokenSub: string) {
    const layer = conversationsRoutes.stack.find(
        (entry) => {
            const route = entry.route as { path?: string; methods?: { post?: boolean } } | undefined;
            return route?.path === "/:id/messages" && route.methods?.post;
        },
    );
    if (!layer?.route) throw new Error("POST messages route not found");

    const req: any = {
        body,
        params: { id: paramsId },
        query: {},
        headers: {
            authorization: `Bearer ${createToken(tokenSub, UserRole.CUSTOMER)}`,
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

describe("conversations routes", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

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

        const response = await runSendMessage(
            conversationId.toString(),
            { text: "Hello?" },
            customerId.toString(),
        );

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

        const response = await runSendMessage(
            conversationId.toString(),
            { text: "See you soon" },
            customerId.toString(),
        );

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
