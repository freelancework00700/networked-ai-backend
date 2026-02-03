import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import {  getAllLikesByFeedId, getUserLikedFeeds, getMyLikedFeeds, checkIfFeedLiked, LikeUnlikeFeed } from '../controllers/feed-liked.controller';

const feedLikedRouter = Router();

// Get
feedLikedRouter.get('/feed/:feedId', getAllLikesByFeedId);
feedLikedRouter.get('/user/:userId', getUserLikedFeeds);
feedLikedRouter.get('/me', authenticateToken, getMyLikedFeeds);
feedLikedRouter.get('/check/:feedId', authenticateToken, checkIfFeedLiked);

// Post
feedLikedRouter.post('/:feedId', authenticateToken, LikeUnlikeFeed);


export default feedLikedRouter;

