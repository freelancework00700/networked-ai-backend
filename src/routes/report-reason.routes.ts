import { Router } from 'express';
import { createReportReason, deleteReportReason, getAllReportReasons, getAllReportReasonsPaginated, getReportReasonById, updateReportReason } from '../controllers/report-reason.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import { createReportReasonSchema, getAllReportReasonsPaginatedSchema, getAllReportReasonsSchema, updateReportReasonSchema } from '../validations/report-reason.validations';

const router = Router();

// Get
router.get('/', validateSchema(getAllReportReasonsSchema, 'query'), getAllReportReasons);
router.get('/paginated', authenticateToken, validateSchema(getAllReportReasonsPaginatedSchema, 'query'), getAllReportReasonsPaginated);
router.get('/:id', authenticateToken, getReportReasonById);

// Post
router.post('/', authenticateToken, validateSchema(createReportReasonSchema, 'body'), createReportReason);

// Put
router.put('/:id', authenticateToken, validateSchema(updateReportReasonSchema, 'body'), updateReportReason);

// Delete
router.delete('/:id', authenticateToken, deleteReportReason);

export default router;
