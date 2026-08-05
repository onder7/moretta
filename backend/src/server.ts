import 'dotenv/config';
import * as cron from 'node-cron';
import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { getBackupSchedule, createBackup, pruneOldBackups, setScheduleReloadHook } from './services/backupService';

let backupCronTask: cron.ScheduledTask | null = null;

function buildCronExpr(hour: number, frequency: 'daily' | 'weekly', weekday: number): string {
  if (frequency === 'weekly') return `0 ${hour} * * ${weekday}`;
  return `0 ${hour} * * *`;
}

async function scheduleBackup() {
  if (backupCronTask) { backupCronTask.stop(); backupCronTask = null; }

  const cfg = await getBackupSchedule();
  if (!cfg.enabled) return;

  const expr = buildCronExpr(cfg.hour, cfg.frequency, cfg.weekday);
  // Admin'in girdiği saat Türkiye saatine göre yorumlansın (container TZ=UTC olabilir)
  backupCronTask = cron.schedule(expr, async () => {
    try {
      logger.info('Zamanlanmış yedek başlıyor...');
      await createBackup();
      pruneOldBackups(cfg.keepCount);
      logger.info('Zamanlanmış yedek tamamlandı');
    } catch (err) {
      logger.error('Zamanlanmış yedek hatası', { err: (err as Error).message });
    }
  }, { timezone: 'Europe/Istanbul' });
  logger.info(`Yedekleme zamanlandı: ${expr} (Europe/Istanbul)`);
}

async function bootstrap(): Promise<void> {
  try {
    await connectDatabase();
    await connectRedis();

    await scheduleBackup();
    setScheduleReloadHook(() => { scheduleBackup().catch(() => {}); });

    const server = app.listen(env.PORT, () => {
      logger.info(`Server çalışıyor → http://localhost:${env.PORT}`);
      logger.info(`Ortam: ${env.NODE_ENV}`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`${signal} alındı, kapatılıyor...`);
      server.close(async () => {
        await disconnectDatabase();
        await disconnectRedis();
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error('Başlatma hatası', { error: (err as Error).message });
    process.exit(1);
  }
}

bootstrap();
