import { Router } from 'express';
import healthRouter from './health';
import authRouter from './auth';
import mfaRouter from './mfa';
import oauthRouter from './oauth';
import productsRouter from './products';
import categoriesRouter from './categories';
import brandsRouter from './brands';
import cartRouter from './cart';
import addressesRouter from './addresses';
import checkoutRouter from './checkout';
import wishlistRouter from './wishlist';
import reviewsRouter from './reviews';
import profileRouter from './profile';
import adminRouter from './admin';
import newsletterRouter from './newsletter';
import pricingRouter from './pricing';
import campaignsRouter from './campaigns';
import discountsRouter from './discounts';
import locationsRouter from './locations';
import pagesRouter from './pages';
import navLinksRouter from './navLinks';
import featureCardsRouter from './featureCards';
import { getActiveRules } from '../controllers/chatbotController';
import { getSetupStatus, postSetup } from '../controllers/setupController';
import { getActivePopup } from '../controllers/popupController';
import { getActiveCampaign } from '../controllers/discountCampaignController';
import { getShippingConfig, getMaintenanceConfig, getSettingsGroup, getTaxConfig, getGoogleClientId } from '../services/settingsService';
import { optionalAuthenticate } from '../middlewares/auth';
import { AuthRequest } from '../types';

const router = Router();

router.use('/health', healthRouter);

// İlk kurulum sihirbazı (public — postSetup admin yoksa çalışır, varsa 409)
router.get('/setup/status', getSetupStatus);
router.post('/setup', postSetup);

router.get('/chatbot/rules', getActiveRules);
router.get('/popup', getActivePopup);
router.get('/campaign', getActiveCampaign);

// Public runtime config — frontend'in build sonrası ihtiyaç duyduğu açık değerler
router.get('/config/public', async (_req, res, next) => {
  try {
    res.set('Cache-Control', 'no-cache');
    const analyticsConfig = await getSettingsGroup('analytics_');
    res.json({ 
      success: true, 
      data: { 
        googleClientId: await getGoogleClientId(),
        analyticsCode: analyticsConfig.tracking_code || null
      } 
    });
  } catch (err) { next(err); }
});
router.use('/auth', authRouter);
router.use('/mfa', mfaRouter);
router.use('/', oauthRouter);
router.use('/products', productsRouter);
router.use('/categories', categoriesRouter);
router.use('/brands', brandsRouter);
router.use('/cart', cartRouter);
router.use('/addresses', addressesRouter);
router.use('/locations', locationsRouter);
router.use('/checkout', checkoutRouter);
router.use('/wishlist', wishlistRouter);
router.use('/reviews', reviewsRouter);
router.use('/', pagesRouter);
router.use('/', navLinksRouter);
router.use('/', featureCardsRouter);

// GET /api/questions/my-questions — kullanıcının sorduğu sorular (hesabım sayfası)
import { authenticate as authMw } from '../middlewares/auth';
import { AuthRequest as AuthReq } from '../types';
router.get('/questions/my-questions', authMw, async (req: AuthReq, res, next) => {
  try {
    const { prisma: db } = await import('../config/database');
    const questions = await db.productQuestion.findMany({
      where: { userId: req.user!.id },
      include: {
        product: {
          select: {
            id: true, name: true, slug: true,
            images: { orderBy: { sortOrder: 'asc' as const }, select: { id: true, url: true, altText: true }, take: 1 },
          },
        },
        answers: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, role: true, profile: { select: { firstName: true, lastName: true } } } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: questions });
  } catch (err) { next(err); }
});
router.use('/profile', profileRouter);
router.use('/admin', adminRouter);
router.use('/newsletter', newsletterRouter);
router.use('/pricing', pricingRouter);
router.use('/campaigns', campaignsRouter);
router.use('/discounts', discountsRouter);

// Mağaza logosu — public (header için)
router.get('/store-logo', async (_req, res, next) => {
  try {
    const data = await getSettingsGroup('general_');
    res.json({ success: true, data: { logo_url: data.logo_url || null } });
  } catch (err) { next(err); }
});

// Firma iletişim bilgileri — public (iletişim sayfası için)
router.get('/company-info', async (_req, res, next) => {
  try {
    const data = await getSettingsGroup('general_');
    res.json({ success: true, data: {
      name: data.store_name || 'Mağaza',
      legalName: data.legal_name || data.store_name || 'Mağaza',
      slogan: data.footer_slogan || '',
      email: data.email || '',
      phone: data.phone || '',
      address: data.address || '',
      city: data.city || '',
      taxOffice: data.tax_office || '',
      taxNumber: data.tax_number || '',
      logoUrl: data.logo_url || '',
      mapEmbed: data.mapEmbed || 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d195884.30030588698!2d32.62267988358488!3d39.90329181165241!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14d347d520730525%3A0xb89a3c7db2bc3397!2sAnkara!5e0!3m2!1str!2str!4v1700000000000!5m2!1str!2str'
    } });
  } catch (err) { next(err); }
});

// Sosyal medya linkleri — public (footer ve ürün sayfası için)
router.get('/social-links', async (_req, res, next) => {
  try {
    const data = await getSettingsGroup('social_');
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// Kargo konfigürasyonu — public (frontend sepet/checkout için)
router.get('/shipping-config', async (_req, res, next) => {
  try {
    const data = await getShippingConfig();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// KDV konfigürasyonu — public (frontend sepet/checkout için)
router.get('/tax-config', async (_req, res, next) => {
  try {
    const data = await getTaxConfig();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/maintenance-status', async (_req, res, next) => {
  try {
    const data = await getMaintenanceConfig();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/slides', async (_req, res, next) => {
  try {
    const { prisma } = await import('../config/database');
    const row = await prisma.siteSettings.findUnique({
      where: { key: 'homepage_slides' }
    });
    
    // Varsayılan: boş — slider, admin panelinden (Slider sekmesi) eklenene kadar gösterilmez.
    // (Önceden var olmayan /banner-*.png dosyalarına işaret edip konsolda 404 üretiyordu.)
    const defaults: { img: string; link: string }[] = [];

    let slides = defaults;
    if (row && row.value) {
      try {
        slides = JSON.parse(row.value);
      } catch (err) {
        console.error('Failed to parse slides setting:', err);
      }
    }
    
    res.json({ success: true, data: slides });
  } catch (err) { next(err); }
});

router.post('/contact', optionalAuthenticate, async (req: AuthRequest, res, next) => {
  try {
    const { name, email, subject, body } = req.body;
    if (!name || !email || !body) {
      return res.status(400).json({ success: false, error: 'Ad, e-posta ve mesaj alanları zorunludur.' });
    }
    const { prisma } = await import('../config/database');
    const msg = await prisma.contactMessage.create({
      data: {
        name: String(name).trim(),
        email: String(email).trim(),
        subject: subject ? String(subject).trim() : null,
        body: String(body).trim(),
        userId: req.user?.id || null,
      }
    });
    res.json({ success: true, data: msg });
  } catch (err) { next(err); }
});

export default router;
