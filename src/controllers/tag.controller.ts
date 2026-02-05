import { sequelize } from '../server';
import tagService from '../services/tag.service';
import loggerService from '../utils/logger.service';
import { NextFunction, Request, Response } from 'express';
import { isNetworkTagForUser } from '../utils/tag.constants';
import { responseMessages } from '../utils/response-message.service';
import { sendBadRequestResponse, sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse } from '../utils/response.service';

export const getAllTags = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = res.locals.auth?.user?.id;
        const { page, limit, search, order_by, order_direction, exclude_system_tag } = req.query;

        const result = await tagService.getAllTagsPaginated(userId, {
            page: Number(page) || 1,
            limit: Number(limit) || 10,
            search: (search as string) || '',
            order_by: (order_by as string) || 'created_at',
            excludeSystemTag: exclude_system_tag !== 'false',
            order_direction: (order_direction as string) === 'ASC' ? 'ASC' : 'DESC',
        });
        return sendSuccessResponse(res, responseMessages.tag.retrieved, result);
    } catch (error) {
        loggerService.error(`Error getting tags: ${error}`);
        sendServerErrorResponse(res, responseMessages.tag.failedToFetch, error);
        next(error);
    }
};

export const getTagById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = res.locals.auth?.user?.id;
        const tag = await tagService.getTagById(req.params.id as string, userId);
        if (!tag) return sendNotFoundResponse(res, responseMessages.tag.notFoundSingle);
        return sendSuccessResponse(res, responseMessages.tag.retrievedSingle, tag);
    } catch (error) {
        loggerService.error(`Error getting tag: ${error}`);
        sendServerErrorResponse(res, responseMessages.tag.failedToFetch, error);
        next(error);
    }
};

export const createTag = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const userId = res.locals.auth?.user?.id;
        const tag = await tagService.createTag(req.body, userId, transaction);
        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.tag.created, tag);
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error creating tag: ${error}`);
        sendServerErrorResponse(res, responseMessages.tag.failedToCreate, error);
        next(error);
    }
};

export const updateTag = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const tagId = req.params.id as string;
        const userId = res.locals.auth?.user?.id;
        const isHostedEvent = await tagService.isHostedEventByUser(tagId, userId);

        // can't update network tag (id === userId) or hosted event tag (id === eventId)
        if (isNetworkTagForUser(tagId, userId) || isHostedEvent) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.tag.systemTagNotEditable);
        }

        // check if tag exists
        const tag = await tagService.getTagById(tagId, userId, transaction);
        if (!tag) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.tag.notFoundSingle);
        }

        // update tag
        await tagService.updateTag(tagId, req.body, userId, transaction);
        await transaction.commit();

        // get updated tag
        const updated = await tagService.getTagById(tagId, userId);
        return sendSuccessResponse(res, responseMessages.tag.updated, updated);
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error updating tag: ${error}`);
        sendServerErrorResponse(res, responseMessages.tag.failedToUpdate, error);
        next(error);
    }
};

export const deleteTag = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const tagId = req.params.id as string;
        const userId = res.locals.auth?.user?.id;
        const isHostedEvent = await tagService.isHostedEventByUser(tagId, userId);

        // can't delete network tag (id === userId) or hosted event tag (id === eventId)
        if (isNetworkTagForUser(tagId, userId) || isHostedEvent) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.tag.systemTagNotDeletable);
        }

        // check if tag exists
        const tag = await tagService.getTagById(tagId, userId, transaction);
        if (!tag) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.tag.notFoundSingle);
        }

        // delete tag
        await tagService.deleteTag(tagId, transaction);
        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.tag.deleted, { id: req.params.id });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error deleting tag: ${error}`);
        sendServerErrorResponse(res, responseMessages.tag.failedToDelete, error);
        next(error);
    }
};

export const getTagCustomers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const userId = res.locals.auth?.user?.id;
        const { page, limit, search, order_by, order_direction } = req.query;

        const result = await tagService.getTagCustomersPaginated(id as string, userId, {
            page: Number(page) || 1,
            limit: Number(limit) || 10,
            search: (search as string) || '',
            order_by: (order_by as string) || 'created_at',
            order_direction: (order_direction as string) === 'ASC' ? 'ASC' : 'DESC',
        });
        return sendSuccessResponse(res, responseMessages.customer.retrieved, result);
    } catch (error) {
        loggerService.error(`Error getting tag customers: ${error}`);
        sendServerErrorResponse(res, responseMessages.tag.failedToFetch, error);
        next(error);
    }
};
