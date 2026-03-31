import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TwoFactorSettingsCard } from "./TwoFactorSettingsCard";
import { useAuthStore } from "@/store/authStore.ts";

const { toastMock, accountServiceMock } = vi.hoisted(() => ({
    toastMock: vi.fn(),
    accountServiceMock: {
        getApiAccountSecurity: vi.fn(),
        postApiAccount2faSetup: vi.fn(),
        postApiAccount2faEnable: vi.fn(),
        postApiAccount2faDisable: vi.fn(),
    },
}));

vi.mock("@/hooks/use-toast.ts", () => ({
    useToast: () => ({
        toast: toastMock,
    }),
}));

vi.mock("@/services/AccountService", () => ({
    AccountService: accountServiceMock,
}));

describe("TwoFactorSettingsCard", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useAuthStore.setState({
            user: {
                _id: "user-1",
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
    });

    it("starts setup and enables 2FA after verifying the authenticator code", async () => {
        accountServiceMock.getApiAccountSecurity.mockResolvedValue({
            email: "customer@example.com",
            twoFactorEnabled: false,
            hasPendingSetup: false,
        });
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
