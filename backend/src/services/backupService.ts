import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { encryptBackup, decryptBackup } from '../utils/crypto';

const execAsync = promisify(exec);

const BACKUP_DIR = path.join(process.cwd(), 'backups');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

// DATABASE_URL → bağlantı parçaları
function parseDbUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port || '5432',
    user: decodeURIComponent(u.username),
    pass: decodeURIComponent(u.password),
    db:   u.pathname.replace(/^\//, ''),
  };
}

// ─── pg_dump ile yedek al ─────────────────────────────────────────────────────

export async function createBackup(adminPassword?: string): Promise<{ filename: string; size: number; path: string }> {
  ensureBackupDir();

  const db = parseDbUrl(process.env.DATABASE_URL!);
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const baseFilename = `backup-full-${ts}`;
  const filename = adminPassword ? `${baseFilename}.sql.enc` : `${baseFilename}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);

  try {
    // pg_dump via direct connection
    const pgDumpCmd = `PGPASSWORD="${db.pass}" pg_dump -h ${db.host} -p ${db.port} -U ${db.user} -d ${db.db} --format=plain --no-acl --no-owner`;
    const { stdout } = await execAsync(pgDumpCmd, { maxBuffer: 100 * 1024 * 1024 });

    let fileData: Buffer | string = stdout;

    // Admin şifresi verilmişse şifrele
    if (adminPassword) {
      fileData = await encryptBackup(stdout, adminPassword);
    }

    fs.writeFileSync(filepath, fileData);
    const { size } = fs.statSync(filepath);
    logger.info('Tam SQL yedek oluşturuldu', { filename, size, encrypted: !!adminPassword });
    return { filename, size, path: filepath };
  } catch (err) {
    logger.error('Yedekleme hatası', { err: (err as Error).message });
    // Fallback: JSON yedek
    logger.warn('SQL yedek başarısız, JSON yedeğe geçiliyor');
    return createJsonBackup();
  }
}

async function createJsonBackup(): Promise<{ filename: string; size: number; path: string }> {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `backup-${ts}.json`;
  const filepath = path.join(BACKUP_DIR, filename);

  const [products, categories, brands, orders, users] = await Promise.all([
    prisma.product.findMany({ include: { variants: true, images: true, tags: true } }),
    prisma.category.findMany(),
    prisma.brand.findMany(),
    prisma.order.findMany({ include: { items: true } }),
    prisma.user.findMany({ select: { id: true, email: true, role: true, createdAt: true } }),
  ]);

  const dump = {
    exportedAt: new Date().toISOString(),
    tables: { products, categories, brands, orders, users },
  };

  fs.writeFileSync(filepath, JSON.stringify(dump, null, 2), 'utf-8');
  const { size } = fs.statSync(filepath);
  logger.info('JSON yedek oluşturuldu', { filename, size });
  return { filename, size, path: filepath };
}

// ─── Yedek listesi ────────────────────────────────────────────────────────────

export interface BackupFile {
  filename: string;
  size:     number;
  sizeHuman: string;
  createdAt: string;
}

export function listBackups(): BackupFile[] {
  ensureBackupDir();
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => (f.startsWith('backup-') || f.startsWith('clean-')) && (f.endsWith('.sql') || f.endsWith('.json') || f.endsWith('.sql.enc')))
    .map((filename) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, filename));
      return {
        filename,
        size: stat.size,
        sizeHuman: formatBytes(stat.size),
        createdAt: stat.birthtime.toISOString(),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getBackupPath(filename: string): string | null {
  // Güvenlik: dosya adında dizin geçişi engelle
  const safe = path.basename(filename);
  if (!(safe.startsWith('backup-') || safe.startsWith('clean-')) || !(safe.endsWith('.sql') || safe.endsWith('.json') || safe.endsWith('.sql.enc'))) return null;
  const full = path.join(BACKUP_DIR, safe);
  return fs.existsSync(full) ? full : null;
}

export function deleteBackup(filename: string): boolean {
  const p = getBackupPath(filename);
  if (!p) return false;
  fs.unlinkSync(p);
  return true;
}

// ─── Zamanlama ayarları ───────────────────────────────────────────────────────

export interface BackupSchedule {
  enabled:   boolean;
  frequency: 'daily' | 'weekly';
  hour:      number;   // 0-23
  weekday:   number;   // 0=Pazar..6=Cumartesi (sadece weekly için)
  keepCount: number;   // kaç yedek tutulsun
}

const DEFAULTS: BackupSchedule = {
  enabled: false, frequency: 'daily', hour: 2, weekday: 0, keepCount: 7,
};

export async function getBackupSchedule(): Promise<BackupSchedule> {
  const rows = await prisma.siteSettings.findMany({
    where: { key: { startsWith: 'tools_backup_' } },
  });
  const m = Object.fromEntries(rows.map((r) => [r.key.slice('tools_backup_'.length), r.value]));
  return {
    enabled:   m['enabled']   === 'true',
    frequency: (m['frequency'] as 'daily' | 'weekly') || DEFAULTS.frequency,
    hour:      m['hour']      !== undefined ? Number(m['hour'])      : DEFAULTS.hour,
    weekday:   m['weekday']   !== undefined ? Number(m['weekday'])   : DEFAULTS.weekday,
    keepCount: m['keep_count']!== undefined ? Number(m['keep_count']): DEFAULTS.keepCount,
  };
}

export async function saveBackupSchedule(schedule: BackupSchedule): Promise<void> {
  const entries: Record<string, string> = {
    tools_backup_enabled:    String(schedule.enabled),
    tools_backup_frequency:  schedule.frequency,
    tools_backup_hour:       String(schedule.hour),
    tools_backup_weekday:    String(schedule.weekday),
    tools_backup_keep_count: String(schedule.keepCount),
  };
  await prisma.$transaction(
    Object.entries(entries).map(([key, value]) =>
      prisma.siteSettings.upsert({
        where:  { key },
        update: { value },
        create: { key, value },
      }),
    ),
  );
}

// Eski yedekleri temizle
export function pruneOldBackups(keepCount: number) {
  const files = listBackups();
  if (files.length <= keepCount) return;
  files.slice(keepCount).forEach((f) => {
    try { fs.unlinkSync(path.join(BACKUP_DIR, f.filename)); }
    catch { /* ignore */ }
  });
}

// ─── Cron reload hook (set by server.ts) ─────────────────────────────────────

export let triggerScheduleReload: (() => void) | undefined;

export function setScheduleReloadHook(fn: () => void) {
  triggerScheduleReload = fn;
}

// ─── Geri yükleme ────────────────────────────────────────────────────────────

export async function restoreBackup(filename: string, password?: string): Promise<{ success: boolean; message: string }> {
  const filepath = getBackupPath(filename);
  if (!filepath) throw new Error('Yedek dosyası bulunamadı');

  const isEncrypted = filename.endsWith('.sql.enc');

  if (!filename.endsWith('.sql') && !filename.endsWith('.sql.enc')) {
    throw new Error('Sadece SQL yedeklerinden geri yüklenebilir (.sql veya .sql.enc)');
  }

  const db = parseDbUrl(process.env.DATABASE_URL!);
  const tmpSqlFile = path.join(BACKUP_DIR, `.restore-${Date.now()}.sql`);

  try {
    logger.info('Geri yükleme başlıyor', { filename, encrypted: isEncrypted });

    let sql: string;

    // Şifreli dosya ise çöz
    if (isEncrypted) {
      if (!password) throw new Error('Şifreli dosya için şifre gerekli');
      const encryptedBuffer = fs.readFileSync(filepath);
      sql = await decryptBackup(encryptedBuffer, password);
    } else {
      sql = fs.readFileSync(filepath, 'utf-8');
    }

    // Sürüm uyumsuzluğu koruması: daha yeni bir pg_dump (ör. PG17) ile alınmış
    // yedekler, daha eski bir sunucunun (ör. PG16) tanımadığı SET satırları içerir
    // (transaction_timeout vb.). Bu satırlar geri yüklemeyi bozar; ayıklıyoruz.
    sql = sql.replace(/^\s*SET\s+transaction_timeout\b.*$/gim, '-- (uyumsuz SET ayıklandı)');

    // Yedekler --clean/DROP içermeyen düz pg_dump'lar. Mevcut (dolu) bir şemanın
    // üzerine uygulanırsa CREATE TABLE'lar "already exists" verir ve geri yükleme
    // sessizce hiçbir şey yapmaz. Bu yüzden önce şemayı sıfırlıyoruz; böylece dump
    // temiz bir public şemaya uygulanır.
    const resetPrefix = [
      '-- restoreBackup: temiz geri yükleme için şema sıfırlama',
      'DROP SCHEMA IF EXISTS public CASCADE;',
      'CREATE SCHEMA public;',
      '',
    ].join('\n');

    // Geçici dosyaya SQL yaz
    fs.writeFileSync(tmpSqlFile, resetPrefix + sql, 'utf-8');

    // psql ile geçici dosyayı yükle.
    // --single-transaction: TÜM işlem (DROP + CREATE + veri) tek transaction'da çalışır;
    //   herhangi bir hata olursa HER ŞEY geri sarılır (rollback) → DB asla boş/yarım kalmaz.
    // ON_ERROR_STOP=1: ilk hatada dur (single-transaction'ın rollback tetiklemesi için şart).
    const pgDumpCmd = `PGPASSWORD="${db.pass}" psql -v ON_ERROR_STOP=1 --single-transaction -h ${db.host} -p ${db.port} -U ${db.user} -d ${db.db} -f "${tmpSqlFile}"`;
    await execAsync(pgDumpCmd, { maxBuffer: 100 * 1024 * 1024 });

    // Geçici dosyayı sil
    fs.unlinkSync(tmpSqlFile);

    logger.info('Geri yükleme tamamlandı', { filename });
    return { success: true, message: 'Veritabanı başarıyla geri yüklendi' };
  } catch (err) {
    // Geçici dosyayı temizle
    try { fs.unlinkSync(tmpSqlFile); } catch { /* ignore */ }
    logger.error('Geri yükleme hatası', { err: (err as Error).message });
    throw new Error(`Geri yükleme başarısız: ${(err as Error).message}`);
  }
}

// ─── Util ─────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
}
