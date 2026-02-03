import { NextFunction, Request, Response } from 'express';
import commentReportService from '../services/comment-report.service';
import feedCommentService from '../services/feed-comment.service';
import { sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse, sendUnauthorizedResponse, sendBadRequestResponse } from '../utils/response.service';
import { responseMessages } from '../utils/response-message.service';
import loggerService from '../utils/logger.service';
import { sequelize } from '../server';

export const createCommentReport = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUser = res.locals.auth?.user;
        const { comment_id, reason_id, reason } = req.body;

        // Check if comment exists
        const comment = await feedCommentService.findById(comment_id);
        if (!comment) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.feedCommented.notFound);
        }

        const created = await commentReportService.createReport({
            comment_id,
            user_id: authenticatedUser.id,
            reason_id: reason_id || null,
            reason: reason || null,
            created_by: authenticatedUser.id,
        }, transaction);

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.commentReported.created, { content: created });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error creating comment report: ${error}`);
        sendServerErrorResponse(res, responseMessages.commentReported.failedToCreate, error);
        next(error);
    }
};

export const updateCommentReport = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUser = res.locals.auth?.user;
        const { id } = req.params;
        const { reason_id, reason } = req.body;

        const existing = await commentReportService.findById(id as string);
        if (!existing) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.commentReported.notFound);
        }

        // Only owner or admin can update
        if (existing.user_id !== authenticatedUser.id && !authenticatedUser.is_admin) {
            await transaction.rollback();
            return sendUnauthorizedResponse(res, responseMessages.commentReported.forbidden);
        }

        const updated = await commentReportService.updateReport(id as string, {
            reason_id: reason_id || null,
            reason: reason || null,
            updated_by: authenticatedUser.id,
        }, transaction);

        if (!updated) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.commentReported.notFound);
        }

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.commentReported.updated, { content: updated });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error updating comment report: ${error}`);
        sendServerErrorResponse(res, responseMessages.commentReported.failedToUpdate, error);
        next(error);
    }
};

export const deleteCommentReport = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUser = res.locals.auth?.user;
        const { id } = req.params;

        const existing = await commentReportService.findById(id as string);
        if (!existing) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.commentReported.notFound);
        }

        // Only owner or admin can delete
        if (existing.user_id !== authenticatedUser.id && !authenticatedUser.is_admin) {
            await transaction.rollback();
            return sendUnauthorizedResponse(res, responseMessages.commentReported.forbidden);
        }

        const deleted = await commentReportService.deleteReport(id as string, authenticatedUser.id, transaction);
        if (!deleted) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.commentReported.notFound);
        }

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.commentReported.deleted, { content: true });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error deleting comment report: ${error}`);
        sendServerErrorResponse(res, responseMessages.commentReported.failedToDelete, error);
        next(error);
    }
};

export const getCommentReportById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const report = await commentReportService.findById(id as string);

        if (!report) {
            return sendNotFoundResponse(res, responseMessages.commentReported.notFound);
        }
        return sendSuccessResponse(res, responseMessages.commentReported.retrieved, { content: report });
    } catch (error) {
        loggerService.error(`Error getting comment report: ${error}`);
        sendServerErrorResponse(res, responseMessages.commentReported.failedToFetch, error);
        next(error);
    }
};

export const getAllCommentReports = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { comment_id, user_id } = req.query as { comment_id?: string; user_id?: string };

        const reports = await commentReportService.getAllCommentReport(comment_id, user_id);
        return sendSuccessResponse(res, responseMessages.commentReported.retrieved, { content: reports, count: reports.length });
    } catch (error) {
        loggerService.error(`Error listing comment reports: ${error}`);
        sendServerErrorResponse(res, responseMessages.commentReported.failedToFetch, error);
        next(error);
    }
};

export const getReportsByComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { commentId } = req.params;

        const reports = await commentReportService.findByCommentId(commentId as string);
        return sendSuccessResponse(res, responseMessages.commentReported.retrieved, { content: reports, count: reports.length });
    } catch (error) {
        loggerService.error(`Error getting comment reports by comment: ${error}`);
        sendServerErrorResponse(res, responseMessages.commentReported.failedToFetch, error);
        next(error);
    }
};

export const getReportsByUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.params.userId || res.locals.auth?.user?.id;

        const reports = await commentReportService.findByUserId(userId);
        return sendSuccessResponse(res, responseMessages.commentReported.retrieved, { content: reports, count: reports.length });
    } catch (error) {
        loggerService.error(`Error getting comment reports by user: ${error}`);
        sendServerErrorResponse(res, responseMessages.commentReported.failedToFetch, error);
        next(error);
    }
};

export const getMyReports = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const authenticatedUser = res.locals.auth?.user;
        const reports = await commentReportService.findByUserId(authenticatedUser.id);
        return sendSuccessResponse(res, responseMessages.commentReported.retrieved, { content: reports, count: reports.length });
    } catch (error) {
        loggerService.error(`Error getting my comment reports: ${error}`);
        sendServerErrorResponse(res, responseMessages.commentReported.failedToFetch, error);
        next(error);
    }
};

