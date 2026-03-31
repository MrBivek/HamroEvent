import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcrypt";
import { verifySync } from "otplib";
import { UserRole, UserStatus } from "../../common/enums.js";

const userModelMock = {
    findOne: vi.fn(),
    findById: vi.fn(),
};

vi.mock("./user.model.js", () => ({
    UserModel: userModelMock,
}));

vi.mock("bcrypt", () => ({
    default: {
        compare: vi.fn(),
        hash: vi.fn(),
    },
}));

vi.mock("otplib", () => ({
    verifySync: vi.fn(),
}));

vi.mock("../../configurations/env.js", () => ({
    env: {
        JWT_SECRET: "unit-test-secret",
        JWT_EXPIRES_IN: "1h",
        OTP_CODE_LENGTH: 6,
        OTP_EXPIRES_MINUTES: 10,
    },
}));

const { login, loginTwoFactor } = await import("./auth.service.js");

describe("auth.service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns a temporary 2FA challenge for users with 2FA enabled", async () => {
        userModelMock.findOne.mockResolvedValue({
            _id: { toString: () => "user-1" },
            role: UserRole.CUSTOMER,
            email: "customer@example.com",
            passwordHash: "hashed-password",
            status: UserStatus.ACTIVE,
            twoFactorEnabled: true,
            twoFactorSecret: "SECRET",
        });
        vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

        const result = await login({
            email: "customer@example.com",
            password: "password123",
        });

        expect(result.requiresTwoFactor).toBe(true);
        expect(result.email).toBe("customer@example.com");
        expect(typeof result.tempToken).toBe("string");
        expect(result.token).toBeUndefined();
    });

    it("completes login after validating the 2FA code", async () => {
        const save = vi.fn().mockResolvedValue(undefined);
        const token = jwt.sign(
            { sub: "507f1f77bcf86cd799439011", role: UserRole.VENDOR, purpose: "2fa-login" },
            "unit-test-secret",
            { expiresIn: "10m" },
        );

        userModelMock.findById.mockResolvedValue({
            _id: { toString: () => "507f1f77bcf86cd799439011" },
            fullName: "Vendor User",
            email: "vendor@example.com",
            phone: "9800000000",
            role: UserRole.VENDOR,
            status: UserStatus.ACTIVE,
            twoFactorEnabled: true,
            twoFactorSecret: "SECRET",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            save,
        });
        vi.mocked(verifySync).mockReturnValue({ valid: true } as never);

        const result = await loginTwoFactor({
            tempToken: token,
            code: "123456",
        });

        expect(typeof result.token).toBe("string");
        expect(result.user).toMatchObject({
            email: "vendor@example.com",
            role: "vendor",
            twoFactorEnabled: true,
        });
        expect(save).toHaveBeenCalledTimes(1);
        expect(verifySync).toHaveBeenCalledWith({
            secret: "SECRET",
            token: "123456",
        });
    });
});
