import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import { getNotificationsSchema } from '../validations/notification.validations';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, getUnreadNotificationCount } from '../controllers/notification.controller';

const notificationRouter = Router();

// Get notifications with pagination
notificationRouter.get('/', authenticateToken, validateSchema(getNotificationsSchema, 'query'), getNotifications);

// Get unread notification count
notificationRouter.get('/unread-count', authenticateToken, getUnreadNotificationCount);

// Mark single notification as read
notificationRouter.put('/:id/read', authenticateToken, markNotificationAsRead);

// Mark all notifications as read
notificationRouter.put('/read-all', authenticateToken, markAllNotificationsAsRead);

export default notificationRouter;
