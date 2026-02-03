import { NextFunction, Request, Response } from 'express';
import { sequelize } from '../server';
import userGamificationPointsService from '../services/user-gamification-points.service';
import loggerService from '../utils/logger.service';
import { responseMessages } from '../utils/response-message.service';
import {
    sendBadRequestResponse,
    sendNotFoundResponse,
    sendServerErrorResponse,
    sendSuccessResponse
} from '../utils/response.service';

/** GET API: Get user gamification points by user ID. */
export const getUserGamificationPointsByUserId = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = req.params;

        const points = await userGamificationPointsService.getUserGamificationPointsByUserId(userId as string);
        if (!points || points.length === 0) {
            return sendSuccessResponse(res, responseMessages.userGamificationPoints.notFound, []);
        }

        return sendSuccessResponse(res, responseMessages.userGamificationPoints.retrieved, points);
    } catch (error) {
        loggerService.error(`Error getting user gamification points by user ID: ${error}`);
        sendServerErrorResponse(res, responseMessages.userGamificationPoints.failedToFetch, error);
        next(error);
    }
};

/** GET API: Get user gamification points by ID. */
export const getUserGamificationPointsById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const points = await userGamificationPointsService.getUserGamificationPointsById(id as string);
        if (!points) {
            return sendNotFoundResponse(res, responseMessages.userGamificationPoints.notFoundSingle);
        }

        return sendSuccessResponse(res, responseMessages.userGamificationPoints.retrievedSingle, points);
    } catch (error) {
        loggerService.error(`Error getting user gamification points by ID: ${error}`);
        sendServerErrorResponse(res, responseMessages.userGamificationPoints.failedToFetchSingle, error);
        next(error);
    }
};

/** GET API: Get total earned points for a user. */
export const getTotalEarnedPointsByUserId = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = req.params;

        const totalPoints = await userGamificationPointsService.getTotalEarnedPointsByUserId(userId as string);
        return sendSuccessResponse(res, responseMessages.userGamificationPoints.totalPointsRetrieved, { total_points: totalPoints });
    } catch (error) {
        loggerService.error(`Error getting total earned points: ${error}`);
        sendServerErrorResponse(res, responseMessages.userGamificationPoints.failedToFetchTotal, error);
        next(error);
    }
};

/** GET API: Get all user gamification points with pagination. */
export const getAllUserGamificationPointsPaginated = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit, userId, categoryId } = req.query;

        const result = await userGamificationPointsService.getAllUserGamificationPointsPaginated(
            Number(page),
            Number(limit),
            userId as string | undefined,
            categoryId as string | undefined
        );

        if (!result.data.length) {
            return sendSuccessResponse(res, responseMessages.userGamificationPoints.notFound, result);
        }

        return sendSuccessResponse(res, responseMessages.userGamificationPoints.retrieved, result);
    } catch (error) {
        loggerService.error(`Error getting all user gamification points paginated: ${error}`);
        sendServerErrorResponse(res, responseMessages.userGamificationPoints.failedToFetch, error);
        next(error);
    }
};

/** POST API: Create user gamification points entry. */
export const createUserGamificationPoints = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { user } = res.locals.auth;

        const points = await userGamificationPointsService.createUserGamificationPoints(
            req.body,
            user.id,
            transaction
        );

        if (!points) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.userGamificationPoints.failedToCreate);
        }

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.userGamificationPoints.created, points);
    } catch (error) {
        loggerService.error(`Error creating user gamification points: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.userGamificationPoints.failedToCreate, error);
        next(error);
    }
};

/** POST API: Initialize user gamification points for all categories. */
export const initializeUserGamificationPointsForAllCategories = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { user } = res.locals.auth;
        const { userId } = req.body;

        if (!userId) {
            await transaction.rollback();
            return sendBadRequestResponse(res, 'User ID is required.');
        }

        const createdEntries = await userGamificationPointsService.initializeUserGamificationPointsForAllCategories(
            userId,
            user.id,
            transaction
        );

        await transaction.commit();
        return sendSuccessResponse(
            res,
            responseMessages.userGamificationPoints.initialized,
            { created_count: createdEntries.length, entries: createdEntries }
        );
    } catch (error) {
        loggerService.error(`Error initializing user gamification points: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.userGamificationPoints.failedToInitialize, error);
        next(error);
    }
};

/** PUT API: Update user gamification points. */
export const updateUserGamificationPoints = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { user } = res.locals.auth;

        const existingPoints = await userGamificationPointsService.getUserGamificationPointsById(id as string, transaction);
        if (!existingPoints) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.userGamificationPoints.notFoundSingle);
        }

        await userGamificationPointsService.updateUserGamificationPoints(id as string, req.body, user.id, transaction);

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.userGamificationPoints.updated);
    } catch (error) {
        loggerService.error(`Error updating user gamification points: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.userGamificationPoints.failedToUpdate, error);
        next(error);
    }
};

/** DELETE API: Delete user gamification points (soft delete). */
export const deleteUserGamificationPoints = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { user } = res.locals.auth;

        const existingPoints = await userGamificationPointsService.getUserGamificationPointsById(id as string, transaction);
        if (!existingPoints) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.userGamificationPoints.notFoundSingle);
        }

        await userGamificationPointsService.deleteUserGamificationPoints(id as string, user.id, transaction);

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.userGamificationPoints.deleted);
    } catch (error) {
        loggerService.error(`Error deleting user gamification points: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.userGamificationPoints.failedToDelete, error);
        next(error);
    }
};

