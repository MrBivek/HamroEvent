import {
    LoginSchema,
    RegisterVendorSchema,
    RegisterCustomerSchema,
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
 *     summary: Register a customer account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, email, password]
 *             properties:
 *               fullName: { type: string, example: "Customer One" }
 *               email: { type: string, example: "customer1@test.com" }
 *               phone: { type: string, example: "+9779800000000" }
 *               password: { type: string, example: "123456" }
 *               acceptTerms: { type: boolean, example: true }
 *     responses:
 *       201:
 *         description: Customer created
 *       400:
 *         description: Validation error / duplicate email
 */
authRoutes.post(
    "/register/customer",
    validateBody(RegisterCustomerSchema),
    controller.registerCustomer
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
 *                   description: { type: string, example: "Photo + video services" }
 *                   primaryLocationId: { type: string, example: "65a000000000000000000002" }
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
 *                     description: { type: string, example: "Great for small events" }
 *                     priceMin: { type: number, example: 25000 }
 *                     priceMax: { type: number, example: 50000 }
 *                     includes:
 *                       type: array
 *                       items: { type: string }
 *                       example: ["4 hours coverage"]
 *     responses:
 *       201:
 *         description: Vendor onboarding created
 *       400:
 *         description: Validation error / duplicate email
 */
authRoutes.post(
    "/register/vendor",
    validateBody(RegisterVendorSchema),
    controller.registerVendor
);

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
 *               email: { type: string, example: "admin@evently.local" }
 *               password: { type: string, example: "Admin@123456" }
 *     responses:
 *       200:
 *         description: JWT token + user
 *       401:
 *         description: Invalid credentials
 */
authRoutes.post("/login", validateBody(LoginSchema), controller.login);
