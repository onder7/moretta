import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { prisma } from '../config/database';
import { updateSettingsGroup } from './settingsService';

export type WatermarkPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center'
  | 'tiled';

export interface WatermarkConfig {
  enabled: boolean;
  url: string;               // /uploads/products/xxx.png  (saydam PNG önerilir)
  position: WatermarkPosition;
  opacity: number;           // 0-100
  size: number;              // baz görselin genişliğine oranı (%)
  margin: number;            // kenar boşluğu (px)
}

const WM_DEFAULTS: WatermarkConfig = {
  enabled: false,
  url: '',
  position: 'bottom-right',
  opacity: 70,
  size: 22,
  margin: 16,
};

const PREFIX = 'watermark_';
const uploadsRoot = path.join(process.cwd(), 'uploads');

export async function getWatermarkConfig(): Promise<WatermarkConfig> {
  try {
    const rows = await prisma.siteSettings.findMany({ where: { key: { startsWith: PREFIX } } });
    const m = Object.fromEntries(rows.map((r) => [r.key.slice(PREFIX.length), r.value]));
    return {
      enabled: m['enabled'] === 'true',
      url: m['url']?.trim() || '',
      position: (m['position'] as WatermarkPosition) || WM_DEFAULTS.position,
      opacity: m['opacity'] !== undefined ? Number(m['opacity']) : WM_DEFAULTS.opacity,
      size: m['size'] !== undefined ? Number(m['size']) : WM_DEFAULTS.size,
      margin: m['margin'] !== undefined ? Number(m['margin']) : WM_DEFAULTS.margin,
    };
  } catch {
    return { ...WM_DEFAULTS };
  }
}

export async function updateWatermarkConfig(cfg: WatermarkConfig): Promise<WatermarkConfig> {
  const clamp = (v: number, lo: number, hi: number, d: number) =>
    Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;

  await updateSettingsGroup(PREFIX, {
    enabled: String(!!cfg.enabled),
    url: cfg.url ?? '',
    position: cfg.position || WM_DEFAULTS.position,
    opacity: String(clamp(cfg.opacity, 0, 100, WM_DEFAULTS.opacity)),
    size: String(clamp(cfg.size, 1, 100, WM_DEFAULTS.size)),
    margin: String(clamp(cfg.margin, 0, 1000, WM_DEFAULTS.margin)),
  });
  return getWatermarkConfig();
}

/**
 * URL'den (/uploads/...) sunucudaki mutlak dosya yolunu çözer; uploads kökünün
 * dışına çıkan yolları (path traversal) reddeder.
 */
function resolveUploadPath(url: string): string | null {
  const rel = url.replace(/^\/?uploads\//, '');
  const abs = path.resolve(uploadsRoot, rel);
  if (!abs.startsWith(uploadsRoot)) return null;
  return abs;
}

/**
 * Verilen görsel dosyasına (yerinde) filigran uygular. Filigran kapalıysa,
 * filigran görseli yoksa veya dosya animasyonlu GIF ise hiçbir şey yapmaz.
 * Hata durumunda sessizce orijinali korur — yükleme akışını bozmaz.
 */
export async function applyWatermarkToFile(filePath: string): Promise<void> {
  try {
    const cfg = await getWatermarkConfig();
    if (!cfg.enabled || !cfg.url) return;

    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.gif') return; // animasyonlu GIF'i bozmayalım

    const wmPath = resolveUploadPath(cfg.url);
    if (!wmPath || !fs.existsSync(wmPath)) return;

    // Dosyaları buffer'a oku — sharp'ın doğrudan dosya I/O'su yerine buffer kullan
    // (aynı dosyayı eşzamanlı okuyup yazma sorununu da ortadan kaldırır)
    const baseBuf = await fs.promises.readFile(filePath);
    const wmInput = await fs.promises.readFile(wmPath);

    const base = sharp(baseBuf, { failOn: 'none' });
    const meta = await base.metadata();
    const baseW = meta.width ?? 0;
    const baseH = meta.height ?? 0;
    if (!baseW || !baseH) return;

    // Filigranı baz genişliğin %size'ı kadar küçült
    const targetW = Math.max(1, Math.round((baseW * cfg.size) / 100));
    let wm = sharp(wmInput, { failOn: 'none' }).ensureAlpha().resize({
      width: targetW,
      fit: 'inside',
      withoutEnlargement: false,
    });

    // Opaklık: alfa kanalını ölçekle (dest-in blend)
    if (cfg.opacity < 100) {
      const a = Math.max(0, Math.min(255, Math.round((cfg.opacity / 100) * 255)));
      wm = wm.composite([
        {
          input: Buffer.from([255, 255, 255, a]),
          raw: { width: 1, height: 1, channels: 4 },
          tile: true,
          blend: 'dest-in',
        },
      ]);
    }

    const wmBuf = await wm.png().toBuffer();
    const wmMeta = await sharp(wmBuf).metadata();
    const wmW = wmMeta.width ?? targetW;
    const wmH = wmMeta.height ?? targetW;

    const m = cfg.margin;
    const overlay: sharp.OverlayOptions = { input: wmBuf };

    switch (cfg.position) {
      case 'tiled':
        overlay.tile = true;
        break;
      case 'center':
        overlay.gravity = 'center';
        break;
      case 'top-left':
        overlay.left = m;
        overlay.top = m;
        break;
      case 'top-right':
        overlay.left = Math.max(0, baseW - wmW - m);
        overlay.top = m;
        break;
      case 'bottom-left':
        overlay.left = m;
        overlay.top = Math.max(0, baseH - wmH - m);
        break;
      case 'bottom-right':
      default:
        overlay.left = Math.max(0, baseW - wmW - m);
        overlay.top = Math.max(0, baseH - wmH - m);
        break;
    }

    const out = await base.composite([overlay]).toBuffer();
    await fs.promises.writeFile(filePath, out);
  } catch (err) {
    console.error('[watermark] uygulanamadı:', (err as Error)?.message);
  }
}
