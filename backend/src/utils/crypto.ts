import crypto from 'crypto';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const IV_LENGTH = 16;
const ITERATIONS = 100000; // PBKDF2 iterations

interface EncryptedData {
  salt: Buffer;
  iv: Buffer;
  authTag: Buffer;
  ciphertext: Buffer;
}

/**
 * Şifreli dosyası oluştur (GZip + AES-256-GCM)
 * Dosya formatı: [salt(32) + iv(16) + authTag(16) + ciphertext]
 */
export async function encryptBackup(data: string, password: string): Promise<Buffer> {
  // Şifreyi key'e dönüştür
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');

  // IV oluştur
  const iv = crypto.randomBytes(IV_LENGTH);

  // Önce sıkıştır, sonra şifrele
  const compressed = await gzip(Buffer.from(data, 'utf-8'));

  // AES-256-GCM ile şifrele
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(compressed), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // [salt + iv + authTag + ciphertext] formatında birleştir
  return Buffer.concat([salt, iv, authTag, ciphertext]);
}

/**
 * Şifreli dosyayı aç
 */
export async function decryptBackup(encryptedBuffer: Buffer, password: string): Promise<string> {
  // Bileşenleri ayır
  const salt = encryptedBuffer.subarray(0, SALT_LENGTH);
  const iv = encryptedBuffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = encryptedBuffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const ciphertext = encryptedBuffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  // Şifreyi key'e dönüştür (aynı salt ile)
  const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');

  // AES-256-GCM ile aç
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    const decompressed = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    // Sıkıştırmayı aç
    const uncompressed = await gunzip(decompressed);
    return uncompressed.toString('utf-8');
  } catch (err) {
    throw new Error('Şifre yanlış veya dosya bozuk');
  }
}
