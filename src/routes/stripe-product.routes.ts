import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import { getUserSubscriptionsPaginatedSchema } from '../validations/subscription.validations';
import { createStripeProductSchema, updateStripeProductSchema } from '../validations/stripe-product.validations';
import { createStripeProduct, updateStripeProduct, deleteStripeProduct, getStripeProductById, getUserStripeProducts, getPlanSubscribers } from '../controllers/stripe-product.controller';

const router = Router();

// Get
router.get('/user', authenticateToken, getUserStripeProducts);
router.get('/user/:userId', authenticateToken, getUserStripeProducts);
router.get('/:productId/subscribers', authenticateToken, validateSchema(getUserSubscriptionsPaginatedSchema, 'query'), getPlanSubscribers);
router.get('/:productId', authenticateToken, getStripeProductById);

// Post
router.post('/', authenticateToken, validateSchema(createStripeProductSchema, 'body'), createStripeProduct);

// Put
router.put('/:productId', authenticateToken, validateSchema(updateStripeProductSchema, 'body'), updateStripeProduct);

// Delete
router.delete('/:productId', authenticateToken, deleteStripeProduct);

export default router;

