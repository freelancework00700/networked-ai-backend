import { Router } from 'express';
import { blockUser, unblockUser, getAllBlockedUsers, checkIfBlocked } from '../controllers/blocked-user.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const blockedUserRouter = Router();

// Get
blockedUserRouter.get('/', authenticateToken, getAllBlockedUsers);
blockedUserRouter.get('/check/:peer_id', authenticateToken, checkIfBlocked);

// Post
blockedUserRouter.post('/:peer_id', authenticateToken, blockUser);

// Delete
blockedUserRouter.delete('/:peer_id', authenticateToken, unblockUser);

export default blockedUserRouter;

