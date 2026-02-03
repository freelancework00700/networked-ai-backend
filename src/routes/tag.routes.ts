import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import { createTag, updateTag, deleteTag, getAllTags, getTagById, getTagCustomers } from '../controllers/tag.controller';
import { createTagSchema, updateTagSchema, getAllTagsSchema, getTagCustomersSchema } from '../validations/tag.validations';

const router = Router();

router.get('/', authenticateToken, validateSchema(getAllTagsSchema, 'query'), getAllTags);
router.get('/:id/customers', authenticateToken, validateSchema(getTagCustomersSchema, 'query'), getTagCustomers);
router.get('/:id', authenticateToken, getTagById);

router.post('/', authenticateToken, validateSchema(createTagSchema, 'body'), createTag);

router.put('/:id', authenticateToken, validateSchema(updateTagSchema, 'body'), updateTag);

router.delete('/:id', authenticateToken, deleteTag);

export default router;
