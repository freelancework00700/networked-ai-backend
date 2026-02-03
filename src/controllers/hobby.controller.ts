import { NextFunction, Request, Response } from 'express';
import { sequelize } from '../server';
import hobbyService from '../services/hobby.service';
import loggerService from '../utils/logger.service';
import { responseMessages } from '../utils/response-message.service';
import {
    sendBadRequestResponse,
    sendConflictErrorResponse,
    sendNotFoundResponse,
    sendServerErrorResponse,
    sendSuccessResponse,
} from '../utils/response.service';

/** GET API: Get all hobbies with search query. */
export const getAllHobbies = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { search } = req.query;

        const hobbies = await hobbyService.getAllHobbies(search as string);
        if (!hobbies.length) {
            return sendSuccessResponse(res, responseMessages.hobby.notFound, hobbies);
        }

        return sendSuccessResponse(res, responseMessages.hobby.retrieved, hobbies);
    } catch (error) {
        loggerService.error(`Error getting all hobbies: ${error}`);
        sendServerErrorResponse(res, responseMessages.hobby.failedToFetch, error);
        next(error);
    }
};

/** GET API: Get all hobbies with pagination and search query. */
export const getAllHobbiesPaginated = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit, search } = req.query;

        const hobbies = await hobbyService.getAllHobbiesPaginated(Number(page), Number(limit), search as string);
        if (!hobbies.data.length) {
            return sendSuccessResponse(res, responseMessages.hobby.notFound, hobbies);
        }

        return sendSuccessResponse(res, responseMessages.hobby.retrieved, hobbies);
    } catch (error) {
        loggerService.error(`Error getting all hobbies paginated: ${error}`);
        sendServerErrorResponse(res, responseMessages.hobby.failedToFetch, error);
        next(error);
    }
};

/** GET API: Get a hobby by id. */
export const getHobbyById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const hobby = await hobbyService.getHobbyById(id);
        if (!hobby) {
            return sendNotFoundResponse(res, responseMessages.hobby.notFoundSingle);
        }

        return sendSuccessResponse(res, responseMessages.hobby.retrievedSingle, hobby);
    } catch (error) {
        loggerService.error(`Error getting hobby: ${error}`);
        sendServerErrorResponse(res, responseMessages.hobby.failedToFetchSingle, error);
        next(error);
    }
};

/** POST API: Create a new hobby. */
export const createHobby = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { user } = res.locals.auth;

        const existingHobby = await hobbyService.getHobbyByName(req.body.name);
        if (existingHobby) {
            await transaction.rollback();
            return sendConflictErrorResponse(res, responseMessages.hobby.alreadyExists);
        }

        const hobby = await hobbyService.createHobby(req.body, user.id, transaction);
        if (!hobby) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.hobby.failedToCreate);
        }

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.hobby.created, hobby);
    } catch (error) {
        loggerService.error(`Error creating hobby: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.hobby.failedToCreate, error);
        next(error);
    }
};

/** PUT API: Update a hobby. */
export const updateHobby = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { user } = res.locals.auth;

        const hobby = await hobbyService.getHobbyById(id, transaction);
        if (!hobby) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.hobby.notFoundSingle);
        }

        const existingHobby = await hobbyService.getHobbyByName(req.body.name, id);
        if (existingHobby) {
            await transaction.rollback();
            return sendConflictErrorResponse(res, responseMessages.hobby.alreadyExists);
        }

        await hobbyService.updateHobby(id, req.body, user.id, transaction);

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.hobby.updated);
    } catch (error) {
        loggerService.error(`Error updating hobby: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.hobby.failedToUpdate, error);
        next(error);
    }
};

/** DELETE API: Delete a hobby. */
export const deleteHobby = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { user } = res.locals.auth;

        const hobby = await hobbyService.getHobbyById(id, transaction);
        if (!hobby) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.hobby.notFoundSingle);
        }

        await hobbyService.deleteHobby(id, user.id, transaction);

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.hobby.deleted);
    } catch (error) {
        loggerService.error(`Error deleting hobby: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.hobby.failedToDelete, error);
        next(error);
    }
};
