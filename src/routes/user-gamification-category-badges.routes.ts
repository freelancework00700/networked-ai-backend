import { Router } from 'express';
import { getUserBadgeStatus, getGamificationLeaderboard, createUserGamificationCategoryBadge } from '../controllers/user-gamification-category-badges.controller';
import { authenticateToken, optionalAuthenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import { createUserGamificationCategoryBadgeSchema } from '../validations/user-gamification-category-badges.validations';

const router = Router();

// Get
router.get('/user/:userId', optionalAuthenticateToken, getUserBadgeStatus);
router.get('/leaderboard', authenticateToken, getGamificationLeaderboard);

// Post
router.post('/', authenticateToken, validateSchema(createUserGamificationCategoryBadgeSchema, 'body'), createUserGamificationCategoryBadge);

export default router;

