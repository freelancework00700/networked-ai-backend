import tagService from '../services/tag.service';
import loggerService from '../utils/logger.service';
import emailService from '../services/email.service';
import segmentService from '../services/segment.service';
import { NextFunction, Request, Response } from 'express';
import { responseMessages } from '../utils/response-message.service';
import { sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse } from '../utils/response.service';

/** POST /emails - Send email to customers from tag_ids and/or segment_ids (and optional bcc). */
export const sendEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = res.locals.auth?.user?.id;
        const { type, html, from, subject, bcc, is_all_tag, is_all_segment, tag_ids, segment_ids } = req.body;

        const finalTagIds = is_all_tag === true ? await tagService.getAssignableTagIdsForUser(userId) : (Array.isArray(tag_ids) ? tag_ids : []);
        const finalSegmentIds = is_all_segment === true ? await segmentService.getSegmentIdsForUser(userId) : (Array.isArray(segment_ids) ? segment_ids : []);

        const safeSenderName = String(from || 'Networked AI').trim().replace(/"/g, '') || 'Networked AI';
        const fromHeader = `"${safeSenderName}" <do-not-reply@net-worked.ai>`;

        await emailService.sendEmailByTagsAndSegments(
            { 
                bcc, 
                type, 
                html, 
                subject, 
                from: fromHeader,
                tag_ids: finalTagIds, 
                segment_ids: finalSegmentIds
            },
            userId
        );
        return sendSuccessResponse(res, responseMessages.email.sent);
    } catch (error) {
        loggerService.error(`Error sending email: ${error}`);
        sendServerErrorResponse(res, responseMessages.email.failedToSend, error);
        next(error);
    }
};

export const getAllEmails = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = res.locals.auth?.user?.id;
        const { page, limit, search, order_by = "created_at", order_direction = "DESC", date_from, date_to } = req.query;

        const result = await emailService.getAllEmailsPaginated(userId, {
            page: Number(page) || 1,
            limit: Number(limit) || 10,
            search: (search as string) || '',
            order_by: (order_by as string) as any,
            date_to: (date_to as string) || undefined,
            date_from: (date_from as string) || undefined,
            order_direction: (order_direction as string) === 'ASC' ? 'ASC' : 'DESC',
        });

        return sendSuccessResponse(res, responseMessages.email.retrieved, result);
    } catch (error) {
        loggerService.error(`Error getting emails: ${error}`);
        sendServerErrorResponse(res, responseMessages.email.failedToFetch, error);
        next(error);
    }
};

export const getEmailById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = res.locals.auth?.user?.id;

        const email = await emailService.getEmailById(req.params.id as string, userId);
        if (!email) return sendNotFoundResponse(res, responseMessages.email.notFoundSingle);

        return sendSuccessResponse(res, responseMessages.email.retrievedSingle, email);
    } catch (error) {
        loggerService.error(`Error getting email: ${error}`);
        sendServerErrorResponse(res, responseMessages.email.failedToFetch, error);
        next(error);
    }
};

export const deleteEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = res.locals.auth?.user?.id;

        const ok = await emailService.deleteEmail(req.params.id as string, userId);
        if (!ok) return sendNotFoundResponse(res, responseMessages.email.notFoundSingle);

        return sendSuccessResponse(res, responseMessages.email.deleted);
    } catch (error) {
        loggerService.error(`Error deleting email: ${error}`);
        sendServerErrorResponse(res, responseMessages.email.failedToDelete, error);
        next(error);
    }
};