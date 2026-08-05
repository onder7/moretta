import { Router } from 'express';
import * as ctrl from '../controllers/locationController';

// Türkiye il/ilçe/mahalle verisi — public (adres formu + checkout için, misafir dahil)
const router = Router();

router.get('/iller', ctrl.iller);
router.get('/ilceler', ctrl.ilceler);
router.get('/mahalleler', ctrl.mahalleler);

export default router;
