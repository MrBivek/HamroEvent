import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { ProtectedRoute } from "./ProtectedRoute";
import { useAuthStore } from "@/store/authStore.ts";

function renderProtectedRoute(initialPath = "/customer/dashboard") {
    return render(
        <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
                <Route path="/login" element={<div>Login Page</div>} />
                <Route path="/customer/dashboard" element={<div>Customer Dashboard</div>} />
                <Route path="/vendor/dashboard" element={<div>Vendor Dashboard</div>} />
                <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
                    <Route path="/customer/bookings" element={<div>Customer Bookings</div>} />
                </Route>
            </Routes>
        </MemoryRouter>
    );
}

describe("ProtectedRoute", () => {
    beforeEach(() => {
        useAuthStore.setState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false
        });
    });

    it("redirects unauthenticated users to login", async () => {
        renderProtectedRoute("/customer/bookings");
        expect(await screen.findByText("Login Page")).toBeInTheDocument();
    });

    it("renders the outlet when the user has an allowed role", async () => {
        useAuthStore.setState({
            user: {
                _id: "user-1",
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

        renderProtectedRoute("/customer/bookings");
        expect(await screen.findByText("Customer Bookings")).toBeInTheDocument();
    });

    it("redirects authenticated users to their own dashboard when the role is not allowed", async () => {
        useAuthStore.setState({
            user: {
                _id: "user-2",
                role: "vendor",
                name: "Vendor One",
                email: "vendor@example.com",
                isActive: true,
                status: "active",
                createdAt: "2026-01-01T00:00:00.000Z"
            },
            token: "token",
            isAuthenticated: true,
            isLoading: false
        });

        renderProtectedRoute("/customer/bookings");
        expect(await screen.findByText("Vendor Dashboard")).toBeInTheDocument();
    });
});
