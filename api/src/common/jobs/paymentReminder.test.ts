import { beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";

const bookingModelMock = {
    find: vi.fn(),
    updateOne: vi.fn(),
};

const quoteModelMock = {
    find: vi.fn(),
};

const paymentModelMock = {
    aggregate: vi.fn(),
};

const userModelMock = {
    find: vi.fn(),
};

const sendEmailMock = vi.fn();
const buildPaymentReminderEmailMock = vi.fn();

vi.mock("../../configurations/env.js", () => ({
    env: {
        CLIENT_URL: "http://localhost:8085",
        PAYMENT_REMINDER_COOLDOWN_MINUTES: 60,
        NODE_ENV: "test",
    },
}));

vi.mock("../../modules/bookings/booking.model.js", () => ({
    BookingModel: bookingModelMock,
}));

vi.mock("../../modules/quotes/quote.model.js", () => ({
    QuoteModel: quoteModelMock,
}));

vi.mock("../../modules/payments/payment.model.js", () => ({
    PaymentModel: paymentModelMock,
}));

vi.mock("../../modules/auth/user.model.js", () => ({
    UserModel: userModelMock,
}));

vi.mock("../email.js", () => ({
    sendEmail: sendEmailMock,
}));

vi.mock("../emailTemplates.js", () => ({
    buildPaymentReminderEmail: buildPaymentReminderEmailMock,
}));

const { runPaymentReminderCycle } = await import("./paymentReminder.js");

describe("payment reminder job", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        buildPaymentReminderEmailMock.mockReturnValue({
            subject: "Pending payment reminder",
            text: "Please pay",
            html: "<p>Please pay</p>",
        });
    });

    it("sends a reminder when a completed booking still has unpaid balance", async () => {
        const bookingId = new mongoose.Types.ObjectId();
        const userId = new mongoose.Types.ObjectId();

        bookingModelMock.find.mockReturnValue({
            select: vi.fn().mockReturnValue({
                lean: vi
                    .fn()
                    .mockResolvedValue([
                        { _id: bookingId, userId, eventId: new mongoose.Types.ObjectId() },
                    ]),
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
                lean: vi
                    .fn()
                    .mockResolvedValue([
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

    it("skips sending when the booking is already fully paid", async () => {
        const bookingId = new mongoose.Types.ObjectId();
        const userId = new mongoose.Types.ObjectId();

        bookingModelMock.find.mockReturnValue({
            select: vi.fn().mockReturnValue({
                lean: vi
                    .fn()
                    .mockResolvedValue([
                        { _id: bookingId, userId, eventId: new mongoose.Types.ObjectId() },
                    ]),
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
                lean: vi
                    .fn()
                    .mockResolvedValue([
                        { _id: userId, email: "customer@example.com", fullName: "Customer One" },
                    ]),
            }),
        });

        await runPaymentReminderCycle();

        expect(sendEmailMock).not.toHaveBeenCalled();
        expect(bookingModelMock.updateOne).not.toHaveBeenCalled();
    });
});
