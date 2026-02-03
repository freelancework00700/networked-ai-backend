import { Router } from 'express';
import {
    createInterest,
    deleteInterest,
    getAllInterests,
    getAllInterestsPaginated,
    getInterestById,
    updateInterest,
} from '../controllers/interest.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import {
    createInterestSchema,
    getAllInterestsPaginatedSchema,
    getAllInterestsSchema,
    updateInterestSchema,
} from '../validations/interest.validations';

const router = Router();

// Get
router.get('/', validateSchema(getAllInterestsSchema, 'query'), getAllInterests);
router.get('/paginated', authenticateToken, validateSchema(getAllInterestsPaginatedSchema, 'query'), getAllInterestsPaginated);
router.get('/:id', authenticateToken, getInterestById);

// Post
router.post('/', authenticateToken, validateSchema(createInterestSchema, 'body'), createInterest);

// Put
router.put('/:id', authenticateToken, validateSchema(updateInterestSchema, 'body'), updateInterest);

// Delete
router.delete('/:id', authenticateToken, deleteInterest);

export default router;
