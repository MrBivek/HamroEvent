import mongoose from "mongoose";
import { env } from "../../configurations/env.js";
import { BookingModel } from "../../modules/bookings/booking.model.js";
import { QuoteModel } from "../../modules/quotes/quote.model.js";
import { PaymentModel } from "../../modules/payments/payment.model.js";
import { UserModel } from "../../modules/auth/user.model.js";
import { BookingStatus, PaymentStatus } from "../enums.js";
import { sendEmail } from "../email.js";
import { buildPaymentReminderEmail } from "../emailTemplates.js";

const INTERVAL_MS = 5000;

let intervalHandle: NodeJS.Timeout | null = null;
let isRunning = false;

async function runPaymentReminderCycle() {
    if (isRunning) return;
    isRunning = true;
    try {
        const cooldownMs = env.PAYMENT_REMINDER_COOLDOWN_MINUTES * 60 * 1000;
        const cutoff = new Date(Date.now() - cooldownMs);

        const bookings = await BookingModel.find({
            status: BookingStatus.COMPLETED,
            $or: [
                { lastPaymentReminderAt: { $exists: false } },
                { lastPaymentReminderAt: { $lt: cutoff } },
            ],
        })
            .select({ _id: 1, userId: 1, eventId: 1 })
            .lean();

        if (!bookings.length) return;

        const bookingIds = bookings.map((b) => b._id);

        const [quotes, paymentsAgg, users] = await Promise.all([
            QuoteModel.find({ bookingId: { $in: bookingIds } }).select({ bookingId: 1, amount: 1 }).lean(),
            PaymentModel.aggregate<{ _id: mongoose.Types.ObjectId; totalPaid: number }>([
                { $match: { bookingId: { $in: bookingIds }, status: PaymentStatus.PAID } },
                { $group: { _id: "$bookingId", totalPaid: { $sum: "$amount" } } },
            ]),
            UserModel.find({ _id: { $in: bookings.map((b) => b.userId) } })
                .select({ _id: 1, email: 1, name: 1, fullName: 1 })
                .lean(),
        ]);

        const quoteMap = new Map<string, number>();
        quotes.forEach((q) => {
            quoteMap.set(q.bookingId.toString(), q.amount);
        });

        const paidMap = new Map<string, number>();
        paymentsAgg.forEach((p) => {
            paidMap.set(p._id.toString(), p.totalPaid);
        });

        const userMap = new Map<string, { email?: string; name?: string; fullName?: string }>();
        users.forEach((u) => {
            userMap.set(u._id.toString(), u);
        });

        for (const booking of bookings) {
            const bookingId = booking._id.toString();
            const amount = quoteMap.get(bookingId);
            if (!amount || amount <= 0) continue;

            const paid = paidMap.get(bookingId) ?? 0;
            const remaining = amount - paid;
            if (remaining <= 0) continue;

            const user = userMap.get(booking.userId.toString());
            if (!user?.email) continue;

            const email = buildPaymentReminderEmail({
                recipientName: user.name || user.fullName,
                bookingId,
                amount: remaining,
                paymentUrl: `${env.CLIENT_URL}/customer/bookings/${bookingId}`,
            });

            await sendEmail({
                to: user.email,
                subject: email.subject,
                text: email.text,
                html: email.html,
            });

            await BookingModel.updateOne(
                { _id: booking._id },
                { $set: { lastPaymentReminderAt: new Date() } },
            );
        }
    } catch (error) {
        console.error("[PaymentReminderJob]", error);
    } finally {
        isRunning = false;
    }
}

export function startPaymentReminderJob() {
    if (env.NODE_ENV === "test") return;
    if (intervalHandle) return;
    intervalHandle = setInterval(runPaymentReminderCycle, INTERVAL_MS);
    setTimeout(runPaymentReminderCycle, 1000).unref?.();
}

export function stopPaymentReminderJob() {
    if (!intervalHandle) return;
    clearInterval(intervalHandle);
    intervalHandle = null;
}
