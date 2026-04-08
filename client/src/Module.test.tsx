import LoginPage from "@/pages/auth/LoginPage";
import { useAuthStore } from "@/store/authStore.ts";
import AdminReports from "@/pages/admin/AdminReports";
import CustomerEvents from "@/pages/customer/CustomerEvents";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CustomerBookingDetail from "@/pages/customer/CustomerBookingDetail";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TwoFactorSettingsCard } from "@/components/account/TwoFactorSettingsCard";

const {
    toastMock,
    authServiceMock,
    accountServiceMock,
    eventsServiceMock,
    bookingsServiceMock,
    paymentsServiceMock,
    conversationsServiceMock,
    quotesServiceMock,
    reviewsServiceMock,
    reportsServiceMock,
    adminServiceMock,
} = vi.hoisted(() => ({
    toastMock: vi.fn(),
    authServiceMock: {
        postApiAuthLogin: vi.fn(),
        postApiAuthLogin2fa: vi.fn(),
    },
    accountServiceMock: {
        getApiAccountSecurity: vi.fn(),
        postApiAccount2faSetup: vi.fn(),
        postApiAccount2faEnable: vi.fn(),
        postApiAccount2faDisable: vi.fn(),
    },
    eventsServiceMock: {
        getApiEvents: vi.fn(),
        postApiEvents: vi.fn(),
        deleteApiEvents: vi.fn(),
    },
    bookingsServiceMock: {
        getApiBookings1: vi.fn(),
        patchApiBookingsCancel: vi.fn(),
    },
    paymentsServiceMock: {
        getApiPayments: vi.fn(),
        getApiRefundsCustomer: vi.fn(),
        postApiPayments: vi.fn(),
        postApiPaymentsConfirm: vi.fn(),
    },
    conversationsServiceMock: {
        postApiConversations: vi.fn(),
        postApiConversationsMessages: vi.fn(),
    },
    quotesServiceMock: {
        getApiQuotesBooking: vi.fn(),
        postApiBookingsQuote: vi.fn(),
    },
    reviewsServiceMock: {
        getApiReviewsBooking: vi.fn(),
        postApiReviews: vi.fn(),
    },
    reportsServiceMock: {
        postApiReports: vi.fn(),
    },
    adminServiceMock: {
        getApiAdminReports: vi.fn(),
        patchApiAdminReports: vi.fn(),
    },
}));

vi.mock("@/hooks/use-toast.ts", () => ({
    useToast: () => ({
        toast: toastMock,
    }),
}));

vi.mock("@/services/AuthService", () => ({
    AuthService: authServiceMock,
}));

vi.mock("@/services/AccountService", () => ({
    AccountService: accountServiceMock,
}));

vi.mock("@/services/EventsService", () => ({
    EventsService: eventsServiceMock,
}));

vi.mock("@/services/BookingsService", () => ({
    BookingsService: bookingsServiceMock,
}));

vi.mock("@/services/PaymentsService", () => ({
    PaymentsService: paymentsServiceMock,
}));

vi.mock("@/services/ConversationsService", () => ({
    ConversationsService: conversationsServiceMock,
}));

vi.mock("@/services/QuotesService", () => ({
    QuotesService: quotesServiceMock,
}));

vi.mock("@/services/ReviewsService", () => ({
    ReviewsService: reviewsServiceMock,
}));

vi.mock("@/services/ReportsService", () => ({
    ReportsService: reportsServiceMock,
}));

vi.mock("@/services/AdminService", () => ({
    AdminService: adminServiceMock,
}));

vi.mock("@/lib/socket.ts", () => ({
    getSocket: () => null,
}));

vi.mock("@/components/ui/dialog.tsx", () => ({
    Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    DialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/popover.tsx", () => ({
    Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/dropdown-menu.tsx", () => ({
    DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuItem: ({
        children,
        onClick,
        className,
    }: {
        children: React.ReactNode;
        onClick?: () => void;
        className?: string;
    }) => (
        <button type="button" onClick={onClick} className={className}>
            {children}
        </button>
    ),
}));

vi.mock("@/components/ui/calendar.tsx", () => ({
    Calendar: ({ onSelect }: { onSelect?: (date?: Date) => void }) => (
        <button type="button" onClick={() => onSelect?.(new Date("2026-10-22T00:00:00.000Z"))}>
            Pick test date
        </button>
    ),
}));

vi.mock("@/components/ui/select.tsx", async () => {
    const React = await import("react");

    const SelectValue = ({ placeholder }: { placeholder?: string }) =>
        React.createElement("mock-select-value", { placeholder });

    const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) =>
        React.createElement("mock-select-item", { value }, children);

    const collectItems = (children: React.ReactNode) => {
        const items: Array<{ value: string; label: string }> = [];
        let placeholder = "Select";

        const visit = (node: React.ReactNode) => {
            React.Children.forEach(node, (child) => {
                if (!React.isValidElement(child)) return;

                if (child.type === SelectValue) {
                    placeholder = child.props.placeholder || placeholder;
                    return;
                }

                if (child.type === SelectItem) {
                    items.push({
                        value: child.props.value,
                        label: typeof child.props.children === "string" ? child.props.children : child.props.value,
                    });
                    return;
                }

                if (child.props?.children) {
                    visit(child.props.children);
                }
            });
        };

        visit(children);
        return { items, placeholder };
    };

    return {
        Select: ({
            value,
            onValueChange,
            children,
        }: {
            value?: string;
            onValueChange?: (value: string) => void;
            children: React.ReactNode;
        }) => {
            const { items, placeholder } = collectItems(children);

            return (
                <div>
                    <select
                        aria-label={placeholder}
                        value={value ?? ""}
                        onChange={(event) => onValueChange?.(event.target.value)}
                    >
                        <option value="">{placeholder}</option>
                        {items.map((item) => (
                            <option key={item.value} value={item.value}>
                                {item.label}
                            </option>
                        ))}
                    </select>
                    {children}
                </div>
            );
        },
        SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
        SelectValue,
        SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
        SelectItem,
    };
});

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
    messages: [],
};

function renderLoginPage() {
    return render(
        <MemoryRouter initialEntries={["/login"]}>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/verify-otp" element={<div>OTP Verification Page</div>} />
                <Route path="/customer/dashboard" element={<div>Customer Dashboard</div>} />
                <Route path="/vendor/dashboard" element={<div>Vendor Dashboard</div>} />
                <Route path="/admin/dashboard" element={<div>Admin Dashboard</div>} />
            </Routes>
        </MemoryRouter>,
    );
}

function renderCustomerBookingDetail() {
    return render(
        <MemoryRouter initialEntries={["/customer/bookings/booking-1"]}>
            <Routes>
                <Route path="/customer/bookings/:id" element={<CustomerBookingDetail />} />
            </Routes>
        </MemoryRouter>,
    );
}

describe("FE Modules Unit Testing", () => {
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
                twoFactorEnabled: false,
                createdAt: "2026-01-01T00:00:00.000Z",
            },
            token: "token",
            isAuthenticated: true,
            isLoading: false,
        });

        eventsServiceMock.getApiEvents.mockResolvedValue({ items: [] });
        bookingsServiceMock.getApiBookings1.mockResolvedValue(baseBooking);
        conversationsServiceMock.postApiConversations.mockResolvedValue({ _id: "conversation-1" });
        quotesServiceMock.getApiQuotesBooking.mockResolvedValue(null);
        paymentsServiceMock.getApiPayments.mockResolvedValue({ items: [] });
        paymentsServiceMock.getApiRefundsCustomer.mockResolvedValue({ items: [] });
        reviewsServiceMock.getApiReviewsBooking.mockResolvedValue(null);
        accountServiceMock.getApiAccountSecurity.mockResolvedValue({
            email: "customer@example.com",
            twoFactorEnabled: false,
            hasPendingSetup: false,
        });
    });

    describe("Authentication Pages", () => {
        it("switches to the 2FA step when the API requires two-factor verification", async () => {
            authServiceMock.postApiAuthLogin.mockResolvedValue({
                requiresTwoFactor: true,
                tempToken: "temp-token",
                email: "customer@example.com",
            });

            renderLoginPage();

            fireEvent.change(screen.getByLabelText(/email/i), {
                target: { value: "customer@example.com" },
            });
            fireEvent.change(screen.getByLabelText(/^password$/i), {
                target: { value: "password123" },
            });
            fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

            expect(await screen.findByText(/two-factor verification/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/authenticator code/i)).toBeInTheDocument();
        });

        it("logs in directly and redirects to the correct dashboard when 2FA is not required", async () => {
            authServiceMock.postApiAuthLogin.mockResolvedValue({
                token: "access-token",
                user: {
                    _id: "user-1",
                    role: "customer",
                    name: "Customer One",
                    email: "customer@example.com",
                    isActive: true,
                    status: "active",
                    createdAt: "2026-01-01T00:00:00.000Z",
                },
            });

            renderLoginPage();

            fireEvent.change(screen.getByLabelText(/email/i), {
                target: { value: "customer@example.com" },
            });
            fireEvent.change(screen.getByLabelText(/^password$/i), {
                target: { value: "password123" },
            });
            fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

            expect(await screen.findByText("Customer Dashboard")).toBeInTheDocument();
            expect(useAuthStore.getState().token).toBe("access-token");
        });

        it("redirects to OTP verification when the account is not verified", async () => {
            authServiceMock.postApiAuthLogin.mockRejectedValue({
                body: { error: "Account not verified" },
            });

            renderLoginPage();

            fireEvent.change(screen.getByLabelText(/email/i), {
                target: { value: "pending@example.com" },
            });
            fireEvent.change(screen.getByLabelText(/^password$/i), {
                target: { value: "password123" },
            });
            fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

            expect(await screen.findByText("OTP Verification Page")).toBeInTheDocument();
        });

        it("completes the 2FA sign-in flow and redirects to the dashboard", async () => {
            authServiceMock.postApiAuthLogin.mockResolvedValue({
                requiresTwoFactor: true,
                tempToken: "temp-token",
                email: "customer@example.com",
            });
            authServiceMock.postApiAuthLogin2fa.mockResolvedValue({
                token: "2fa-access-token",
                user: {
                    _id: "user-1",
                    role: "customer",
                    name: "Customer One",
                    email: "customer@example.com",
                    isActive: true,
                    status: "active",
                    createdAt: "2026-01-01T00:00:00.000Z",
                },
            });

            renderLoginPage();

            fireEvent.change(screen.getByLabelText(/email/i), {
                target: { value: "customer@example.com" },
            });
            fireEvent.change(screen.getByLabelText(/^password$/i), {
                target: { value: "password123" },
            });
            fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

            expect(await screen.findByText(/two-factor verification/i)).toBeInTheDocument();
            fireEvent.change(screen.getByLabelText(/authenticator code/i), {
                target: { value: "123456" },
            });
            fireEvent.click(screen.getByRole("button", { name: /complete sign in/i }));

            await waitFor(() => {
                expect(authServiceMock.postApiAuthLogin2fa).toHaveBeenCalledWith({
                    requestBody: {
                        tempToken: "temp-token",
                        code: "123456",
                    },
                });
            });
            expect(await screen.findByText("Customer Dashboard")).toBeInTheDocument();
        });
    });

    describe("Account Security Pages", () => {
        it("starts setup and enables 2FA after verifying the authenticator code", async () => {
            accountServiceMock.postApiAccount2faSetup.mockResolvedValue({
                qrCodeDataUrl: "data:image/png;base64,abc",
                manualEntryKey: "SECRETKEY",
                email: "customer@example.com",
            });
            accountServiceMock.postApiAccount2faEnable.mockResolvedValue({
                twoFactorEnabled: true,
                user: { twoFactorEnabled: true },
            });

            render(<TwoFactorSettingsCard />);

            expect(await screen.findByText(/two-factor authentication/i)).toBeInTheDocument();
            fireEvent.click(screen.getByRole("button", { name: /enable 2fa/i }));
            expect(await screen.findByText(/manual key/i)).toBeInTheDocument();

            fireEvent.change(screen.getByLabelText(/authenticator code/i), {
                target: { value: "123456" },
            });
            fireEvent.click(screen.getByRole("button", { name: /verify and enable/i }));

            await waitFor(() => {
                expect(accountServiceMock.postApiAccount2faEnable).toHaveBeenCalledWith({
                    requestBody: { code: "123456" },
                });
            });
            expect(useAuthStore.getState().user?.twoFactorEnabled).toBe(true);
        });

        it("disables 2FA with a valid authenticator code", async () => {
            useAuthStore.setState({
                user: {
                    _id: "user-1",
                    role: "customer",
                    name: "Customer One",
                    email: "customer@example.com",
                    isActive: true,
                    status: "active",
                    twoFactorEnabled: true,
                    createdAt: "2026-01-01T00:00:00.000Z",
                },
                token: "token",
                isAuthenticated: true,
                isLoading: false,
            });
            accountServiceMock.getApiAccountSecurity.mockResolvedValue({
                email: "customer@example.com",
                twoFactorEnabled: true,
                hasPendingSetup: false,
            });
            accountServiceMock.postApiAccount2faDisable.mockResolvedValue({
                twoFactorEnabled: false,
                user: { twoFactorEnabled: false },
            });

            render(<TwoFactorSettingsCard />);

            expect(await screen.findByText(/two-factor authentication is active/i)).toBeInTheDocument();
            fireEvent.change(screen.getByLabelText(/authenticator code/i), {
                target: { value: "654321" },
            });
            fireEvent.click(screen.getByRole("button", { name: /disable 2fa/i }));

            await waitFor(() => {
                expect(accountServiceMock.postApiAccount2faDisable).toHaveBeenCalledWith({
                    requestBody: { code: "654321" },
                });
            });
            expect(useAuthStore.getState().user?.twoFactorEnabled).toBe(false);
        });
    });

    describe("Customer Event Pages", () => {
        it("creates an event with the selected date and time range", async () => {
            eventsServiceMock.postApiEvents.mockResolvedValue({
                _id: "event-1",
                title: "Wedding Celebration",
                eventType: "Wedding",
                date: "2026-10-22T00:00:00.000Z",
                startTime: "10:00",
                endTime: "16:00",
                location: "Kathmandu",
                budget: 200000,
                createdAt: "2026-01-01T00:00:00.000Z",
                vendorCount: 0,
            });

            render(
                <MemoryRouter>
                    <CustomerEvents />
                </MemoryRouter>,
            );

            await screen.findByText(/my events/i);

            fireEvent.change(screen.getByLabelText(/event title/i), {
                target: { value: "Wedding Celebration" },
            });
            fireEvent.change(screen.getByLabelText(/event type/i), {
                target: { value: "Wedding" },
            });
            fireEvent.change(screen.getByLabelText(/location/i), {
                target: { value: "Kathmandu" },
            });
            fireEvent.change(screen.getByLabelText(/budget/i), {
                target: { value: "200000" },
            });
            fireEvent.click(screen.getByRole("button", { name: /pick test date/i }));
            fireEvent.change(screen.getByLabelText(/select start time/i), {
                target: { value: "10:00" },
            });
            fireEvent.change(screen.getByLabelText(/select end time/i), {
                target: { value: "16:00" },
            });
            fireEvent.submit(screen.getByLabelText(/event title/i).closest("form")!);

            await waitFor(() => {
                expect(eventsServiceMock.postApiEvents).toHaveBeenCalledWith({
                    requestBody: {
                        title: "Wedding Celebration",
                        eventType: "Wedding",
                        date: "2026-10-22",
                        startTime: "10:00",
                        endTime: "16:00",
                        location: "Kathmandu",
                        notes: "",
                        budget: 200000,
                    },
                });
            });
        });

        it("loads and shows an empty state when there are no events", async () => {
            eventsServiceMock.getApiEvents.mockResolvedValue({ items: [] });

            render(
                <MemoryRouter>
                    <CustomerEvents />
                </MemoryRouter>,
            );

            expect(await screen.findByText(/no events yet/i)).toBeInTheDocument();
        });

        it("deletes an existing event from the events list", async () => {
            eventsServiceMock.getApiEvents.mockResolvedValue({
                items: [
                    {
                        _id: "event-1",
                        title: "Wedding Celebration",
                        eventType: "Wedding",
                        date: "2026-10-22T00:00:00.000Z",
                        location: "Kathmandu",
                        budget: 200000,
                        createdAt: "2026-01-01T00:00:00.000Z",
                        vendorCount: 1,
                    },
                ],
            });
            eventsServiceMock.deleteApiEvents.mockResolvedValue({ ok: true });

            render(
                <MemoryRouter>
                    <CustomerEvents />
                </MemoryRouter>,
            );

            expect(await screen.findByText("Wedding Celebration")).toBeInTheDocument();
            fireEvent.click(screen.getByRole("button", { name: /delete/i }));

            await waitFor(() => {
                expect(eventsServiceMock.deleteApiEvents).toHaveBeenCalledWith({ id: "event-1" });
            });
        });
    });

    describe("Customer Booking Detail Page", () => {
        it("submits a proposal with selected and custom inclusions", async () => {
            quotesServiceMock.postApiBookingsQuote.mockResolvedValue({
                _id: "quote-1",
                bookingId: "booking-1",
                amount: 45000,
                message: "Let us cover ceremony and reception",
                status: "pending",
                packageInclusions: ["Photography"],
                customInclusions: ["Drone shot"],
            });

            renderCustomerBookingDetail();

            expect(await screen.findByText(/quote & requirements/i)).toBeInTheDocument();

            fireEvent.change(screen.getByPlaceholderText(/enter price/i), {
                target: { value: "45000" },
            });
            fireEvent.change(screen.getByPlaceholderText(/add details or preferences/i), {
                target: { value: "Let us cover ceremony and reception" },
            });
            fireEvent.click(screen.getByText("Videography"));
            fireEvent.change(screen.getByPlaceholderText(/add extra requirement/i), {
                target: { value: "Drone shot" },
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
                        customInclusions: ["Drone shot"],
                    },
                });
            });
        });

        it("sends a chat message through the conversation service", async () => {
            conversationsServiceMock.postApiConversationsMessages.mockResolvedValue({
                _id: "message-1",
                conversationId: "conversation-1",
                senderId: "customer-1",
                text: "Can we discuss the timeline?",
                createdAt: "2026-01-01T00:00:00.000Z",
            });

            renderCustomerBookingDetail();

            expect(await screen.findByText(/messages/i)).toBeInTheDocument();

            const messageInput = screen.getByPlaceholderText(/type a message/i);
            fireEvent.change(messageInput, {
                target: { value: "Can we discuss the timeline?" },
            });
            fireEvent.submit(messageInput.closest("form")!);

            await waitFor(() => {
                expect(conversationsServiceMock.postApiConversationsMessages).toHaveBeenCalledWith({
                    id: "conversation-1",
                    requestBody: { text: "Can we discuss the timeline?" },
                });
            });
        });

        it("initiates a payment for an accepted booking", async () => {
            const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);
            bookingsServiceMock.getApiBookings1.mockResolvedValue({
                ...baseBooking,
                status: "accepted",
                price: 45000,
            });
            quotesServiceMock.getApiQuotesBooking.mockResolvedValue({
                _id: "quote-1",
                bookingId: "booking-1",
                amount: 45000,
                message: "Proposal",
                status: "pending",
                packageInclusions: ["Photography"],
                customInclusions: [],
            });
            paymentsServiceMock.postApiPayments.mockResolvedValue({
                paymentId: "payment-1",
                payUrl: "https://example.com/pay",
            });

            renderCustomerBookingDetail();

            expect(await screen.findByRole("heading", { name: /payments/i })).toBeInTheDocument();
            fireEvent.change(screen.getByPlaceholderText(/enter amount/i), {
                target: { value: "20000" },
            });
            fireEvent.click(screen.getByRole("button", { name: /pay now/i }));

            await waitFor(() => {
                expect(paymentsServiceMock.postApiPayments).toHaveBeenCalledWith({
                    requestBody: {
                        bookingId: "booking-1",
                        amount: 20000,
                        provider: "KHALTI",
                    },
                });
            });
            expect(windowOpenSpy).toHaveBeenCalledWith("https://example.com/pay", "_blank");
            windowOpenSpy.mockRestore();
        });

        it("confirms a payment after initiation", async () => {
            bookingsServiceMock.getApiBookings1.mockResolvedValue({
                ...baseBooking,
                status: "accepted",
                price: 45000,
            });
            quotesServiceMock.getApiQuotesBooking.mockResolvedValue({
                _id: "quote-1",
                bookingId: "booking-1",
                amount: 45000,
                message: "Proposal",
                status: "pending",
                packageInclusions: ["Photography"],
                customInclusions: [],
            });
            paymentsServiceMock.postApiPayments.mockResolvedValue({
                paymentId: "payment-1",
                payUrl: "https://example.com/pay",
            });
            paymentsServiceMock.postApiPaymentsConfirm.mockResolvedValue({ status: "PAID" });
            paymentsServiceMock.getApiPayments.mockResolvedValue({
                items: [
                    {
                        _id: "payment-1",
                        amount: 20000,
                        provider: "KHALTI",
                        status: "PAID",
                        createdAt: "2026-01-01T00:00:00.000Z",
                    },
                ],
            });

            const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);
            renderCustomerBookingDetail();

            expect(await screen.findByRole("heading", { name: /payments/i })).toBeInTheDocument();
            fireEvent.change(screen.getByPlaceholderText(/enter amount/i), {
                target: { value: "20000" },
            });
            fireEvent.click(screen.getByRole("button", { name: /pay now/i }));
            await waitFor(() => expect(paymentsServiceMock.postApiPayments).toHaveBeenCalled());

            fireEvent.click(screen.getByRole("button", { name: /confirm payment/i }));

            await waitFor(() => {
                expect(paymentsServiceMock.postApiPaymentsConfirm).toHaveBeenCalledWith({ id: "payment-1" });
            });
            windowOpenSpy.mockRestore();
        });

        it("submits a review after a completed booking", async () => {
            bookingsServiceMock.getApiBookings1.mockResolvedValue({
                ...baseBooking,
                status: "completed",
                price: 45000,
            });
            reviewsServiceMock.postApiReviews.mockResolvedValue({
                _id: "review-1",
                bookingId: "booking-1",
                rating: 5,
                comment: "Excellent work",
                createdAt: "2026-04-01T00:00:00.000Z",
            });

            renderCustomerBookingDetail();

            expect(await screen.findByText(/review & report/i)).toBeInTheDocument();
            fireEvent.click(screen.getByLabelText(/5 star/i));
            fireEvent.change(screen.getByPlaceholderText(/leave a short review/i), {
                target: { value: "Excellent work" },
            });
            fireEvent.click(screen.getByRole("button", { name: /submit review/i }));

            await waitFor(() => {
                expect(reviewsServiceMock.postApiReviews).toHaveBeenCalledWith({
                    requestBody: {
                        bookingId: "booking-1",
                        rating: 5,
                        comment: "Excellent work",
                    },
                });
            });
        });

        it("submits a vendor report from the booking detail page", async () => {
            bookingsServiceMock.getApiBookings1.mockResolvedValue({
                ...baseBooking,
                status: "completed",
            });
            reportsServiceMock.postApiReports.mockResolvedValue({
                _id: "report-1",
            });

            renderCustomerBookingDetail();

            expect(await screen.findByText(/review & report/i)).toBeInTheDocument();
            fireEvent.change(screen.getByPlaceholderText(/describe the issue/i), {
                target: { value: "The vendor was abusive." },
            });
            fireEvent.click(screen.getByRole("button", { name: /report vendor/i }));

            await waitFor(() => {
                expect(reportsServiceMock.postApiReports).toHaveBeenCalledWith({
                    requestBody: {
                        targetType: "vendor",
                        targetId: "vendor-1",
                        reason: "The vendor was abusive.",
                    },
                });
            });
        });

        it("cancels a pending booking from the detail page", async () => {
            bookingsServiceMock.patchApiBookingsCancel.mockResolvedValue({
                ...baseBooking,
                status: "cancelled",
            });

            renderCustomerBookingDetail();

            expect(await screen.findByRole("button", { name: /cancel booking/i })).toBeInTheDocument();
            fireEvent.click(screen.getByRole("button", { name: /cancel booking/i }));

            await waitFor(() => {
                expect(bookingsServiceMock.patchApiBookingsCancel).toHaveBeenCalledWith({
                    id: "booking-1",
                    requestBody: { reason: "Cancelled by customer" },
                });
            });
        });
    });

    describe("Admin Reports Page", () => {
        it("loads user-submitted reports and shows report metadata", async () => {
            useAuthStore.setState({
                user: {
                    _id: "admin-1",
                    role: "admin",
                    name: "Admin User",
                    email: "admin@example.com",
                    isActive: true,
                    status: "active",
                    createdAt: "2026-01-01T00:00:00.000Z",
                },
                token: "admin-token",
                isAuthenticated: true,
                isLoading: false,
            });

            adminServiceMock.getApiAdminReports.mockResolvedValue({
                items: [
                    {
                        _id: "report-1",
                        targetType: "vendor",
                        targetId: "vendor-1",
                        targetName: "Vendor Studio",
                        reporterName: "Customer One",
                        reason: "Abusive message",
                        status: "OPEN",
                        createdAt: "2026-04-01T10:00:00.000Z",
                    },
                ],
            });

            render(
                <MemoryRouter>
                    <AdminReports />
                </MemoryRouter>,
            );

            expect(await screen.findByText(/user reports/i)).toBeInTheDocument();
            expect(screen.getByText("Vendor Studio")).toBeInTheDocument();
            expect(screen.getByText(/abusive message/i)).toBeInTheDocument();
            expect(adminServiceMock.getApiAdminReports).toHaveBeenCalledWith({
                status: undefined,
                page: 1,
                limit: 50,
            });
        });

        it("updates the report status from the admin review screen", async () => {
            useAuthStore.setState({
                user: {
                    _id: "admin-1",
                    role: "admin",
                    name: "Admin User",
                    email: "admin@example.com",
                    isActive: true,
                    status: "active",
                    createdAt: "2026-01-01T00:00:00.000Z",
                },
                token: "admin-token",
                isAuthenticated: true,
                isLoading: false,
            });

            adminServiceMock.getApiAdminReports.mockResolvedValue({
                items: [
                    {
                        _id: "report-1",
                        targetType: "vendor",
                        targetId: "vendor-1",
                        targetName: "Vendor Studio",
                        reporterName: "Customer One",
                        reason: "Abusive message",
                        status: "OPEN",
                        createdAt: "2026-04-01T10:00:00.000Z",
                    },
                ],
            });
            adminServiceMock.patchApiAdminReports.mockResolvedValue({
                _id: "report-1",
                targetType: "vendor",
                targetId: "vendor-1",
                reason: "Abusive message",
                status: "RESOLVED",
                updatedAt: "2026-04-02T12:00:00.000Z",
            });

            render(
                <MemoryRouter>
                    <AdminReports />
                </MemoryRouter>,
            );

            expect(await screen.findByText("Vendor Studio")).toBeInTheDocument();
            fireEvent.click(screen.getByRole("button", { name: /resolve/i }));

            await waitFor(() => {
                expect(adminServiceMock.patchApiAdminReports).toHaveBeenCalledWith({
                    id: "report-1",
                    requestBody: { status: "RESOLVED" },
                });
            });
            expect(toastMock).toHaveBeenCalled();
        });

        it("filters reports by status from the admin screen", async () => {
            adminServiceMock.getApiAdminReports.mockResolvedValue({ items: [] });

            render(
                <MemoryRouter>
                    <AdminReports />
                </MemoryRouter>,
            );

            expect(await screen.findByText(/user reports/i)).toBeInTheDocument();
            fireEvent.change(screen.getByLabelText(/filter reports/i), {
                target: { value: "OPEN" },
            });

            await waitFor(() => {
                expect(adminServiceMock.getApiAdminReports).toHaveBeenLastCalledWith({
                    status: "OPEN",
                    page: 1,
                    limit: 50,
                });
            });
        });

        it("shows an empty state when no reports are returned", async () => {
            adminServiceMock.getApiAdminReports.mockResolvedValue({ items: [] });

            render(
                <MemoryRouter>
                    <AdminReports />
                </MemoryRouter>,
            );

            expect(await screen.findByText(/no reports found/i)).toBeInTheDocument();
        });

        it("marks a report as reviewed from the admin screen", async () => {
            useAuthStore.setState({
                user: {
                    _id: "admin-1",
                    role: "admin",
                    name: "Admin User",
                    email: "admin@example.com",
                    isActive: true,
                    status: "active",
                    createdAt: "2026-01-01T00:00:00.000Z",
                },
                token: "admin-token",
                isAuthenticated: true,
                isLoading: false,
            });

            adminServiceMock.getApiAdminReports.mockResolvedValue({
                items: [
                    {
                        _id: "report-1",
                        targetType: "vendor",
                        targetId: "vendor-1",
                        targetName: "Vendor Studio",
                        reporterName: "Customer One",
                        reason: "Abusive message",
                        status: "OPEN",
                        createdAt: "2026-04-01T10:00:00.000Z",
                    },
                ],
            });
            adminServiceMock.patchApiAdminReports.mockResolvedValue({
                _id: "report-1",
                targetType: "vendor",
                targetId: "vendor-1",
                reason: "Abusive message",
                status: "REVIEWED",
                updatedAt: "2026-04-02T12:00:00.000Z",
            });

            render(
                <MemoryRouter>
                    <AdminReports />
                </MemoryRouter>,
            );

            expect(await screen.findByText("Vendor Studio")).toBeInTheDocument();
            fireEvent.click(screen.getByRole("button", { name: /mark reviewed/i }));

            await waitFor(() => {
                expect(adminServiceMock.patchApiAdminReports).toHaveBeenCalledWith({
                    id: "report-1",
                    requestBody: { status: "REVIEWED" },
                });
            });
        });
    });
});
