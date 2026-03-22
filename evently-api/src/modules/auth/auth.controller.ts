import * as service from "./auth.service.js";
import type { Request, Response } from "express";

export async function registerCustomer(req: Request, res: Response) {
    const result = await service.registerCustomer(req.body);
    res.status(201).json(result);
}

export async function registerVendor(req: Request, res: Response) {
    const result = await service.registerVendor(req.body);
    res.status(201).json(result);
}

export async function login(req: Request, res: Response) {
    const result = await service.login(req.body);
    res.json(result);
}

export async function loginTwoFactor(req: Request, res: Response) {
    const result = await service.loginTwoFactor(req.body);
    res.json(result);
}

export async function requestOtp(req: Request, res: Response) {
    const result = await service.requestOtp(req.body);
    res.json(result);
}

export async function verifyOtp(req: Request, res: Response) {
    const result = await service.verifyOtp(req.body);
    res.json(result);
}

export async function requestPasswordReset(req: Request, res: Response) {
    const result = await service.requestPasswordReset(req.body);
    res.json(result);
}

export async function verifyPasswordResetOtp(req: Request, res: Response) {
    const result = await service.verifyPasswordResetOtp(req.body);
    res.json(result);
}

export async function resetPassword(req: Request, res: Response) {
    const result = await service.resetPassword(req.body);
    res.json(result);
}
