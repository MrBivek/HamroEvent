import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { useAuthStore } from "@/store/authStore.ts";

afterEach(() => {
    cleanup();
});

beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
    });
});
