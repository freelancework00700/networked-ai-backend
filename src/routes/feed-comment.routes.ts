import { Router } from 'express';
import { authenticateToken, optionalAuthenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import { createFeedCommentSchema, updateFeedCommentSchema } from '../validations/feed-comment.validations';
import { createComment, updateComment, deleteComment, getAllCommentsByFeedId, getCommentReplies, getCommentById, getUserComments, getMyComments } from '../controllers/feed-comment.controller';

const feedCommentRouter = Router();

// Get
feedCommentRouter.get('/feed/:feedId', optionalAuthenticateToken, getAllCommentsByFeedId);
feedCommentRouter.get('/me', authenticateToken, getMyComments);
feedCommentRouter.get('/user/:userId', optionalAuthenticateToken, getUserComments);
feedCommentRouter.get('/:commentId/replies', authenticateToken, getCommentReplies);
feedCommentRouter.get('/:id', authenticateToken, getCommentById);

// Post
feedCommentRouter.post('/', authenticateToken, validateSchema(createFeedCommentSchema, 'body'), createComment);

// Put
feedCommentRouter.put('/:id', authenticateToken, validateSchema(updateFeedCommentSchema, 'body'), updateComment);

// Delete
feedCommentRouter.delete('/:id', authenticateToken, deleteComment);


export default feedCommentRouter;

