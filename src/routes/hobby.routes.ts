import { Router } from 'express';
import {
    createHobby,
    deleteHobby,
    getAllHobbies,
    getAllHobbiesPaginated,
    getHobbyById,
    updateHobby,
} from '../controllers/hobby.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import {
    createHobbySchema,
    getAllHobbiesPaginatedSchema,
    getAllHobbiesSchema,
    updateHobbySchema,
} from '../validations/hobby.validations';

const router = Router();

// Get
router.get('/', validateSchema(getAllHobbiesSchema, 'query'), getAllHobbies);
router.get('/paginated', authenticateToken, validateSchema(getAllHobbiesPaginatedSchema, 'query'), getAllHobbiesPaginated);
router.get('/:id', authenticateToken, getHobbyById);

// Post
router.post('/', authenticateToken, validateSchema(createHobbySchema, 'body'), createHobby);

// Put
router.put('/:id', authenticateToken, validateSchema(updateHobbySchema, 'body'), updateHobby);

// Delete
router.delete('/:id', authenticateToken, deleteHobby);

export default router;
