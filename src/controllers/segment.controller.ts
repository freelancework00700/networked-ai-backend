import { sequelize } from '../server';
import loggerService from '../utils/logger.service';
import segmentService from '../services/segment.service';
import { NextFunction, Request, Response } from 'express';
import { responseMessages } from '../utils/response-message.service';
import { sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse } from '../utils/response.service';

export const getAllSegments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = res.locals.auth?.user?.id;
        const { page, limit, search, order_by, order_direction } = req.query;

        const result = await segmentService.getAllSegmentsPaginated(userId, {
            page: Number(page) || 1,
            limit: Number(limit) || 10,
            search: (search as string) || '',
            order_by: (order_by as string) || 'created_at',
            order_direction: (order_direction as string) === 'ASC' ? 'ASC' : 'DESC',
        });
        return sendSuccessResponse(res, responseMessages.segment.retrieved, result);
    } catch (error) {
        loggerService.error(`Error getting segments: ${error}`);
        sendServerErrorResponse(res, responseMessages.segment.failedToFetch, error);
        next(error);
    }
};

export const getSegmentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = res.locals.auth?.user?.id;
        const segment = await segmentService.getSegmentById(req.params.id, userId);
        if (!segment) return sendNotFoundResponse(res, responseMessages.segment.notFoundSingle);
        return sendSuccessResponse(res, responseMessages.segment.retrievedSingle, segment);
    } catch (error) {
        loggerService.error(`Error getting segment: ${error}`);
        sendServerErrorResponse(res, responseMessages.segment.failedToFetch, error);
        next(error);
    }
};

export const createSegment = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const userId = res.locals.auth?.user?.id;
        const segment = await segmentService.createSegment(req.body, userId, transaction);
        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.segment.created, segment);
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error creating segment: ${error}`);
        sendServerErrorResponse(res, responseMessages.segment.failedToCreate, error);
        next(error);
    }
};

export const updateSegment = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const userId = res.locals.auth?.user?.id;
        const segment = await segmentService.getSegmentById(req.params.id, userId, transaction);
        if (!segment) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.segment.notFoundSingle);
        }
        await segmentService.updateSegment(req.params.id, req.body, userId, transaction);
        await transaction.commit();
        const updated = await segmentService.getSegmentById(req.params.id, userId);
        return sendSuccessResponse(res, responseMessages.segment.updated, updated);
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error updating segment: ${error}`);
        sendServerErrorResponse(res, responseMessages.segment.failedToUpdate, error);
        next(error);
    }
};

export const deleteSegment = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const userId = res.locals.auth?.user?.id;
        const segment = await segmentService.getSegmentById(req.params.id, userId, transaction);
        if (!segment) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.segment.notFoundSingle);
        }
        await segmentService.deleteSegment(req.params.id, userId, transaction);
        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.segment.deleted, { id: req.params.id });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error deleting segment: ${error}`);
        sendServerErrorResponse(res, responseMessages.segment.failedToDelete, error);
        next(error);
    }
};

export const getSegmentCustomers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = res.locals.auth?.user?.id;
        if (!userId) return sendNotFoundResponse(res, responseMessages.segment.notFoundSingle);
        const { id } = req.params;
        const { page, limit, search, order_by, order_direction } = req.query;
        const result = await segmentService.getSegmentCustomersPaginated(id, userId, {
            page: Number(page) || 1,
            limit: Number(limit) || 10,
            search: (search as string) || '',
            order_by: (order_by as string) || 'name',
            order_direction: (order_direction as string) === 'ASC' ? 'ASC' : 'DESC',
        });
        return sendSuccessResponse(res, responseMessages.customer.retrieved, result);
    } catch (error) {
        loggerService.error(`Error getting segment customers: ${error}`);
        sendServerErrorResponse(res, responseMessages.segment.failedToFetch, error);
        next(error);
    }
};
