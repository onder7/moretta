import { Router } from 'express';
import * as ctrl from '../controllers/productController';

const router = Router();

router.get('/', ctrl.getCategories);
router.get('/:slug', ctrl.getCategory);

export default router;
