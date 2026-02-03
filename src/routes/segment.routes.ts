import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import { createSegmentSchema, updateSegmentSchema, getAllSegmentsSchema, getSegmentCustomersSchema } from '../validations/segment.validations';
import { deleteSegment, createSegment, updateSegment, getAllSegments, getSegmentById, getSegmentCustomers } from '../controllers/segment.controller';

const router = Router();

router.get('/', authenticateToken, validateSchema(getAllSegmentsSchema, 'query'), getAllSegments);
router.get('/:id/customers', authenticateToken, validateSchema(getSegmentCustomersSchema, 'query'), getSegmentCustomers);
router.get('/:id', authenticateToken, getSegmentById);

router.post('/', authenticateToken, validateSchema(createSegmentSchema, 'body'), createSegment);

router.put('/:id', authenticateToken, validateSchema(updateSegmentSchema, 'body'), updateSegment);

router.delete('/:id', authenticateToken, deleteSegment);

export default router;
