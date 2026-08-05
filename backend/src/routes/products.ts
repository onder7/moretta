import { Router } from 'express';
import * as ctrl from '../controllers/productController';
import reviewsRouter from './reviews';
import qaRouter from './qa';

const router = Router();

router.get('/filter-options', ctrl.getFilterOptions);
router.get('/', ctrl.getProducts);
router.get('/featured', ctrl.getFeatured);
router.get('/:slug', ctrl.getProduct);

// Alt router'lar — ürün ID ile çalışır
router.use('/:productId/reviews', reviewsRouter);
router.use('/:productId/questions', qaRouter);

export default router;
