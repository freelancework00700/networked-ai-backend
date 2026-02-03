import { NextFunction, Request, Response } from 'express';
import { sequelize } from '../server';
import reportReasonService from '../services/report-reason.service';
import loggerService from '../utils/logger.service';
import { responseMessages } from '../utils/response-message.service';
import { sendBadRequestResponse, sendConflictErrorResponse, sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse } from '../utils/response.service';

/** GET API: Get all report reasons with search query. */
export const getAllReportReasons = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { search } = req.query;

        const reportReasons = await reportReasonService.getAllReportReasons(search as string);
        if(!reportReasons.length) {
            return sendSuccessResponse(res, responseMessages.reportReason.notFound, reportReasons);
        }

        return sendSuccessResponse(res, responseMessages.reportReason.retrieved, reportReasons);
    } catch (error) {
        loggerService.error(`Error getting all report reasons: ${error}`);
        sendServerErrorResponse(res, responseMessages.reportReason.failedToFetch, error);
        next(error);
    }
};

/** GET API: Get all report reasons with pagination and search query. */
export const getAllReportReasonsPaginated = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit, search } = req.query;

        const reportReasons = await reportReasonService.getAllReportReasonsPaginated(Number(page), Number(limit), search as string);
        if(!reportReasons.data.length) {
            return sendSuccessResponse(res, responseMessages.reportReason.notFound, reportReasons);
        }

        return sendSuccessResponse(res, responseMessages.reportReason.retrieved, reportReasons);
    } catch (error) {
        loggerService.error(`Error getting all report reasons paginated: ${error}`);
        sendServerErrorResponse(res, responseMessages.reportReason.failedToFetch, error);
        next(error);
    }
};

/** GET API: Get a report reason by id. */
export const getReportReasonById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const reportReason = await reportReasonService.getReportReasonById(id as string);
        if (!reportReason) {
            return sendNotFoundResponse(res, responseMessages.reportReason.notFoundSingle);
        }

        return sendSuccessResponse(res, responseMessages.reportReason.retrievedSingle, reportReason);
    } catch (error) {
        loggerService.error(`Error getting report reason: ${error}`);
        sendServerErrorResponse(res, responseMessages.reportReason.failedToFetchSingle, error);
        next(error);
    }
};

/** POST API: Create a new report reason. */
export const createReportReason = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { user } = res.locals.auth;

        const existingReportReason = await reportReasonService.getReportReasonByReason(req.body.reason);
        if (existingReportReason) {
            await transaction.rollback();
            return sendConflictErrorResponse(res, responseMessages.reportReason.alreadyExists);
        }

        const reportReason = await reportReasonService.createReportReason(req.body, user.id, transaction);
        if (!reportReason) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.reportReason.failedToCreate);
        }

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.reportReason.created, reportReason);
    } catch (error) {
        loggerService.error(`Error creating report reason: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.reportReason.failedToCreate, error);
        next(error);
    }
};

/** PUT API: Update a report reason. */
export const updateReportReason = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { user } = res.locals.auth;

        const reportReason = await reportReasonService.getReportReasonById(id as string);
        if (!reportReason) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.reportReason.notFoundSingle);
        }

        if (req.body.reason) {
            const existingReportReason = await reportReasonService.getReportReasonByReason(req.body.reason, id as string);
            if (existingReportReason) {
                await transaction.rollback();
                return sendConflictErrorResponse(res, responseMessages.reportReason.alreadyExists);
            }
        }

        await reportReasonService.updateReportReason(id as string, req.body, user.id, transaction);

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.reportReason.updated);
    } catch (error) {
        loggerService.error(`Error updating report reason: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.reportReason.failedToUpdate, error);
        next(error);
    }
};

/** DELETE API: Delete a report reason. */
export const deleteReportReason = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { user } = res.locals.auth;

        const reportReason = await reportReasonService.getReportReasonById(id as string);
        if (!reportReason) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.reportReason.notFoundSingle);
        }

        await reportReasonService.deleteReportReason(id as string, user.id, transaction);

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.reportReason.deleted);
    } catch (error) {
        loggerService.error(`Error deleting report reason: ${error}`);
        await transaction.rollback();
        sendServerErrorResponse(res, responseMessages.reportReason.failedToDelete, error);
        next(error);
    }
};
