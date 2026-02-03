import { NextFunction, Request, Response } from 'express';
import feedReportService from '../services/feed-report.service';
import feedService from '../services/feed.service';
import { sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse, sendUnauthorizedResponse, sendBadRequestResponse } from '../utils/response.service';
import { responseMessages } from '../utils/response-message.service';
import loggerService from '../utils/logger.service';
import { sequelize } from '../server';

export const createReport = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUser = res.locals.auth?.user;
        const { feed_id, reason_id, reason } = req.body;

        // Check if feed exists
        const feed = await feedService.getFeedById(feed_id, authenticatedUser.id, false);
        if (!feed) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.feed.notFound);
        }

        const created = await feedReportService.create({
            feed_id,
            user_id: authenticatedUser.id,
            reason_id: reason_id || null,
            reason: reason || null,
            created_by: authenticatedUser.id,
        }, transaction);

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.feedReported.created, { content: created });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error creating feed report: ${error}`);
        sendServerErrorResponse(res, responseMessages.feedReported.failedToCreate, error);
        next(error);
    }
};

export const updateReport = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUser = res.locals.auth?.user;
        const { id } = req.params;
        const { reason_id, reason } = req.body;

        const existing = await feedReportService.findById(id as string);
        if (!existing) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.feedReported.notFound);
        }

        // Only owner or admin can update
        if (existing.user_id !== authenticatedUser.id && !authenticatedUser.is_admin) {
            await transaction.rollback();
            return sendUnauthorizedResponse(res, responseMessages.feedReported.forbidden);
        }

        const updated = await feedReportService.update(id as string, {
            reason_id: reason_id || null,
            reason: reason || null,
            updated_by: authenticatedUser.id,
        }, transaction);

        if (!updated) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.feedReported.notFound);
        }

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.feedReported.updated, { content: updated });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error updating feed report: ${error}`);
        sendServerErrorResponse(res, responseMessages.feedReported.failedToUpdate, error);
        next(error);
    }
};

export const deleteReport = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUser = res.locals.auth?.user;
        const { id } = req.params;

        const existing = await feedReportService.findById(id as string);
        if (!existing) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.feedReported.notFound);
        }

        // Only owner or admin can delete
        if (existing.user_id !== authenticatedUser.id && !authenticatedUser.is_admin) {
            await transaction.rollback();
            return sendUnauthorizedResponse(res, responseMessages.feedReported.forbidden);
        }

        const deleted = await feedReportService.softDelete(id as string, authenticatedUser.id, transaction);
        if (!deleted) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.feedReported.notFound);
        }

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.feedReported.deleted, { content: true });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error deleting feed report: ${error}`);
        sendServerErrorResponse(res, responseMessages.feedReported.failedToDelete, error);
        next(error);
    }
};

export const getReportById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const report = await feedReportService.findById(id as string);
        if (!report) {
            return sendNotFoundResponse(res, responseMessages.feedReported.notFound);
        }
        return sendSuccessResponse(res, responseMessages.feedReported.retrieved, { content: report });
    } catch (error) {
        loggerService.error(`Error getting feed report: ${error}`);
        sendServerErrorResponse(res, responseMessages.feedReported.failedToFetchSingle, error);
        next(error);
    }
};

export const getAllReportByFeedAndUserId = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { feed_id, user_id } = req.query as { feed_id?: string; user_id?: string };
        const reports = await feedReportService.getAllReport(feed_id, user_id);
        return sendSuccessResponse(res, responseMessages.feedReported.retrieved, { content: reports, count: reports.length });
    } catch (error) {
        loggerService.error(`Error listing feed reports: ${error}`);
        sendServerErrorResponse(res, responseMessages.feedReported.failedToFetch, error);
        next(error);
    }
};

export const getReportsByFeed = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { feedId } = req.params;
        const reports = await feedReportService.findByFeedId(feedId as string);
        return sendSuccessResponse(res, responseMessages.feedReported.retrieved, { content: reports, count: reports.length });
    } catch (error) {
        loggerService.error(`Error getting feed reports by feed: ${error}`);
        sendServerErrorResponse(res, responseMessages.feedReported.failedToFetchSingle, error);
        next(error);
    }
};

export const getReportsByUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.params.userId || res.locals.auth?.user?.id;
        const reports = await feedReportService.findByUserId(userId);
        return sendSuccessResponse(res, responseMessages.feedReported.retrieved, { content: reports, count: reports.length });
    } catch (error) {
        loggerService.error(`Error getting feed reports by user: ${error}`);
        sendServerErrorResponse(res, responseMessages.feedReported.failedToFetchSingle, error);
        next(error);
    }
};

export const getMyReports = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const authenticatedUser = res.locals.auth?.user;
        
        const reports = await feedReportService.findByUserId(authenticatedUser.id);
        return sendSuccessResponse(res, responseMessages.feedReported.retrieved, { content: reports, count: reports.length });
    } catch (error) {
        loggerService.error(`Error getting my feed reports: ${error}`);
        sendServerErrorResponse(res, responseMessages.feedReported.failedToFetchSingle, error);
        next(error);
    }
};

