import { Router } from 'express';
import * as ctrl from '../controllers/productController';

const router = Router();

router.get('/', ctrl.getBrands);

export default router;
