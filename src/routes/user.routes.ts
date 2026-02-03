import { Router } from 'express';
import { checkUserExists, deleteUser, getAllUsersPaginated, getUserByIdOrUsername, searchAllUsers, updateUser, updateUserFcmTokenAndLocation } from '../controllers/user.controller';
import { authenticateToken, optionalAuthenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import { getAllUsersPaginatedSchema, updateUserSchema, updateFcmTokenAndLocationSchema } from '../validations/user.validations';

const userRouter = Router();

// Get
userRouter.get('/check', checkUserExists);
userRouter.get('/search', authenticateToken, searchAllUsers);
userRouter.get('/paginated', authenticateToken, validateSchema(getAllUsersPaginatedSchema, 'query'), getAllUsersPaginated);
userRouter.get('/:value', optionalAuthenticateToken, getUserByIdOrUsername);

// Put
userRouter.put(
    '/',
    authenticateToken,
    validateSchema(updateUserSchema, 'body'),
    updateUser
);
userRouter.put('/fcm-token-location', authenticateToken, validateSchema(updateFcmTokenAndLocationSchema, 'body'), updateUserFcmTokenAndLocation);

// Delete
userRouter.delete('/:id', authenticateToken, deleteUser);

export default userRouter;