import path from 'path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { env } from './config/env';
import { logger } from './config/logger';
import apiRoutes from './routes';
import { maintenanceCheck } from './middlewares/maintenance';
import { errorHandler, notFound } from './middlewares/errorHandler';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());

// FRONTEND_URL ve ADMIN_URL'nin www / non-www varyantlarını da kabul et
function buildCorsOrigins(...urls: string[]): string[] {
  const set = new Set<string>();
  for (const url of urls) {
    if (!url) continue;
    try {
      const u = new URL(url);
      // Origin = protocol + hostname + port (path yok)
      const origin = `${u.protocol}//${u.hostname}${u.port ? ':' + u.port : ''}`;
      set.add(origin);
      if (u.hostname.startsWith('www.')) {
        const wwwOrigin = `${u.protocol}//${u.hostname.slice(4)}${u.port ? ':' + u.port : ''}`;
        set.add(wwwOrigin);
      } else {
        const wwwOrigin = `${u.protocol}//www.${u.hostname}${u.port ? ':' + u.port : ''}`;
        set.add(wwwOrigin);
      }
    } catch { set.add(url); }
  }
  return [...set];
}

app.use(
  cors({
    origin: buildCorsOrigins(env.FRONTEND_URL, env.ADMIN_URL),
    credentials: true,
  }),
);

// Global limiter — genel koruma (admin dahil)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.NODE_ENV === 'development' ? 50000 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Çok fazla istek. Lütfen 15 dakika bekleyin.' },
  }),
);

// Auth endpoint'lerine sıkı brute-force koruması
app.use(
  '/api/auth',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.NODE_ENV === 'development' ? 1000 : 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Çok fazla giriş denemesi. Lütfen 15 dakika bekleyin.' },
  }),
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }),
);

app.use('/uploads', (_req, res, next) => {
  // Helmet sets CORP: same-origin by default, which blocks cross-origin <img> loads.
  // Uploaded product images are embedded by frontend (3000) and admin (3001).
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(process.cwd(), 'uploads')));

// ── SEO: sitemap.xml (public, no /api prefix) ─────────────────────────────────
app.get('/sitemap.xml', async (_req, res, next) => {
  try {
    const { prisma } = await import('./config/database');
    const [products, categories] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.category.findMany({
        where: { isActive: true },
        select: { slug: true },
      }),
    ]);

    const siteUrl = env.FRONTEND_URL.replace(/\/$/, '');
    const today = new Date().toISOString().split('T')[0];

    const staticUrls = [
      { loc: siteUrl, priority: '1.0', changefreq: 'daily', lastmod: today },
      { loc: `${siteUrl}/iletisim`, priority: '0.4', changefreq: 'monthly', lastmod: today },
      { loc: `${siteUrl}/iade`, priority: '0.4', changefreq: 'monthly', lastmod: today },
      { loc: `${siteUrl}/sss`, priority: '0.4', changefreq: 'monthly', lastmod: today },
    ];

    const categoryUrls = categories.map((c) => ({
      loc: `${siteUrl}/kategori/${c.slug}`,
      priority: '0.8',
      changefreq: 'weekly',
      lastmod: today,
    }));

    const productUrls = products.map((p) => ({
      loc: `${siteUrl}/urun/${p.slug}`,
      priority: '0.9',
      changefreq: 'weekly',
      lastmod: p.updatedAt.toISOString().split('T')[0],
    }));

    const allUrls = [...staticUrls, ...categoryUrls, ...productUrls];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err) {
    next(err);
  }
});

app.use('/api', maintenanceCheck, apiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
