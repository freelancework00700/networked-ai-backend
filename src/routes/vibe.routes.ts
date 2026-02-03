import { Router } from 'express';
import { createVibe, deleteVibe, getAllVibes, getAllVibesPaginated, getVibeById, updateVibe } from '../controllers/vibe.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import { createVibeSchema, getAllVibesPaginatedSchema, getAllVibesSchema, updateVibeSchema } from '../validations/vibe.validations';

const router = Router();

// Get
router.get('/', validateSchema(getAllVibesSchema, 'query'), getAllVibes);
router.get('/paginated', authenticateToken, validateSchema(getAllVibesPaginatedSchema, 'query'), getAllVibesPaginated);
router.get('/:id', authenticateToken, getVibeById);

// Post
router.post('/', authenticateToken, validateSchema(createVibeSchema, 'body'), createVibe);

// Put
router.put('/:id', authenticateToken, validateSchema(updateVibeSchema, 'body'), updateVibe);

// Delete
router.delete('/:id', authenticateToken, deleteVibe);

export default router;
