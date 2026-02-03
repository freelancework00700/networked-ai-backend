import { NextFunction, Request, Response } from 'express';
import { sequelize } from '../server';
import interestService from '../services/interest.service';
import loggerService from '../utils/logger.service';
import { responseMessages } from '../utils/response-message.service';
import {
    sendBadRequestResponse,
    sendConflictErrorResponse,
    sendNotFoundResponse,
    sendServerErrorResponse,
    sendSuccessResponse
} from '../utils/response.service';

/** GET API: Get all interests with search query. */
export const getAllInterests = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { search } = req.query;

        const interests = await interestService.getAllInterests(search as string);
        if (!interests.length) {
            return sendSuccessResponse(res, responseMessages.interest.notFound, interests);
        }

        return sendSuccessResponse(res, responseMessages.interest.retrieved, interests);
    } catch (error) {
        loggerService.error(`Error getting all interests: ${error}`);
        sendServerErrorResponse(res, responseMessages.interest.failedToFetch, error);
        next(error);
    }
};

/** GET API: Get all interests with pagination and search query. */
export const getAllInterestsPaginated = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit, search } = req.query;

        const interests = await interestService.getAllInterestsPaginated(Number(page), Number(limit), search as string);
        if (!interests.data.length) {
            return sendSuccessResponse(res, responseMessages.interest.notFound, interests);
        }

        return sendSuccessResponse(res, responseMessages.interest.retrieved, interests);
    } catch (error) {
        loggerService.error(`Error getting all interests paginated: ${error}`);
        sendServerErrorResponse(res, responseMessages.interest.failedToFetch, error);
        next(error);
    }
};

/** GET API: Get an interest by id. */
export const getInterestById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const interest = await interestService.getInterestById(id);
        if (!interest) {
            return sendNotFoundResponse(res, responseMessages.interest.notFoundSingle);
        }

        return sendSuccessResponse(res, responseMessages.interest.retrievedSingle, interest);
    } catch (error) {
        loggerService.error(`Error getting interest: ${error}`);
        sendServerErrorResponse(res, responseMessages.interest.failedToFetchSingle, error);
        next(error);
    }
};

/** POST API: Create a new interest. */
export const createInterest = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { user } = res.locals.auth;

        const existingInterest = await interestService.getInterestByName(req.body.name);
        if (existingInterest) {
            await transaction.rollback();
            return sendConflictErrorResponse(res, responseMessages.interest.alreadyExists);
        }

        const interest = await interestService.createInterest(req.body, user.id, transaction);
        if (!interest) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.interest.failedToCreate);
        }

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.interest.created, interest);
    } catch (error) {
        loggerService.error(`Error creating interest: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.interest.failedToCreate, error);
        next(error);
    }
};

/** PUT API: Update an interest. */
export const updateInterest = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { user } = res.locals.auth;

        const interest = await interestService.getInterestById(id, transaction);
        if (!interest) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.interest.notFoundSingle);
        }

        const existingInterest = await interestService.getInterestByName(req.body.name, id);
        if (existingInterest) {
            await transaction.rollback();
            return sendConflictErrorResponse(res, responseMessages.interest.alreadyExists);
        }

        await interestService.updateInterest(id, req.body, user.id, transaction);

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.interest.updated);
    } catch (error) {
        loggerService.error(`Error updating interest: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.interest.failedToUpdate, error);
        next(error);
    }
};

/** DELETE API: Delete an interest. */
export const deleteInterest = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { user } = res.locals.auth;

        const interest = await interestService.getInterestById(id, transaction);
        if (!interest) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.interest.notFoundSingle);
        }

        await interestService.deleteInterest(id, user.id, transaction);

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.interest.deleted);
    } catch (error) {
        loggerService.error(`Error deleting interest: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.interest.failedToDelete, error);
        next(error);
    }
};
