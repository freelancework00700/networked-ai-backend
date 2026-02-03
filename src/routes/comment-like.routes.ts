import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import {
    getCommentLikes,
    getUserLikedComments,
    getMyLikedComments,
    checkIfCommentLiked,
    likeUnlikeComment,
} from '../controllers/comment-like.controller';

const commentLikeRouter = Router();

// Get
commentLikeRouter.get('/comment/:commentId', getCommentLikes);
commentLikeRouter.get('/user/:userId', getUserLikedComments);
commentLikeRouter.get('/me', authenticateToken, getMyLikedComments);
commentLikeRouter.get('/check/:commentId', authenticateToken, checkIfCommentLiked);

// Post
commentLikeRouter.post('/:commentId', authenticateToken, likeUnlikeComment);


export default commentLikeRouter;

