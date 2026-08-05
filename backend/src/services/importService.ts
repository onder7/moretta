import * as XLSX from 'xlsx';
import { prisma } from '../config/database';
import { logger } from '../config/logger';


export interface ImportResult {
  total:   number;
  success: number;
  errors:  { row: number; message: string }[];
}

interface ProductRow {
  ad?:                  string;
  kategori?:            string;
  marka?:               string;
  fiyat?:               string | number;
  karsilastirma_fiyati?: string | number;
  stok?:                string | number;
  sku?:                 string;
  aciklama?:            string;
  gorsel_url?:          string;
  aktif?:               string | number | boolean;
}

function generateSKU(): string {
  return 'SKU-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function normalizeRow(raw: Record<string, unknown>): ProductRow {
  const lower: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    lower[k.toLowerCase().trim().replace(/\s+/g, '_')] = v;
  }
  return lower as ProductRow;
}

function toNum(v: string | number | undefined, fallback = 0): number {
  if (v === undefined || v === null || v === '') return fallback;
  const n = Number(String(v).replace(',', '.'));
  return isNaN(n) ? fallback : n;
}

function toBool(v: string | number | boolean | undefined): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  const s = String(v ?? '').toLowerCase().trim();
  return s === 'true' || s === '1' || s === 'evet' || s === 'yes' || s === 'aktif';
}

async function findOrCreateCategory(name: string): Promise<string> {
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const existing = await prisma.category.findFirst({ where: { name } });
  if (existing) return existing.id;
  const created = await prisma.category.create({
    data: { name, slug },
  });
  return created.id;
}

async function findOrCreateBrand(name: string): Promise<string> {
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const existing = await prisma.brand.findFirst({ where: { name } });
  if (existing) return existing.id;
  const created = await prisma.brand.create({
    data: { name, slug },
  });
  return created.id;
}

export async function importProductsFromBuffer(
  buffer: Buffer,
  mimeType: string,
): Promise<ImportResult> {
  let rows: ProductRow[];

  try {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    rows = json.map(normalizeRow);
  } catch (e) {
    logger.error('Excel parse hatası', { err: (e as Error).message });
    return { total: 0, success: 0, errors: [{ row: 0, message: 'Dosya okunamadı: ' + (e as Error).message }] };
  }

  const result: ImportResult = { total: rows.length, success: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // Excel row 1 = header
    const row = rows[i];

    const name = String(row.ad ?? '').trim();
    if (!name) {
      result.errors.push({ row: rowNum, message: '"ad" sütunu boş olamaz' });
      continue;
    }

    try {
      const categoryName = String(row.kategori ?? 'Genel').trim() || 'Genel';
      const brandName    = String(row.marka ?? '').trim();

      const categoryId = await findOrCreateCategory(categoryName);
      const brandId    = brandName ? await findOrCreateBrand(brandName) : null;

      const price         = toNum(row.fiyat, 0);
      const comparePrice  = toNum(row.karsilastirma_fiyati, 0);
      const stock         = Math.round(toNum(row.stok, 0));
      const sku           = String(row.sku ?? '').trim() || generateSKU();
      const description   = String(row.aciklama ?? '').trim();
      const imageUrl      = String(row.gorsel_url ?? '').trim();
      const isActive      = row.aktif !== undefined ? toBool(row.aktif) : true;

      const slug = name
        .toLowerCase()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
        .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        + '-' + Date.now();

      await prisma.product.create({
        data: {
          name,
          slug,
          description,
          categoryId,
          brandId,
          isActive,
          isFeatured: false,
          images: imageUrl
            ? { create: [{ url: imageUrl, altText: name, isPrimary: true, sortOrder: 0 }] }
            : undefined,
          variants: {
            create: [{
              sku,
              price,
              compareAtPrice: comparePrice > 0 ? comparePrice : null,
              stock,
              isDefault: true,
            }],
          },
        },
      });

      result.success++;
    } catch (e) {
      const msg = (e as Error).message;
      logger.warn('Satır içe aktarma hatası', { row: rowNum, err: msg });
      result.errors.push({ row: rowNum, message: msg });
    }
  }

  logger.info('Ürün içe aktarma tamamlandı', result);
  return result;
}
