import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../types';
import { logger } from '../config/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.code ? { code: err.code } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Geçersiz istek verisi',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  if (err.name === 'MulterError' || (err as any).code?.startsWith('LIMIT_')) {
    let message = 'Dosya yükleme hatası';
    if (err.message === 'File too large' || (err as any).code === 'LIMIT_FILE_SIZE') {
      message = 'Yüklenen dosya çok büyük. Maksimum limit 50MB\'dır.';
    } else if (err.message === 'Unexpected field' || (err as any).code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Geçersiz form alanı veya beklenmeyen dosya.';
    } else {
      message = err.message;
    }
    res.status(400).json({
      success: false,
      error: message,
    });
    return;
  }

  // Operasyonel hatalar: err.status / err.statusCode ile fırlatılanlar
  // (Object.assign(new Error(...), { status: 4xx }) deseni projede yaygın).
  const status = (err as { status?: unknown; statusCode?: unknown }).status
    ?? (err as { statusCode?: unknown }).statusCode;
  if (typeof status === 'number' && status >= 400 && status < 600) {
    if (status >= 500) {
      logger.error('Sunucu hatası', { error: err.message, stack: err.stack, url: req.url, method: req.method });
    }
    res.status(status).json({ success: false, error: err.message });
    return;
  }

  logger.error('Beklenmeyen hata', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  const isDev = process.env.NODE_ENV !== 'production';
  res.status(500).json({
    success: false,
    error: isDev ? err.message : 'Sunucu hatası',
    ...(isDev ? { stack: err.stack } : {}),
  });
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route bulunamadı: ${req.method} ${req.url}`,
  });
}
