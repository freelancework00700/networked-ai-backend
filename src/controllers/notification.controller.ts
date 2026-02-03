import { NotificationType } from '../types/enums';
import loggerService from '../utils/logger.service';
import { NextFunction, Request, Response } from 'express';
import notificationService from '../services/notification.service';
import { responseMessages } from '../utils/response-message.service';
import { sendBadRequestResponse, sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse } from '../utils/response.service';

/**
 * Get all notifications for authenticated user with pagination
 * @route GET /api/notifications
 */
export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authenticatedUser = res.locals.auth?.user;

        const { page, limit, type } = req.query;

        // Handle special type values: 'All' and 'Unread'
        let isRead: boolean | undefined;
        let notificationType: NotificationType | undefined;

        if (type === 'All') {
            // 'All' means return all notifications regardless of type or read status
            notificationType = undefined;
            isRead = undefined;
        } else if (type === 'Unread') {
            // 'Unread' means return only unread notifications
            notificationType = undefined;
            isRead = false;
        } else if (type && Object.values(NotificationType).includes(type as NotificationType)) {
            // Valid NotificationType enum value
            notificationType = type as NotificationType;
            isRead = undefined;
        } else {
            // No type filter provided
            notificationType = undefined;
            isRead = undefined;
        }

        const notifications = await notificationService.getNotificationsPaginated(
            authenticatedUser.id,
            Number(page) || 1,
            Number(limit) || 10,
            notificationType,
            isRead
        );

        if (!notifications.data.length) {
            return sendSuccessResponse(res, responseMessages.notification.notFound, notifications);
        }

        return sendSuccessResponse(res, responseMessages.notification.retrieved, notifications);
    } catch (error) {
        loggerService.error(`Error getting notifications: ${error}`);
        sendServerErrorResponse(res, responseMessages.notification.failedToFetch, error);
        next(error);
    }
};

/**
 * Mark a single notification as read
 * @route PUT /api/notifications/:id/read
 */
export const markNotificationAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authenticatedUser = res.locals.auth?.user;

        const { id } = req.params;

        if (!id) {
            return sendBadRequestResponse(res, responseMessages.notification.notificationIdRequired);
        }

        const notification = await notificationService.markNotificationAsRead(id, authenticatedUser.id);

        if (!notification) {
            return sendNotFoundResponse(res, responseMessages.notification.notFoundSingle);
        }

        return sendSuccessResponse(res, responseMessages.notification.markedAsRead, notification);
    } catch (error) {
        loggerService.error(`Error marking notification as read: ${error}`);
        sendServerErrorResponse(res, responseMessages.notification.failedToMarkAsRead, error);
        next(error);
    }
};

/**
 * Mark all notifications as read for authenticated user
 * @route PUT /api/notifications/read-all
 */
export const markAllNotificationsAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authenticatedUser = res.locals.auth?.user;
        const result = await notificationService.markAllNotificationsAsRead(authenticatedUser.id);
        return sendSuccessResponse(res, responseMessages.notification.allMarkedAsRead, result);
    } catch (error) {
        loggerService.error(`Error marking all notifications as read: ${error}`);
        sendServerErrorResponse(res, responseMessages.notification.failedToMarkAllAsRead, error);
        next(error);
    }
};

/**
 * Get unread notification count for authenticated user
 * @route GET /api/notifications/unread-count
 */
export const getUnreadNotificationCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authenticatedUser = res.locals.auth?.user;
        const count = await notificationService.getUnreadNotificationCount(authenticatedUser.id);
        return sendSuccessResponse(res, responseMessages.notification.unreadCountRetrieved, { count });
    } catch (error) {
        loggerService.error(`Error getting unread notification count: ${error}`);
        sendServerErrorResponse(res, responseMessages.notification.failedToFetchUnreadCount, error);
        next(error);
    }
};
