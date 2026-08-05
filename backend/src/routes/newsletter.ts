import { Router } from 'express';
import { prisma } from '../config/database';
import { validate } from '../middlewares/validate';
import { z } from 'zod';

const router = Router();

const subscribeSchema = z.object({
  email: z.string().email('Geçersiz e-posta adresi'),
});

router.post('/subscribe', validate(subscribeSchema), async (req, res, next) => {
  try {
    const { email } = req.body;

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (existing) {
      return res.json({
        success: true,
        message: 'Bu e-posta adresi zaten bültene kayıtlı.',
      });
    }

    await prisma.newsletterSubscriber.create({
      data: { email, status: 'confirmed' },
    });

    res.status(201).json({
      success: true,
      message: 'Bültene başarıyla kayıt oldunuz!',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
