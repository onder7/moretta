import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),

  DATABASE_URL: z.string().min(1),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  FRONTEND_URL: z.string().default('http://localhost').transform(s => s.replace(/\/+$/, '')),
  ADMIN_URL: z.string().default('http://localhost/admin').transform(s => s.replace(/\/+$/, '')),
  ADMIN_PASSWORD: z.string().default('Admin123!'),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  BREVO_API_KEY: z.string().optional(),
  BREVO_SENDER_EMAIL: z.string().email().optional(),
  BREVO_SENDER_NAME: z.string().optional(),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  IYZICO_API_KEY: z.string().optional(),
  IYZICO_SECRET_KEY: z.string().optional(),
  IYZICO_BASE_URL: z.string().default('https://sandbox-api.iyzipay.com'),

  // Google Sign-In — OAuth Client ID (token audience doğrulaması için)
  GOOGLE_CLIENT_ID: z.string().optional(),

  // ── Sysmond E-Dönüşüm (REST/JSON) ──
  // Test: https://integration-test.sysmond.com.tr/api  |  Canlı: https://integration.sysmond.com.tr/api
  SYSMOND_API_URL: z.string().optional(),
  SYSMOND_USERNAME: z.string().optional(),
  SYSMOND_PASSWORD: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Geçersiz ortam değişkenleri:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
