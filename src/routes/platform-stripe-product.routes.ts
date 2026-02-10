import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { getPlatformProducts, getPlatformProductById, createPlatformProduct } from '../controllers/platform-stripe-product.controller';

const router = Router();

router.get('/', authenticateToken, getPlatformProducts);
router.get('/:id', authenticateToken, getPlatformProductById);

// this is the private route to add the platform product uncomment when needed
// router.post('/', authenticateToken, createPlatformProduct);

export default router;
