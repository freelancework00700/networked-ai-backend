import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import { createFeedReportSchema, updateFeedReportSchema } from '../validations/feed-report.validations';
import {
    createReport,
    updateReport,
    deleteReport,
    getReportById,
    getAllReportByFeedAndUserId,
    getReportsByFeed,
    getReportsByUser,
    getMyReports,
} from '../controllers/feed-report.controller';

const feedReportRouter = Router();

// Get
feedReportRouter.get('/', getAllReportByFeedAndUserId);
feedReportRouter.get('/feed/:feedId', getReportsByFeed);
feedReportRouter.get('/user/:userId', getReportsByUser);
feedReportRouter.get('/me', authenticateToken, getMyReports);
feedReportRouter.get('/:id', getReportById);

// Post
feedReportRouter.post('/', authenticateToken, validateSchema(createFeedReportSchema, 'body'), createReport);

// Put
feedReportRouter.put('/:id', authenticateToken, validateSchema(updateFeedReportSchema, 'body'), updateReport);

// Delete
feedReportRouter.delete('/:id', authenticateToken, deleteReport);

export default feedReportRouter;

