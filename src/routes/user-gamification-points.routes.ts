import { Router } from 'express';
import {
    createUserGamificationPoints,
    deleteUserGamificationPoints,
    getAllUserGamificationPointsPaginated,
    getUserGamificationPointsById,
    getUserGamificationPointsByUserId,
    getTotalEarnedPointsByUserId,
    initializeUserGamificationPointsForAllCategories,
    updateUserGamificationPoints,
} from '../controllers/user-gamification-points.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import {
    createUserGamificationPointsSchema,
    getAllUserGamificationPointsPaginatedSchema,
    updateUserGamificationPointsSchema,
} from '../validations/user-gamification-points.validations';

const router = Router();

// Get
router.get('/user/:userId', authenticateToken, getUserGamificationPointsByUserId);
router.get('/user/:userId/total', authenticateToken, getTotalEarnedPointsByUserId);
router.get('/paginated', authenticateToken, validateSchema(getAllUserGamificationPointsPaginatedSchema, 'query'), getAllUserGamificationPointsPaginated);
router.get('/:id', authenticateToken, getUserGamificationPointsById);

// Post
router.post('/', authenticateToken, validateSchema(createUserGamificationPointsSchema, 'body'), createUserGamificationPoints);
router.post('/initialize', authenticateToken, initializeUserGamificationPointsForAllCategories);

// Put
router.put('/:id', authenticateToken, validateSchema(updateUserGamificationPointsSchema, 'body'), updateUserGamificationPoints);

// Delete
router.delete('/:id', authenticateToken, deleteUserGamificationPoints);

export default router;

