import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as invoiceService from '../services/invoiceService';
import * as sysmond from '../services/sysmondService';

// e-Fatura / e-Arşiv (Sysmond E-Dönüşüm) — admin uçları

/** Sipariş için e-Fatura/e-Arşiv keser. */
export async function issue(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await invoiceService.issueInvoice(String(req.params.id));
    res.json({ success: result.status === 'SENT', data: result });
  } catch (err) {
    next(err);
  }
}

/** Faturanın kayıtlı durumunu döner. */
export async function get(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const invoice = await invoiceService.getInvoice(String(req.params.id));
    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
}

/** Sysmond'da taslak bekleyen faturayı GİB'e (yeniden) gönderir. */
export async function sendGib(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await invoiceService.sendInvoiceToGib(String(req.params.id));
    res.json({ success: result.status === 'SENT', data: result });
  } catch (err) {
    next(err);
  }
}

/** GİB durumunu yeniden sorgular (Sysmond GetOutboxInvoiceStatus). */
export async function refresh(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const status = await invoiceService.refreshStatus(String(req.params.id));
    res.json({ success: true, data: status });
  } catch (err) {
    next(err);
  }
}

/** Fatura PDF'ini indirir. */
export async function pdf(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const buf = await invoiceService.getInvoicePdf(String(req.params.id));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="fatura-${req.params.id}.pdf"`);
    res.send(buf);
  } catch (err) {
    next(err);
  }
}

/** Sysmond'a gönderilecek JSON payload önizleme (debug). */
export async function previewXml(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const payload = await invoiceService.previewPayload(String(req.params.id));
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(JSON.stringify(payload, null, 2));
  } catch (err) {
    next(err);
  }
}

/** e-Arşiv faturasını iptal eder (yalnızca EARSIVFATURA). */
export async function cancel(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await invoiceService.cancelInvoice(String(req.params.id));
    res.json({ success: result.status === 'CANCELLED', data: result });
  } catch (err) {
    next(err);
  }
}

/** Sysmond bağlantı testi. */
export async function ping(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await sysmond.ping();
    res.json({ success: result.ok, data: result });
  } catch (err) {
    next(err);
  }
}
