import { Router } from 'express';
import {
    createGamificationBadge,
    deleteGamificationBadge,
    getAllGamificationBadges,
    getAllGamificationBadgesPaginated,
    getGamificationBadgeById,
    updateGamificationBadge,
} from '../controllers/gamification-badge.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import {
    createGamificationBadgeSchema,
    getAllGamificationBadgesPaginatedSchema,
    getAllGamificationBadgesSchema,
    updateGamificationBadgeSchema,
} from '../validations/gamification-badge.validations';

const router = Router();

// Get
router.get('/', validateSchema(getAllGamificationBadgesSchema, 'query'), getAllGamificationBadges);
router.get('/paginated', authenticateToken, validateSchema(getAllGamificationBadgesPaginatedSchema, 'query'), getAllGamificationBadgesPaginated);
router.get('/:id', authenticateToken, getGamificationBadgeById);

// Post
router.post('/', authenticateToken, validateSchema(createGamificationBadgeSchema, 'body'), createGamificationBadge);

// Put
router.put('/:id', authenticateToken, validateSchema(updateGamificationBadgeSchema, 'body'), updateGamificationBadge);

// Delete
router.delete('/:id', authenticateToken, deleteGamificationBadge);

export default router;

