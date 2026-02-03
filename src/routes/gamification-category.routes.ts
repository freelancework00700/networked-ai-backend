import { Router } from 'express';
import {
    createGamificationCategory,
    deleteGamificationCategory,
    getAllGamificationCategories,
    getAllGamificationCategoriesPaginated,
    getGamificationCategoryById,
    updateGamificationCategory,
} from '../controllers/gamification-category.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import {
    createGamificationCategorySchema,
    getAllGamificationCategoriesPaginatedSchema,
    getAllGamificationCategoriesSchema,
    updateGamificationCategorySchema,
} from '../validations/gamification-category.validations';

const router = Router();

// Get
router.get('/', validateSchema(getAllGamificationCategoriesSchema, 'query'), getAllGamificationCategories);
router.get('/paginated', authenticateToken, validateSchema(getAllGamificationCategoriesPaginatedSchema, 'query'), getAllGamificationCategoriesPaginated);
router.get('/:id', authenticateToken, getGamificationCategoryById);

// Post
router.post('/', authenticateToken, validateSchema(createGamificationCategorySchema, 'body'), createGamificationCategory);

// Put
router.put('/:id', authenticateToken, validateSchema(updateGamificationCategorySchema, 'body'), updateGamificationCategory);

// Delete
router.delete('/:id', authenticateToken, deleteGamificationCategory);

export default router;

