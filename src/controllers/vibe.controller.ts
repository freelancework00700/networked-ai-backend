import { NextFunction, Request, Response } from 'express';
import { sequelize } from '../server';
import vibeService from '../services/vibe.service';
import loggerService from '../utils/logger.service';
import { responseMessages } from '../utils/response-message.service';
import { sendBadRequestResponse, sendConflictErrorResponse, sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse } from '../utils/response.service';

/** GET API: Get all vibes with search query. */
export const getAllVibes = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { search } = req.query;

        const vibes = await vibeService.getAllVibes(search as string);
        if(!vibes.length) {
            return sendSuccessResponse(res, responseMessages.vibe.notFound, vibes);
        }

        return sendSuccessResponse(res, responseMessages.vibe.retrieved, vibes);
    } catch (error) {
        loggerService.error(`Error getting all vibes: ${error}`);
        sendServerErrorResponse(res, responseMessages.vibe.failedToFetch, error);
        next(error);
    }
};

/** GET API: Get all vibes with pagination and search query. */
export const getAllVibesPaginated = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit, search } = req.query;

        const vibes = await vibeService.getAllVibesPaginated(Number(page), Number(limit), search as string);
        if(!vibes.data.length) {
            return sendSuccessResponse(res, responseMessages.vibe.notFound, vibes);
        }

        return sendSuccessResponse(res, responseMessages.vibe.retrieved, vibes);
    } catch (error) {
        loggerService.error(`Error getting all vibes paginated: ${error}`);
        sendServerErrorResponse(res, responseMessages.vibe.failedToFetch, error);
        next(error);
    }
};

/** GET API: Get a vibe by id. */
export const getVibeById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const vibe = await vibeService.getVibeById(id);
        if (!vibe) {
            return sendNotFoundResponse(res, responseMessages.vibe.notFoundSingle);
        }

        return sendSuccessResponse(res, responseMessages.vibe.retrievedSingle, vibe);
    } catch (error) {
        loggerService.error(`Error getting vibe: ${error}`);
        sendServerErrorResponse(res, responseMessages.vibe.failedToFetchSingle, error);
        next(error);
    }
};

/** POST API: Create a new vibe. */
export const createVibe = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { user } = res.locals.auth;

        const existingVibe = await vibeService.getVibeByName(req.body.name);
        if (existingVibe) {
            await transaction.rollback();
            return sendConflictErrorResponse(res, responseMessages.vibe.alreadyExists);
        }

        const vibe = await vibeService.createVibe(req.body, user.id, transaction);
        if (!vibe) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.vibe.failedToCreate);
        }

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.vibe.created, vibe);
    } catch (error) {
        loggerService.error(`Error creating vibe: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.vibe.failedToCreate, error);
        next(error);
    }
};

/** PUT API: Update a vibe. */
export const updateVibe = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { user } = res.locals.auth;

        const vibe = await vibeService.getVibeById(id);
        if (!vibe) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.vibe.notFoundSingle);
        }

        const existingVibe = await vibeService.getVibeByName(req.body.name, id);
        if (existingVibe) {
            await transaction.rollback();
            return sendConflictErrorResponse(res, responseMessages.vibe.alreadyExists);
        }

        await vibeService.updateVibe(id, req.body, user.id, transaction);

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.vibe.updated);
    } catch (error) {
        loggerService.error(`Error updating vibe: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.vibe.failedToUpdate, error);
        next(error);
    }
};

/** DELETE API: Delete a vibe. */
export const deleteVibe = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { user } = res.locals.auth;

        const vibe = await vibeService.getVibeById(id);
        if (!vibe) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.vibe.notFoundSingle);
        }

        await vibeService.deleteVibe(id, user.id, transaction);

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.vibe.deleted);
    } catch (error) {
        loggerService.error(`Error deleting vibe: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.vibe.failedToDelete, error);
        next(error);
    }
};