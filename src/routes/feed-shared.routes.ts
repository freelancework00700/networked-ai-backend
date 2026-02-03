import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import { shareFeedSchema } from '../validations/feed-shared.validations';
import { shareFeed, unshareFeed, getFeedShares, getUserSharedFeeds, getMySharedFeeds, checkIfFeedShared } from '../controllers/feed-shared.controller';

const feedSharedRouter = Router();

// Get
feedSharedRouter.get('/feed/:feedId', getFeedShares);
feedSharedRouter.get('/user/:userId', getUserSharedFeeds);
feedSharedRouter.get('/me', authenticateToken, getMySharedFeeds);
feedSharedRouter.get('/check/:feedId/peer/:peerId', authenticateToken, checkIfFeedShared);

// Post
feedSharedRouter.post('/', authenticateToken, validateSchema(shareFeedSchema, 'body'), shareFeed);

// Delete
feedSharedRouter.delete('/:feedId/peer/:peerId', authenticateToken, unshareFeed);

export default feedSharedRouter;

