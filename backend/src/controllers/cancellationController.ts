import { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types';
import * as cancellationService from '../services/cancellationService';
import * as discountService from '../services/discountService';
import { CancellationReason } from '@prisma/client';
import { prisma } from '../config/database';

export async function requestCancellation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const orderId = req.params.orderId as string;
    const { reason, description } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ success: false, message: 'Oturum açmanız gerekli' });
    if (!orderId || !reason) return res.status(400).json({ success: false, message: 'Gerekli alanlar eksik' });

    if (!Object.values(CancellationReason).includes(reason)) {
      return res.status(400).json({ success: false, message: 'Geçersiz iptal nedeni' });
    }

    const cancellation = await cancellationService.requestCancellation(orderId, userId, reason, description);

    res.json({ success: true, data: cancellation });
  } catch (err) {
    next(err);
  }
}

export async function listCancellations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    const cancellations = await cancellationService.listCancellations({
      status: status as any,
      limit: parseInt(String(limit)),
      offset: parseInt(String(offset)),
    });

    const total = await prisma.orderCancellation.count({
      where: status ? { status: status as any } : undefined,
    });

    res.json({ success: true, data: cancellations, pagination: { limit: parseInt(String(limit)), offset: parseInt(String(offset)), total } });
  } catch (err) {
    next(err);
  }
}

export async function getCancellation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const cancellationId = req.params.cancellationId as string;
    const userId = req.user?.id;

    const cancellation = await cancellationService.getCancellation(cancellationId, userId);

    res.json({ success: true, data: cancellation });
  } catch (err) {
    next(err);
  }
}

export async function approveCancellation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const cancellationId = req.params.cancellationId as string;
    const { adminNotes } = req.body;

    const cancellation = await cancellationService.approveCancellation(cancellationId, adminNotes);

    res.json({ success: true, data: cancellation, message: 'İptal onaylandı' });
  } catch (err) {
    next(err);
  }
}

export async function rejectCancellation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const cancellationId = req.params.cancellationId as string;
    const { reason } = req.body;

    const cancellation = await cancellationService.rejectCancellation(cancellationId, reason);

    res.json({ success: true, data: cancellation, message: 'İptal talebi reddedildi' });
  } catch (err) {
    next(err);
  }
}

export async function processRefund(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const cancellationId = req.params.cancellationId as string;

    const cancellation = await cancellationService.processRefund(cancellationId);

    res.json({ success: true, data: cancellation, message: 'İade işlemi tamamlandı' });
  } catch (err) {
    next(err);
  }
}

export async function getOrderCancellation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const orderId = req.params.orderId as string;

    const cancellation = await cancellationService.getOrderCancellation(orderId);

    if (!cancellation) {
      return res.status(404).json({ success: false, message: 'İptal talebi bulunamadı' });
    }

    res.json({ success: true, data: cancellation });
  } catch (err) {
    next(err);
  }
}

export async function getUserCoupons(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Oturum açmanız gerekli' });

    const coupons = await discountService.getUserCoupons(userId);

    res.json({ success: true, data: coupons });
  } catch (err) {
    next(err);
  }
}

export async function unrejectCancellation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const cancellationId = req.params.cancellationId as string;

    await cancellationService.unrejectCancellation(cancellationId);

    res.json({ success: true, message: 'İptal reddi iptal edildi' });
  } catch (err) {
    next(err);
  }
}

