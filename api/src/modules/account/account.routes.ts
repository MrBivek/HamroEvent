import { Router } from "express";
import QRCode from "qrcode";
import { generateSecret, generateURI, verifySync } from "otplib";
import { UserModel } from "../auth/user.model.js";
import { requireAuth } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { toUiUser } from "../../common/mappers.js";
import { TwoFactorCodeSchema } from "./account.schemas.js";

export const accountRoutes = Router();

/**
 * @openapi
 * /api/account/security:
 *   get:
 *     tags: [Account]
 *     summary: Get account security status
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
accountRoutes.get("/security", requireAuth, async (req, res, next) => {
    try {
        const user = await UserModel.findById(req.auth!.sub).lean();
        if (!user) throw new NotFoundError("User not found");

        res.json({
            email: user.email,
            twoFactorEnabled: Boolean(user.twoFactorEnabled),
            hasPendingSetup: Boolean(user.twoFactorTempSecret),
        });
    } catch (err) {
        next(err);
    }
});

/**
 * @openapi
 * /api/account/2fa/setup:
 *   post:
 *     tags: [Account]
 *     summary: Start 2FA setup and get QR code
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
accountRoutes.post("/2fa/setup", requireAuth, async (req, res, next) => {
    try {
        const user = await UserModel.findById(req.auth!.sub);
        if (!user) throw new NotFoundError("User not found");

        const secret = generateSecret();
        const otpauthUrl = generateURI({
            issuer: "Evently",
            label: user.email,
            secret,
        });
        const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

        user.twoFactorTempSecret = secret;
        await user.save();

        res.json({
            qrCodeDataUrl,
            manualEntryKey: secret,
            email: user.email,
        });
    } catch (err) {
        next(err);
    }
});

/**
 * @openapi
 * /api/account/2fa/enable:
 *   post:
 *     tags: [Account]
 *     summary: Verify authenticator code and enable 2FA
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string, example: "123456" }
 *     responses:
 *       200: { description: OK }
 */
accountRoutes.post(
    "/2fa/enable",
    requireAuth,
    validateBody(TwoFactorCodeSchema),
    async (req, res, next) => {
        try {
            const user = await UserModel.findById(req.auth!.sub);
            if (!user) throw new NotFoundError("User not found");
            if (!user.twoFactorTempSecret) {
                throw new BadRequestError("Start 2FA setup before enabling it");
            }

            const verification = verifySync({
                secret: user.twoFactorTempSecret,
                token: req.body.code,
            });
            if (!verification.valid) throw new BadRequestError("Invalid authenticator code");

            user.twoFactorSecret = user.twoFactorTempSecret;
            user.twoFactorTempSecret = undefined;
            user.twoFactorEnabled = true;
            await user.save();

            res.json({
                user: toUiUser(user),
                twoFactorEnabled: true,
            });
        } catch (err) {
            next(err);
        }
    },
);

/**
 * @openapi
 * /api/account/2fa/disable:
 *   post:
 *     tags: [Account]
 *     summary: Disable 2FA after verifying authenticator code
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string, example: "123456" }
 *     responses:
 *       200: { description: OK }
 */
accountRoutes.post(
    "/2fa/disable",
    requireAuth,
    validateBody(TwoFactorCodeSchema),
    async (req, res, next) => {
        try {
            const user = await UserModel.findById(req.auth!.sub);
            if (!user) throw new NotFoundError("User not found");
            if (!user.twoFactorEnabled || !user.twoFactorSecret) {
                throw new BadRequestError("2FA is not enabled");
            }

            const verification = verifySync({
                secret: user.twoFactorSecret,
                token: req.body.code,
            });
            if (!verification.valid) throw new BadRequestError("Invalid authenticator code");

            user.twoFactorEnabled = false;
            user.twoFactorSecret = undefined;
            user.twoFactorTempSecret = undefined;
            await user.save();

            res.json({
                user: toUiUser(user),
                twoFactorEnabled: false,
            });
        } catch (err) {
            next(err);
        }
    },
);
