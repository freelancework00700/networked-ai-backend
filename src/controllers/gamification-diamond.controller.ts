import { NextFunction, Request, Response } from 'express';
import { sequelize } from '../server';
import gamificationDiamondService from '../services/gamification-diamond.service';
import loggerService from '../utils/logger.service';
import { responseMessages } from '../utils/response-message.service';
import {
    sendBadRequestResponse,
    sendConflictErrorResponse,
    sendNotFoundResponse,
    sendServerErrorResponse,
    sendSuccessResponse
} from '../utils/response.service';

/** GET API: Get all gamification diamonds with search query. */
export const getAllGamificationDiamonds = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { search } = req.query;

        const diamonds = await gamificationDiamondService.getAllGamificationDiamonds(search as string);
        if (!diamonds.length) {
            return sendSuccessResponse(res, responseMessages.gamificationDiamond.notFound, diamonds);
        }

        return sendSuccessResponse(res, responseMessages.gamificationDiamond.retrieved, diamonds);
    } catch (error) {
        loggerService.error(`Error getting all gamification diamonds: ${error}`);
        sendServerErrorResponse(res, responseMessages.gamificationDiamond.failedToFetch, error);
        next(error);
    }
};

/** GET API: Get all gamification diamonds with pagination and search query. */
export const getAllGamificationDiamondsPaginated = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit, search } = req.query;

        const diamonds = await gamificationDiamondService.getAllGamificationDiamondsPaginated(Number(page), Number(limit), search as string);
        if (!diamonds.data.length) {
            return sendSuccessResponse(res, responseMessages.gamificationDiamond.notFound, diamonds);
        }

        return sendSuccessResponse(res, responseMessages.gamificationDiamond.retrieved, diamonds);
    } catch (error) {
        loggerService.error(`Error getting all gamification diamonds paginated: ${error}`);
        sendServerErrorResponse(res, responseMessages.gamificationDiamond.failedToFetch, error);
        next(error);
    }
};

/** GET API: Get a gamification diamond by id. */
export const getGamificationDiamondById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const diamond = await gamificationDiamondService.getGamificationDiamondById(id as string);
        if (!diamond) {
            return sendNotFoundResponse(res, responseMessages.gamificationDiamond.notFoundSingle);
        }

        return sendSuccessResponse(res, responseMessages.gamificationDiamond.retrievedSingle, diamond);
    } catch (error) {
        loggerService.error(`Error getting gamification diamond: ${error}`);
        sendServerErrorResponse(res, responseMessages.gamificationDiamond.failedToFetchSingle, error);
        next(error);
    }
};

/** POST API: Create a new gamification diamond. */
export const createGamificationDiamond = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { user } = res.locals.auth;

        const existingDiamond = await gamificationDiamondService.getGamificationDiamondByColor(req.body.color);
        if (existingDiamond) {
            await transaction.rollback();
            return sendConflictErrorResponse(res, responseMessages.gamificationDiamond.alreadyExists);
        }

        const diamond = await gamificationDiamondService.createGamificationDiamond(req.body, user.id, transaction);
        if (!diamond) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.gamificationDiamond.failedToCreate);
        }

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.gamificationDiamond.created, diamond);
    } catch (error) {
        loggerService.error(`Error creating gamification diamond: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.gamificationDiamond.failedToCreate, error);
        next(error);
    }
};

/** PUT API: Update a gamification diamond. */
export const updateGamificationDiamond = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { user } = res.locals.auth;

        const diamond = await gamificationDiamondService.getGamificationDiamondById(id as string, transaction);
        if (!diamond) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.gamificationDiamond.notFoundSingle);
        }

        if (req.body.color) {
            const existingDiamond = await gamificationDiamondService.getGamificationDiamondByColor(req.body.color, id as string);
            if (existingDiamond) {
                await transaction.rollback();
                return sendConflictErrorResponse(res, responseMessages.gamificationDiamond.alreadyExists);
            }
        }

        await gamificationDiamondService.updateGamificationDiamond(id as string, req.body, user.id, transaction);

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.gamificationDiamond.updated);
    } catch (error) {
        loggerService.error(`Error updating gamification diamond: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.gamificationDiamond.failedToUpdate, error);
        next(error);
    }
};

/** DELETE API: Delete a gamification diamond. */
export const deleteGamificationDiamond = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { user } = res.locals.auth;

        const diamond = await gamificationDiamondService.getGamificationDiamondById(id as string, transaction);
        if (!diamond) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.gamificationDiamond.notFoundSingle);
        }

        await gamificationDiamondService.deleteGamificationDiamond(id as string, user.id, transaction);

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.gamificationDiamond.deleted);
    } catch (error) {
        loggerService.error(`Error deleting gamification diamond: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.gamificationDiamond.failedToDelete, error);
        next(error);
    }
};

