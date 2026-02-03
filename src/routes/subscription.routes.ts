import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import { getUserSubscriptionsPaginatedSchema } from '../validations/subscription.validations';
import { createSubscriptionPaymentIntentSchema } from '../validations/stripe.validations';
import { getCurrentUserSubscriptions, getCurrentUserSubscriptionById, createSubscriptionPaymentIntent, cancelSubscription } from '../controllers/subscription.controller';

const router = Router();

// Get all subscriptions of current user with pagination
router.get('/', authenticateToken, validateSchema(getUserSubscriptionsPaginatedSchema, 'query'), getCurrentUserSubscriptions);

// Get a single subscription of current user by ID
router.get('/:id', authenticateToken, getCurrentUserSubscriptionById);

// Create subscription payment intent
router.post('/payment-intent', authenticateToken, validateSchema(createSubscriptionPaymentIntentSchema, 'body'), createSubscriptionPaymentIntent);

// Cancel subscription by database subscription ID
router.post('/:subscriptionId/cancel', authenticateToken, cancelSubscription);

export default router;

