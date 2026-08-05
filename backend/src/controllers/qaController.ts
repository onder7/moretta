import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as svc from '../services/qaService';

export async function getQuestions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { productId } = req.params as { productId: string };
    const questions = await svc.getQuestions(productId);
    res.json({ success: true, data: questions });
  } catch (err) {
    next(err);
  }
}

export async function addQuestion(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { productId } = req.params as { productId: string };
    const { body, guestName } = req.body as { body: string; guestName?: string };
    const question = await svc.addQuestion(productId, body, {
      userId: req.user?.id,
      guestName: req.user ? undefined : guestName,
    });
    res.status(201).json({ success: true, data: question });
  } catch (err) {
    next(err);
  }
}

export async function addAnswer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { questionId } = req.params as { questionId: string };
    const { body } = req.body as { body: string };
    const answer = await svc.addAnswer(questionId, req.user!.id, body);
    res.status(201).json({ success: true, data: answer });
  } catch (err) {
    next(err);
  }
}
