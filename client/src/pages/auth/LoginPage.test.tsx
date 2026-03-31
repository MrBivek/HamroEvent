import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./LoginPage";
import { useAuthStore } from "@/store/authStore.ts";

const { toastMock, authServiceMock } = vi.hoisted(() => ({
    toastMock: vi.fn(),
    authServiceMock: {
        postApiAuthLogin: vi.fn(),
        postApiAuthLogin2fa: vi.fn(),
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

describe("LoginPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useAuthStore.setState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
        });
    });

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
        expect(toastMock).toHaveBeenCalled();
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
        expect(useAuthStore.getState().user?.email).toBe("customer@example.com");
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
        await waitFor(() => {
            expect(toastMock).toHaveBeenCalled();
        });
    });
});
