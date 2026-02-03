import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { createStripeDashboardLink, createOrRefreshStripeAccount } from '../controllers/stripe.controller';

const router = Router();

// Create or refresh Stripe Connect account
router.post('/account', authenticateToken, createOrRefreshStripeAccount);

// Create Stripe dashboard login link
router.get('/dashboard', authenticateToken, createStripeDashboardLink);

export default router;

