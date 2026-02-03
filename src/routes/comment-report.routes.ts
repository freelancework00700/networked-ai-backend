import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import { createCommentReportSchema, updateCommentReportSchema } from '../validations/comment-report.validations';
import {
    createCommentReport,
    updateCommentReport,
    deleteCommentReport,
    getCommentReportById,
    getAllCommentReports,
    getReportsByComment,
    getReportsByUser,
    getMyReports,
} from '../controllers/comment-report.controller';

const commentReportRouter = Router();

// Get
commentReportRouter.get('/', getAllCommentReports);
commentReportRouter.get('/comment/:commentId', getReportsByComment);
commentReportRouter.get('/user/:userId', getReportsByUser);
commentReportRouter.get('/me', authenticateToken, getMyReports);
commentReportRouter.get('/:id', getCommentReportById);
// Post
commentReportRouter.post('/', authenticateToken, validateSchema(createCommentReportSchema, 'body'), createCommentReport);

// Put
commentReportRouter.put('/:id', authenticateToken, validateSchema(updateCommentReportSchema, 'body'), updateCommentReport);

// Delete
commentReportRouter.delete('/:id', authenticateToken, deleteCommentReport);

export default commentReportRouter;

