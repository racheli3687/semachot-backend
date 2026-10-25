import type { Request, Response } from 'express';
import { getAuthUser } from '../../auth/auth-user';
import { parse } from '../../validation/zod-setup';
import { loginSchema, registerSchema, updateMeSchema } from './auth.schemas';
import * as authService from './auth.service';

export async function register(req: Request, res: Response) {
  const input = parse(registerSchema, req.body);
  res.status(201).json(await authService.register(input));
}

export async function login(req: Request, res: Response) {
  const input = parse(loginSchema, req.body);
  res.json(await authService.login(input));
}

export async function getMe(req: Request, res: Response) {
  res.json(await authService.getMe(getAuthUser(req).id));
}

export async function updateMe(req: Request, res: Response) {
  const input = parse(updateMeSchema, req.body);
  res.json(await authService.updateMe(getAuthUser(req).id, input));
}
