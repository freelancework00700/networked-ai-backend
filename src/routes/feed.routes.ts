import { Router } from 'express';
import { createFeed, deleteFeed, getAllFeeds, getFeedById, getFeedsByUser, getMyFeeds, updateFeed, sendFeedNetworkBroadcast } from '../controllers/feed.controller';
import { authenticateToken, optionalAuthenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import { createFeedSchema, updateFeedSchema, feedNetworkBroadcastSchema } from '../validations/feed.validations';

const feedRouter = Router();

// Get
feedRouter.get('/', optionalAuthenticateToken, getAllFeeds);
feedRouter.get('/me', authenticateToken, getMyFeeds);
feedRouter.get('/user/:userId', optionalAuthenticateToken, getFeedsByUser);
feedRouter.get('/:id', optionalAuthenticateToken, getFeedById);

// Post
feedRouter.post(
    '/',
    authenticateToken,
    validateSchema(createFeedSchema, 'body'),
    createFeed
);

// Put
feedRouter.put(
    '/:id',
    authenticateToken,
    validateSchema(updateFeedSchema, 'body'),
    updateFeed
);

// Delete
feedRouter.delete('/:id', authenticateToken, deleteFeed);

// Network broadcast
feedRouter.post('/network-broadcast', authenticateToken, validateSchema(feedNetworkBroadcastSchema, 'body'), sendFeedNetworkBroadcast);

export default feedRouter;

