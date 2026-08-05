import { Router } from 'express';
import * as ctrl from '../controllers/qaController';
import { authenticate, optionalAuthenticate } from '../middlewares/auth';

const router = Router({ mergeParams: true });

// GET /products/:productId/questions
router.get('/', ctrl.getQuestions);

// POST /products/:productId/questions  (misafir ya da giriş yapılmış)
router.post('/', optionalAuthenticate, ctrl.addQuestion);

// POST /products/:productId/questions/:questionId/answers  (giriş zorunlu)
router.post('/:questionId/answers', authenticate, ctrl.addAnswer);

export default router;
