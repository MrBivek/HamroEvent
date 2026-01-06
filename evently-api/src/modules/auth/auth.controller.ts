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
