import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CustomerBookingDetail from "./CustomerBookingDetail";
import { useAuthStore } from "@/store/authStore.ts";

const {
    toastMock,
    bookingsServiceMock,
    paymentsServiceMock,
    conversationsServiceMock,
    quotesServiceMock,
    reviewsServiceMock,
    reportsServiceMock
} = vi.hoisted(() => ({
    toastMock: vi.fn(),
    bookingsServiceMock: {
        getApiBookings1: vi.fn(),
        patchApiBookingsCancel: vi.fn()
    },
    paymentsServiceMock: {
        getApiPayments: vi.fn(),
        getApiRefundsCustomer: vi.fn(),
        postApiPayments: vi.fn(),
        postApiPaymentsConfirm: vi.fn()
    },
    conversationsServiceMock: {
        postApiConversations: vi.fn(),
        postApiConversationsMessages: vi.fn()
    },
    quotesServiceMock: {
        getApiQuotesBooking: vi.fn(),
        postApiBookingsQuote: vi.fn()
    },
    reviewsServiceMock: {
        getApiReviewsBooking: vi.fn(),
        postApiReviews: vi.fn()
    },
    reportsServiceMock: {
        postApiReports: vi.fn()
    }
}));

vi.mock("@/hooks/use-toast.ts", () => ({
    useToast: () => ({
        toast: toastMock
    })
}));

vi.mock("@/services/BookingsService", () => ({
    BookingsService: bookingsServiceMock
}));

vi.mock("@/services/PaymentsService", () => ({
    PaymentsService: paymentsServiceMock
}));

vi.mock("@/services/ConversationsService", () => ({
    ConversationsService: conversationsServiceMock
}));

vi.mock("@/services/QuotesService", () => ({
    QuotesService: quotesServiceMock
}));

vi.mock("@/services/ReviewsService", () => ({
    ReviewsService: reviewsServiceMock
}));

vi.mock("@/services/ReportsService", () => ({
    ReportsService: reportsServiceMock
}));

vi.mock("@/lib/socket.ts", () => ({
    getSocket: () => null
}));

const baseBooking = {
    _id: "booking-1",
    customerId: "customer-1",
    vendorId: "vendor-1",
    eventId: "event-1",
    packageId: "package-1",
    eventType: "Wedding",
    eventTitle: "Wedding Celebration",
    date: "2026-10-22T00:00:00.000Z",
    timeRange: { start: "10:00", end: "16:00" },
    location: "Kathmandu",
    status: "pending",
    history: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    vendorName: "Vendor Studio",
    vendorImage: "",
    category: "Photography",
    vendorPhone: "9800000000",
    vendorEmail: "vendor@example.com",
    packageName: "Premium Package",
    price: 0,
    packageInclusions: ["Photography", "Videography"],
    messages: []
};

function renderPage() {
    return render(
        <MemoryRouter initialEntries={["/customer/bookings/booking-1"]}>
            <Routes>
                <Route path="/customer/bookings/:id" element={<CustomerBookingDetail />} />
            </Routes>
        </MemoryRouter>
    );
}

describe("CustomerBookingDetail", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useAuthStore.setState({
            user: {
                _id: "customer-1",
                role: "customer",
                name: "Customer One",
                email: "customer@example.com",
                isActive: true,
                status: "active",
                createdAt: "2026-01-01T00:00:00.000Z"
            },
            token: "token",
            isAuthenticated: true,
            isLoading: false
        });

        bookingsServiceMock.getApiBookings1.mockResolvedValue(baseBooking);
        conversationsServiceMock.postApiConversations.mockResolvedValue({ _id: "conversation-1" });
        quotesServiceMock.getApiQuotesBooking.mockResolvedValue(null);
        paymentsServiceMock.getApiPayments.mockResolvedValue({ items: [] });
        paymentsServiceMock.getApiRefundsCustomer.mockResolvedValue({ items: [] });
        reviewsServiceMock.getApiReviewsBooking.mockResolvedValue(null);
    });

    it("submits a proposal with selected and custom inclusions", async () => {
        quotesServiceMock.postApiBookingsQuote.mockResolvedValue({
            _id: "quote-1",
            bookingId: "booking-1",
            amount: 45000,
            message: "Let us cover ceremony and reception",
            status: "pending",
            packageInclusions: ["Photography"],
            customInclusions: ["Drone shot"]
        });

        renderPage();

        expect(await screen.findByText(/quote & requirements/i)).toBeInTheDocument();

        fireEvent.change(screen.getByPlaceholderText(/enter price/i), {
            target: { value: "45000" }
        });
        fireEvent.change(screen.getByPlaceholderText(/add details or preferences/i), {
            target: { value: "Let us cover ceremony and reception" }
        });
        fireEvent.click(screen.getByText("Videography"));
        fireEvent.change(screen.getByPlaceholderText(/add extra requirement/i), {
            target: { value: "Drone shot" }
        });
        fireEvent.click(screen.getByRole("button", { name: /^add$/i }));
        fireEvent.click(screen.getByRole("button", { name: /send proposal/i }));

        await waitFor(() => {
            expect(quotesServiceMock.postApiBookingsQuote).toHaveBeenCalledWith({
                id: "booking-1",
                requestBody: {
                    amount: 45000,
                    message: "Let us cover ceremony and reception",
                    packageInclusions: ["Photography"],
                    customInclusions: ["Drone shot"]
                }
            });
        });
    });

    it("sends a chat message through the conversation service", async () => {
        conversationsServiceMock.postApiConversationsMessages.mockResolvedValue({
            _id: "message-1",
            conversationId: "conversation-1",
            senderId: "customer-1",
            text: "Can we discuss the timeline?",
            createdAt: "2026-01-01T00:00:00.000Z"
        });

        renderPage();

        expect(await screen.findByText(/messages/i)).toBeInTheDocument();

        const messageInput = screen.getByPlaceholderText(/type a message/i);
        fireEvent.change(messageInput, {
            target: { value: "Can we discuss the timeline?" }
        });
        fireEvent.submit(messageInput.closest("form")!);

        await waitFor(() => {
            expect(conversationsServiceMock.postApiConversationsMessages).toHaveBeenCalledWith({
                id: "conversation-1",
                requestBody: { text: "Can we discuss the timeline?" }
            });
        });
    });
});
