import { NextFunction, Request, Response } from 'express';
import { sequelize } from '../server';
import gamificationCategoryService from '../services/gamification-category.service';
import loggerService from '../utils/logger.service';
import { responseMessages } from '../utils/response-message.service';
import {
    sendBadRequestResponse,
    sendConflictErrorResponse,
    sendNotFoundResponse,
    sendServerErrorResponse,
    sendSuccessResponse
} from '../utils/response.service';

/** GET API: Get all gamification categories with search query. */
export const getAllGamificationCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { search } = req.query;

        const categories = await gamificationCategoryService.getAllGamificationCategories(search as string);
        if (!categories.length) {
            return sendSuccessResponse(res, responseMessages.gamificationCategory.notFound, categories);
        }

        return sendSuccessResponse(res, responseMessages.gamificationCategory.retrieved, categories);
    } catch (error) {
        loggerService.error(`Error getting all gamification categories: ${error}`);
        sendServerErrorResponse(res, responseMessages.gamificationCategory.failedToFetch, error);
        next(error);
    }
};

/** GET API: Get all gamification categories with pagination and search query. */
export const getAllGamificationCategoriesPaginated = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit, search } = req.query;

        const categories = await gamificationCategoryService.getAllGamificationCategoriesPaginated(Number(page), Number(limit), search as string);
        if (!categories.data.length) {
            return sendSuccessResponse(res, responseMessages.gamificationCategory.notFound, categories);
        }

        return sendSuccessResponse(res, responseMessages.gamificationCategory.retrieved, categories);
    } catch (error) {
        loggerService.error(`Error getting all gamification categories paginated: ${error}`);
        sendServerErrorResponse(res, responseMessages.gamificationCategory.failedToFetch, error);
        next(error);
    }
};

/** GET API: Get a gamification category by id. */
export const getGamificationCategoryById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const category = await gamificationCategoryService.getGamificationCategoryById(id as string);
        if (!category) {
            return sendNotFoundResponse(res, responseMessages.gamificationCategory.notFoundSingle);
        }

        return sendSuccessResponse(res, responseMessages.gamificationCategory.retrievedSingle, category);
    } catch (error) {
        loggerService.error(`Error getting gamification category: ${error}`);
        sendServerErrorResponse(res, responseMessages.gamificationCategory.failedToFetchSingle, error);
        next(error);
    }
};

/** POST API: Create a new gamification category. */
export const createGamificationCategory = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { user } = res.locals.auth;

        const existingCategory = await gamificationCategoryService.getGamificationCategoryByName(req.body.category_name);
        if (existingCategory) {
            await transaction.rollback();
            return sendConflictErrorResponse(res, responseMessages.gamificationCategory.alreadyExists);
        }

        const category = await gamificationCategoryService.createGamificationCategory(req.body, user.id, transaction);
        if (!category) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.gamificationCategory.failedToCreate);
        }

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.gamificationCategory.created, category);
    } catch (error) {
        loggerService.error(`Error creating gamification category: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.gamificationCategory.failedToCreate, error);
        next(error);
    }
};

/** PUT API: Update a gamification category. */
export const updateGamificationCategory = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { user } = res.locals.auth;

        const category = await gamificationCategoryService.getGamificationCategoryById(id as string, transaction);
        if (!category) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.gamificationCategory.notFoundSingle);
        }

        if (req.body.category_name) {
            const existingCategory = await gamificationCategoryService.getGamificationCategoryByName(req.body.category_name, id as string);
            if (existingCategory) {
                await transaction.rollback();
                return sendConflictErrorResponse(res, responseMessages.gamificationCategory.alreadyExists);
            }
        }

        await gamificationCategoryService.updateGamificationCategory(id as string, req.body, user.id, transaction);

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.gamificationCategory.updated);
    } catch (error) {
        loggerService.error(`Error updating gamification category: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.gamificationCategory.failedToUpdate, error);
        next(error);
    }
};

/** DELETE API: Delete a gamification category. */
export const deleteGamificationCategory = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { user } = res.locals.auth;

        const category = await gamificationCategoryService.getGamificationCategoryById(id as string, transaction);
        if (!category) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.gamificationCategory.notFoundSingle);
        }

        await gamificationCategoryService.deleteGamificationCategory(id as string, user.id, transaction);

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.gamificationCategory.deleted);
    } catch (error) {
        loggerService.error(`Error deleting gamification category: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.gamificationCategory.failedToDelete, error);
        next(error);
    }
};

