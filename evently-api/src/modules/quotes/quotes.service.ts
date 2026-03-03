import { sendEmail } from "../../common/email.js";
import { buildQuoteApprovedEmail } from "../../common/emailTemplates.js";
import { EventModel } from "../events/event.model.js";
import { UserModel } from "../auth/user.model.js";
import { VendorModel } from "../vendors/vendor.model.js";
import type { QuoteDoc } from "./quote.model.js";
import type { BookingDoc } from "../bookings/booking.model.js";

function formatEventDate(value?: Date | string | null) {
    if (!value) return undefined;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export async function sendQuoteApprovedEmails(input: { quote: QuoteDoc; booking: BookingDoc }) {
    const [event, vendor, customer] = await Promise.all([
        EventModel.findById(input.booking.eventId).lean(),
        VendorModel.findById(input.booking.vendorId).lean(),
        UserModel.findById(input.booking.userId).lean(),
    ]);

    const vendorUser = vendor ? await UserModel.findById(vendor.userId).lean() : null;

    const inclusions = [
        ...(input.quote.packageInclusions ?? []),
        ...(input.quote.customInclusions ?? []),
    ];

    const eventTitle = event?.title ?? event?.eventType ?? "Event";
    const eventDate = formatEventDate(event?.eventDate);

    if (customer?.email) {
        const email = buildQuoteApprovedEmail({
            recipientName: customer.fullName,
            counterpartName: vendor?.businessName,
            eventTitle,
            eventDate,
            amount: input.quote.amount,
            inclusions,
            roleLabel: "Customer",
        });
        await sendEmail({
            to: customer.email,
            subject: email.subject,
            text: email.text,
            html: email.html,
        });
    }

    if (vendorUser?.email) {
        const email = buildQuoteApprovedEmail({
            recipientName: vendorUser.fullName,
            counterpartName: customer?.fullName,
            eventTitle,
            eventDate,
            amount: input.quote.amount,
            inclusions,
            roleLabel: "Vendor",
        });
        await sendEmail({
            to: vendorUser.email,
            subject: email.subject,
            text: email.text,
            html: email.html,
        });
    }
}
