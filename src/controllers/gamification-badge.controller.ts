import { NextFunction, Request, Response } from 'express';
import { sequelize } from '../server';
import gamificationBadgeService from '../services/gamification-badge.service';
import loggerService from '../utils/logger.service';
import { responseMessages } from '../utils/response-message.service';
import {
    sendBadRequestResponse,
    sendConflictErrorResponse,
    sendNotFoundResponse,
    sendServerErrorResponse,
    sendSuccessResponse
} from '../utils/response.service';

/** GET API: Get all gamification badges with search query. */
export const getAllGamificationBadges = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { search } = req.query;

        const badges = await gamificationBadgeService.getAllGamificationBadges(search as string);
        if (!badges.length) {
            return sendSuccessResponse(res, responseMessages.gamificationBadge.notFound, badges);
        }

        return sendSuccessResponse(res, responseMessages.gamificationBadge.retrieved, badges);
    } catch (error) {
        loggerService.error(`Error getting all gamification badges: ${error}`);
        sendServerErrorResponse(res, responseMessages.gamificationBadge.failedToFetch, error);
        next(error);
    }
};

/** GET API: Get all gamification badges with pagination and search query. */
export const getAllGamificationBadgesPaginated = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit, search } = req.query;

        const badges = await gamificationBadgeService.getAllGamificationBadgesPaginated(Number(page), Number(limit), search as string);
        if (!badges.data.length) {
            return sendSuccessResponse(res, responseMessages.gamificationBadge.notFound, badges);
        }

        return sendSuccessResponse(res, responseMessages.gamificationBadge.retrieved, badges);
    } catch (error) {
        loggerService.error(`Error getting all gamification badges paginated: ${error}`);
        sendServerErrorResponse(res, responseMessages.gamificationBadge.failedToFetch, error);
        next(error);
    }
};

/** GET API: Get a gamification badge by id. */
export const getGamificationBadgeById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const badge = await gamificationBadgeService.getGamificationBadgeById(id);
        if (!badge) {
            return sendNotFoundResponse(res, responseMessages.gamificationBadge.notFoundSingle);
        }

        return sendSuccessResponse(res, responseMessages.gamificationBadge.retrievedSingle, badge);
    } catch (error) {
        loggerService.error(`Error getting gamification badge: ${error}`);
        sendServerErrorResponse(res, responseMessages.gamificationBadge.failedToFetchSingle, error);
        next(error);
    }
};

/** POST API: Create a new gamification badge. */
export const createGamificationBadge = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { user } = res.locals.auth;

        const existingBadge = await gamificationBadgeService.getGamificationBadgeByEventCount(req.body.event_count);
        if (existingBadge) {
            await transaction.rollback();
            return sendConflictErrorResponse(res, responseMessages.gamificationBadge.alreadyExists);
        }

        const badge = await gamificationBadgeService.createGamificationBadge(req.body, user.id, transaction);
        if (!badge) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.gamificationBadge.failedToCreate);
        }

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.gamificationBadge.created, badge);
    } catch (error) {
        loggerService.error(`Error creating gamification badge: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.gamificationBadge.failedToCreate, error);
        next(error);
    }
};

/** PUT API: Update a gamification badge. */
export const updateGamificationBadge = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { user } = res.locals.auth;

        const badge = await gamificationBadgeService.getGamificationBadgeById(id, transaction);
        if (!badge) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.gamificationBadge.notFoundSingle);
        }

        if (req.body.event_count !== undefined) {
            const existingBadge = await gamificationBadgeService.getGamificationBadgeByEventCount(req.body.event_count, id);
            if (existingBadge) {
                await transaction.rollback();
                return sendConflictErrorResponse(res, responseMessages.gamificationBadge.alreadyExists);
            }
        }

        await gamificationBadgeService.updateGamificationBadge(id, req.body, user.id, transaction);

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.gamificationBadge.updated);
    } catch (error) {
        loggerService.error(`Error updating gamification badge: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.gamificationBadge.failedToUpdate, error);
        next(error);
    }
};

/** DELETE API: Delete a gamification badge. */
export const deleteGamificationBadge = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { user } = res.locals.auth;

        const badge = await gamificationBadgeService.getGamificationBadgeById(id, transaction);
        if (!badge) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.gamificationBadge.notFoundSingle);
        }

        await gamificationBadgeService.deleteGamificationBadge(id, user.id, transaction);

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.gamificationBadge.deleted);
    } catch (error) {
        loggerService.error(`Error deleting gamification badge: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.gamificationBadge.failedToDelete, error);
        next(error);
    }
};

