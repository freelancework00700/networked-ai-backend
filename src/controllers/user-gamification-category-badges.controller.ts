import { NextFunction, Request, Response } from 'express';
import { sequelize } from '../server';
import userGamificationCategoryBadgesService from '../services/user-gamification-category-badges.service';
import loggerService from '../utils/logger.service';
import { responseMessages } from '../utils/response-message.service';
import {
    sendBadRequestResponse,
    sendNotFoundResponse,
    sendServerErrorResponse,
    sendSuccessResponse
} from '../utils/response.service';

/** POST API: Create user gamification category badge entry. */
export const createUserGamificationCategoryBadge = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const badge = await userGamificationCategoryBadgesService.createUserGamificationCategoryBadge(
            req.body,
            transaction
        );

        if (!badge) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.userGamificationCategoryBadge.failedToCreate);
        }

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.userGamificationCategoryBadge.created, badge);
    } catch (error) {
        loggerService.error(`Error creating user gamification category badge: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.userGamificationCategoryBadge.failedToCreate, error);
        next(error);
    }
};

/** GET API: Get user badge status for all categories. */
export const getUserBadgeStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.params.userId;

        const badgeStatus = await userGamificationCategoryBadgesService.getUserBadgeStatus(userId);

        if (!badgeStatus) {
            return sendNotFoundResponse(res, 'User badge status not found');
        }

        return sendSuccessResponse(res, 'User badge status retrieved successfully', badgeStatus);
    } catch (error) {
        loggerService.error(`Error getting user badge status: ${error}`);
        sendServerErrorResponse(res, 'Failed to get user badge status', error);
        next(error);
    }
};

/** GET API: Get gamification leaderboard (weekly and all-time) with current user rank. */
export const getGamificationLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { user } = res.locals.auth || {};
        const currentUserId = user?.id;

        const leaderboard = await userGamificationCategoryBadgesService.getGamificationLeaderboard(currentUserId);

        return sendSuccessResponse(res, 'Gamification leaderboard retrieved successfully', leaderboard);
    } catch (error) {
        loggerService.error(`Error getting gamification leaderboard: ${error}`);
        sendServerErrorResponse(res, 'Failed to get gamification leaderboard', error);
        next(error);
    }
};
