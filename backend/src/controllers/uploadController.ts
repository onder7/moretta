import { Request, Response } from 'express';
import path from 'path';
import { applyWatermarkToFile } from '../services/watermarkService';

export function uploadProductImage(req: Request, res: Response): void {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'Dosya bulunamadı' });
    return;
  }
  const url = `/uploads/products/${req.file.filename}`;
  res.json({ success: true, data: { url } });
}

/**
 * Ürün görseli yükleme — filigran ayarı açıksa dosyaya filigran basar.
 * Yalnızca ürün resimleri bu yolu kullanır (editör/kategori/logo etkilenmez).
 */
export async function uploadProductImageWatermarked(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'Dosya bulunamadı' });
    return;
  }
  const absPath = path.join(process.cwd(), 'uploads', 'products', req.file.filename);
  await applyWatermarkToFile(absPath);
  const url = `/uploads/products/${req.file.filename}`;
  res.json({ success: true, data: { url } });
}
