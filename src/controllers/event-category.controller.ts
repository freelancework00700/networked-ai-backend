import { NextFunction, Request, Response } from 'express';
import { sequelize } from '../server';
import eventCategoryService from '../services/event-category.service';
import loggerService from '../utils/logger.service';
import { responseMessages } from '../utils/response-message.service';
import { sendBadRequestResponse, sendConflictErrorResponse, sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse } from '../utils/response.service';

/** GET API: Get all event categories with search query. */
export const getAllEventCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { search } = req.query;

        const eventCategories = await eventCategoryService.getAllEventCategories(search as string);
        if(!eventCategories.length) {
            return sendSuccessResponse(res, responseMessages.eventCategory.notFound, eventCategories);
        }

        return sendSuccessResponse(res, responseMessages.eventCategory.retrieved, eventCategories);
    } catch (error) {
        loggerService.error(`Error getting all event categories: ${error}`);
        sendServerErrorResponse(res, responseMessages.eventCategory.failedToFetch, error);
        next(error);
    }
};

/** GET API: Get all event categories with pagination and search query. */
export const getAllEventCategoriesPaginated = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit, search } = req.query;

        const eventCategories = await eventCategoryService.getAllEventCategoriesPaginated(Number(page), Number(limit), search as string);
        if(!eventCategories.data.length) {
            return sendSuccessResponse(res, responseMessages.eventCategory.notFound, eventCategories);
        }

        return sendSuccessResponse(res, responseMessages.eventCategory.retrieved, eventCategories);
    } catch (error) {
        loggerService.error(`Error getting all event categories paginated: ${error}`);
        sendServerErrorResponse(res, responseMessages.eventCategory.failedToFetch, error);
        next(error);
    }
};

/** GET API: Get an event category by id. */
export const getEventCategoryById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const eventCategory = await eventCategoryService.getEventCategoryById(id);
        if (!eventCategory) {
            return sendNotFoundResponse(res, responseMessages.eventCategory.notFoundSingle);
        }

        return sendSuccessResponse(res, responseMessages.eventCategory.retrievedSingle, eventCategory);
    } catch (error) {
        loggerService.error(`Error getting event category: ${error}`);
        sendServerErrorResponse(res, responseMessages.eventCategory.failedToFetchSingle, error);
        next(error);
    }
};

/** POST API: Create a new event category. */
export const createEventCategory = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { user } = res.locals.auth;

        const existingEventCategory = await eventCategoryService.getEventCategoryByName(req.body.name);
        if (existingEventCategory) {
            await transaction.rollback();
            return sendConflictErrorResponse(res, responseMessages.eventCategory.alreadyExists);
        }

        const eventCategory = await eventCategoryService.createEventCategory(req.body, user.id, transaction);
        if (!eventCategory) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.eventCategory.failedToCreate);
        }

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.eventCategory.created, eventCategory);
    } catch (error) {
        loggerService.error(`Error creating event category: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.eventCategory.failedToCreate, error);
        next(error);
    }
};

/** PUT API: Update an event category. */
export const updateEventCategory = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { user } = res.locals.auth;

        const eventCategory = await eventCategoryService.getEventCategoryById(id);
        if (!eventCategory) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.eventCategory.notFoundSingle);
        }

        const existingEventCategory = await eventCategoryService.getEventCategoryByName(req.body.name, id);
        if (existingEventCategory) {
            await transaction.rollback();
            return sendConflictErrorResponse(res, responseMessages.eventCategory.alreadyExists);
        }

        await eventCategoryService.updateEventCategory(id, req.body, user.id, transaction);

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.eventCategory.updated);
    } catch (error) {
        loggerService.error(`Error updating event category: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.eventCategory.failedToUpdate, error);
        next(error);
    }
};

/** DELETE API: Delete an event category. */
export const deleteEventCategory = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { user } = res.locals.auth;

        const eventCategory = await eventCategoryService.getEventCategoryById(id);
        if (!eventCategory) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.eventCategory.notFoundSingle);
        }

        await eventCategoryService.deleteEventCategory(id, user.id, transaction);

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.eventCategory.deleted);
    } catch (error) {
        loggerService.error(`Error deleting event category: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.eventCategory.failedToDelete, error);
        next(error);
    }
};
