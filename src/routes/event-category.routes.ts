import { Router } from 'express';
import { createEventCategory, deleteEventCategory, getAllEventCategories, getAllEventCategoriesPaginated, getEventCategoryById, updateEventCategory } from '../controllers/event-category.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import { createEventCategorySchema, getAllEventCategoriesPaginatedSchema, getAllEventCategoriesSchema, updateEventCategorySchema } from '../validations/event-category.validations';

const router = Router();

// Get
router.get('/', validateSchema(getAllEventCategoriesSchema, 'query'), getAllEventCategories);
router.get('/paginated', authenticateToken, validateSchema(getAllEventCategoriesPaginatedSchema, 'query'), getAllEventCategoriesPaginated);
router.get('/:id', authenticateToken, getEventCategoryById);

// Post
router.post('/', authenticateToken, validateSchema(createEventCategorySchema, 'body'), createEventCategory);

// Put
router.put('/:id', authenticateToken, validateSchema(updateEventCategorySchema, 'body'), updateEventCategory);

// Delete
router.delete('/:id', authenticateToken, deleteEventCategory);

export default router;
