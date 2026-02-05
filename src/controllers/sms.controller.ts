import tagService from '../services/tag.service';
import loggerService from '../utils/logger.service';
import smsService from '../services/sms.service';
import segmentService from '../services/segment.service';
import { NextFunction, Request, Response } from 'express';
import { responseMessages } from '../utils/response-message.service';
import { sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse } from '../utils/response.service';

/** POST /sms - Send SMS to customers from tag_ids and/or segment_ids (and optional to). */
export const sendSms = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = res.locals.auth?.user?.id;
        const { type, message, to, is_all_tag, is_all_segment, tag_ids, segment_ids } = req.body;

        const finalTagIds = is_all_tag === true ? await tagService.getAssignableTagIdsForUser(userId) : (Array.isArray(tag_ids) ? tag_ids : []);
        const finalSegmentIds = is_all_segment === true ? await segmentService.getSegmentIdsForUser(userId) : (Array.isArray(segment_ids) ? segment_ids : []);

        await smsService.sendSmsByTagsAndSegments(
            {
                to,
                type,
                message,
                tag_ids: finalTagIds,
                segment_ids: finalSegmentIds,
            },
            userId
        );
        return sendSuccessResponse(res, responseMessages.sms.sent);
    } catch (error) {
        loggerService.error(`Error sending SMS: ${error}`);
        sendServerErrorResponse(res, responseMessages.sms.failedToSend, error);
        next(error);
    }
};

export const getAllSms = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = res.locals.auth?.user?.id;
        const { page, limit, search, order_by = 'created_at', order_direction = 'DESC', date_from, date_to } = req.query;

        const result = await smsService.getAllSmsPaginated(userId, {
            page: Number(page) || 1,
            limit: Number(limit) || 10,
            search: (search as string) || '',
            order_by: (order_by as string) as any,
            date_to: (date_to as string) || undefined,
            date_from: (date_from as string) || undefined,
            order_direction: (order_direction as string) === 'ASC' ? 'ASC' : 'DESC',
        });

        return sendSuccessResponse(res, responseMessages.sms.retrieved, result);
    } catch (error) {
        loggerService.error(`Error getting SMS: ${error}`);
        sendServerErrorResponse(res, responseMessages.sms.failedToFetch, error);
        next(error);
    }
};

export const getSmsById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = res.locals.auth?.user?.id;

        const sms = await smsService.getSmsById(req.params.id as string, userId);
        if (!sms) return sendNotFoundResponse(res, responseMessages.sms.notFoundSingle);

        return sendSuccessResponse(res, responseMessages.sms.retrievedSingle, sms);
    } catch (error) {
        loggerService.error(`Error getting SMS: ${error}`);
        sendServerErrorResponse(res, responseMessages.sms.failedToFetch, error);
        next(error);
    }
};

export const deleteSms = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = res.locals.auth?.user?.id;

        const ok = await smsService.deleteSms(req.params.id as string, userId);
        if (!ok) return sendNotFoundResponse(res, responseMessages.sms.notFoundSingle);

        return sendSuccessResponse(res, responseMessages.sms.deleted);
    } catch (error) {
        loggerService.error(`Error deleting SMS: ${error}`);
        sendServerErrorResponse(res, responseMessages.sms.failedToDelete, error);
        next(error);
    }
};
