import {
    LoginSchema,
    RegisterVendorSchema,
    RegisterCustomerSchema,
    RequestOtpSchema,
    VerifyOtpSchema,
    LoginTwoFactorSchema,
    RequestPasswordResetSchema,
    VerifyPasswordResetOtpSchema,
    ResetPasswordSchema,
} from "./auth.schemas.js";
import { Router } from "express";
import * as controller from "./auth.controller.js";
import { validateBody } from "../../middlewares/validate.js";

export const authRoutes = Router();

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Authentication and registration
 */

/**
 * @openapi
 * /api/auth/register/customer:
 *   post:
 *     tags: [Auth]
 *     summary: Register a customer account (OTP verification required)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, email, password]
 *             properties:
 *               fullName: { type: string, example: "Customer One" }
 *               name: { type: string, example: "Customer One" }
 *               email: { type: string, example: "customer1@test.com" }
 *               phone: { type: string, example: "+9779800000000" }
 *               password: { type: string, example: "123456" }
 *               acceptTerms: { type: boolean, example: true }
 *     responses:
 *       201:
 *         description: Customer created (status pending, OTP sent)
 *       400:
 *         description: Validation error / duplicate email
 */
authRoutes.post(
    "/register/customer",
    validateBody(RegisterCustomerSchema),
    controller.registerCustomer,
);

/**
 * @openapi
 * /api/auth/register/vendor:
 *   post:
 *     tags: [Auth]
 *     summary: Register a vendor account (creates user + vendor profile + optional packages)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [account, business]
 *             properties:
 *               account:
 *                 type: object
 *                 required: [fullName, email, password]
 *                 properties:
 *                   fullName: { type: string, example: "Vendor One" }
 *                   name: { type: string, example: "Vendor One" }
 *                   email: { type: string, example: "vendor1@test.com" }
 *                   phone: { type: string, example: "+9779811111111" }
 *                   password: { type: string, example: "123456" }
 *                   acceptTerms: { type: boolean, example: true }
 *               business:
 *                 type: object
 *                 required: [businessName]
 *                 properties:
 *                   businessName: { type: string, example: "Vendor One Studio" }
 *                   categoryId: { type: string, example: "65a000000000000000000001" }
 *                   category: { type: string, example: "photography" }
 *                   description: { type: string, example: "Photo + video services" }
 *                   primaryLocationId: { type: string, example: "65a000000000000000000002" }
 *                   location: { type: string, example: "Kathmandu" }
 *                   serviceAreas:
 *                     type: array
 *                     items: { type: string }
 *                     example: ["Kathmandu", "Lalitpur"]
 *                   website: { type: string, example: "https://vendor.com" }
 *                   instagram: { type: string, example: "@vendorone" }
 *                   facebook: { type: string, example: "vendoronepage" }
 *               packages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [title]
 *                   properties:
 *                     title: { type: string, example: "Basic Package" }
 *                     name: { type: string, example: "Basic Package" }
 *                     description: { type: string, example: "Great for small events" }
 *                     priceMin: { type: number, example: 25000 }
 *                     priceMax: { type: number, example: 50000 }
 *                     includes:
 *                       type: array
 *                       items: { type: string }
 *                       example: ["4 hours coverage"]
 *                     inclusions:
 *                       type: array
 *                       items: { type: string }
 *               portfolioMedia:
 *                 type: array
 *                 items: { type: string }
 *               verificationDocuments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [data]
 *                   properties:
 *                     data: { type: string, description: "Base64 or data URL" }
 *                     filename: { type: string }
 *                     name: { type: string }
 *                     mimeType: { type: string }
 *                     type: { type: string }
 *     responses:
 *       201:
 *         description: Vendor onboarding created
 *       400:
 *         description: Validation error / duplicate email
 */
authRoutes.post("/register/vendor", validateBody(RegisterVendorSchema), controller.registerVendor);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login (Customer/Vendor/Admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: "admin@event.local" }
 *               password: { type: string, example: "affinityismyidol" }
 *     responses:
 *       200:
 *         description: JWT token + user
 *       401:
 *         description: Invalid credentials
 */
authRoutes.post("/login", validateBody(LoginSchema), controller.login);

/**
 * @openapi
 * /api/auth/login/2fa:
 *   post:
 *     tags: [Auth]
 *     summary: Verify authenticator code after password login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tempToken, code]
 *             properties:
 *               tempToken: { type: string }
 *               code: { type: string, example: "123456" }
 *     responses:
 *       200:
 *         description: JWT token + user
 *       401:
 *         description: Invalid or expired 2FA challenge
 */
authRoutes.post("/login/2fa", validateBody(LoginTwoFactorSchema), controller.loginTwoFactor);

/**
 * @openapi
 * /api/auth/request-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Send OTP to verify email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, example: "customer1@test.com" }
 *     responses:
 *       200:
 *         description: OTP sent
 */
authRoutes.post("/request-otp", validateBody(RequestOtpSchema), controller.requestOtp);

/**
 * @openapi
 * /api/auth/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP and activate account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email: { type: string, example: "customer1@test.com" }
 *               otp: { type: string, example: "123456" }
 *     responses:
 *       200:
 *         description: Verified with JWT token + user
 *       400:
 *         description: Invalid or expired OTP
 */
authRoutes.post("/verify-otp", validateBody(VerifyOtpSchema), controller.verifyOtp);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Send OTP for password reset
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, example: "customer1@test.com" }
 *     responses:
 *       200:
 *         description: Reset OTP sent
 */
authRoutes.post(
    "/forgot-password",
    validateBody(RequestPasswordResetSchema),
    controller.requestPasswordReset,
);

/**
 * @openapi
 * /api/auth/verify-reset-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify password reset OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email: { type: string, example: "customer1@test.com" }
 *               otp: { type: string, example: "123456" }
 *     responses:
 *       200:
 *         description: OTP verified, reset token returned
 */
authRoutes.post(
    "/verify-reset-otp",
    validateBody(VerifyPasswordResetOtpSchema),
    controller.verifyPasswordResetOtp,
);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password after OTP verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, resetToken, newPassword]
 *             properties:
 *               email: { type: string, example: "customer1@test.com" }
 *               resetToken: { type: string }
 *               newPassword: { type: string, example: "newStrongPassword123" }
 *     responses:
 *       200:
 *         description: Password reset complete
 */
authRoutes.post("/reset-password", validateBody(ResetPasswordSchema), controller.resetPassword);
