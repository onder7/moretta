import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import * as ctrl from '../controllers/wishlistController';

const router = Router();

router.use(authenticate);
router.get('/', ctrl.get);
router.post('/toggle', ctrl.toggle);

export default router;
