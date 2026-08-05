import { Request, Response, NextFunction } from 'express';
import { isSetupCompleted, completeSetup, SetupInput } from '../services/setupService';

export async function getSetupStatus(_req: Request, res: Response, next: NextFunction) {
  try {
    const completed = await isSetupCompleted();
    res.json({ success: true, data: { setupCompleted: completed } });
  } catch (err) {
    next(err);
  }
}

export async function postSetup(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await completeSetup(req.body as SetupInput);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
