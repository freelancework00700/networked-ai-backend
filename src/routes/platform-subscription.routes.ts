import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { createPlatformSubscription, cancelPlatformSubscription, createFreeSubscriptionsForAllUsers } from '../controllers/platform-subscription.controller';

const router = Router();

router.post('/cancel', authenticateToken, cancelPlatformSubscription);
router.post('/payment-intent', authenticateToken, createPlatformSubscription);

// this is a temporary route to create free subscriptions for all users
// router.post('/create-free-subscriptions', authenticateToken, createFreeSubscriptionsForAllUsers);

export default router;
