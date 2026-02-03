import { Router } from 'express';
import {
    createGamificationDiamond,
    deleteGamificationDiamond,
    getAllGamificationDiamonds,
    getAllGamificationDiamondsPaginated,
    getGamificationDiamondById,
    updateGamificationDiamond,
} from '../controllers/gamification-diamond.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import {
    createGamificationDiamondSchema,
    getAllGamificationDiamondsPaginatedSchema,
    getAllGamificationDiamondsSchema,
    updateGamificationDiamondSchema,
} from '../validations/gamification-diamond.validations';

const router = Router();

// Get
router.get('/', validateSchema(getAllGamificationDiamondsSchema, 'query'), getAllGamificationDiamonds);
router.get('/paginated', authenticateToken, validateSchema(getAllGamificationDiamondsPaginatedSchema, 'query'), getAllGamificationDiamondsPaginated);
router.get('/:id', authenticateToken, getGamificationDiamondById);

// Post
router.post('/', authenticateToken, validateSchema(createGamificationDiamondSchema, 'body'), createGamificationDiamond);

// Put
router.put('/:id', authenticateToken, validateSchema(updateGamificationDiamondSchema, 'body'), updateGamificationDiamond);

// Delete
router.delete('/:id', authenticateToken, deleteGamificationDiamond);

export default router;

