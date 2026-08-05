import { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types';
import * as returnService from '../services/returnService';
import { ReturnReason } from '@prisma/client';

// ─── Müşteri ──────────────────────────────────────────────────────────────────

export async function requestReturn(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const orderId = req.params.orderId as string;
    const userId = req.user?.id;
    const { reason, description, items } = req.body as {
      reason: ReturnReason; description?: string; items: { orderItemId: string; quantity: number }[];
    };

    if (!userId) return res.status(401).json({ success: false, message: 'Oturum açmanız gerekli' });
    if (!orderId || !reason) return res.status(400).json({ success: false, message: 'Gerekli alanlar eksik' });
    if (!Object.values(ReturnReason).includes(reason)) {
      return res.status(400).json({ success: false, message: 'Geçersiz iade nedeni' });
    }

    const data = await returnService.requestReturn(orderId, userId, reason, description, items ?? []);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getOrderReturns(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const orderId = req.params.orderId as string;
    const data = await returnService.getOrderReturns(orderId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function listReturns(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    const { items, total } = await returnService.listReturns({
      status: status as any,
      limit: parseInt(String(limit)),
      offset: parseInt(String(offset)),
    });
    res.json({ success: true, data: items, pagination: { limit: parseInt(String(limit)), offset: parseInt(String(offset)), total } });
  } catch (err) {
    next(err);
  }
}

export async function getReturn(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await returnService.getReturn(req.params.returnId as string);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function approveReturn(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await returnService.approveReturn(req.params.returnId as string, req.user?.id);
    res.json({ success: true, data, message: 'İade onaylandı ve stok geri yüklendi' });
  } catch (err) {
    next(err);
  }
}

export async function rejectReturn(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { reason } = req.body as { reason?: string };
    const data = await returnService.rejectReturn(req.params.returnId as string, reason);
    res.json({ success: true, data, message: 'İade talebi reddedildi' });
  } catch (err) {
    next(err);
  }
}
