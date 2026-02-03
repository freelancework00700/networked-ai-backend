import { NextFunction, Request, Response } from 'express';
import { sequelize } from '../server';
import * as rsvpRequestService from '../services/rsvp-request.service';
import loggerService from '../utils/logger.service';
import { responseMessages } from '../utils/response-message.service';
import { sendBadRequestResponse, sendConflictErrorResponse, sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse } from '../utils/response.service';
import * as eventService from '../services/event.service';
import { RSVPRequestStatus } from '../types/enums';

/** Send RSVP request */
export const sendRSVPRequest = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { eventId } = req.params;
        const authUserId = res.locals.auth?.user?.id ?? null;

        // Check if event exists
        const event = await eventService.getEventByIdOrSlug(eventId);
        if (!event) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.event.notFoundSingle);
        }

        // Check if approval is required
        const eventSettings = await eventService.getEventSettings(eventId);
        if (!eventSettings) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.event.notFoundSingle);
        }
        const isApprovalRequired = eventSettings.is_rsvp_approval_required ?? false;
        if (!isApprovalRequired) {
            await transaction.rollback();
            return sendSuccessResponse(res, responseMessages.event.rsvpRequestNotNeeded, {});
        }

        // Check if rsvp request already exists
        const existingRequest = await rsvpRequestService.isRSVPRequestExists(eventId, authUserId);
        if (existingRequest) {
            if (existingRequest.status === RSVPRequestStatus.PENDING) {
                await transaction.rollback();
                return sendConflictErrorResponse(res, responseMessages.event.rsvpRequestAlreadyPending);
            }
            if (existingRequest.status === RSVPRequestStatus.APPROVED) {
                await transaction.rollback();
                return sendConflictErrorResponse(res, responseMessages.event.rsvpRequestAlreadyApproved);
            }
        }
        
        // Send RSVP request
        const rsvpRequest = await rsvpRequestService.sendRSVPRequest(eventId, authUserId, transaction);

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.event.rsvpRequestSent, { rsvp_request: rsvpRequest });
    } catch (error: any) {
        await transaction.rollback();
        loggerService.error(`Error sending RSVP request: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToSendRSVPRequest, error);
        next(error);
    }
};

/** Get pending RSVP requests */
export const getPendingRSVPRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { eventId } = req.params;
        const authUserId = res.locals.auth?.user?.id ?? null;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;

        // Check if user is event host
        const isHost = await rsvpRequestService.isEventHost(authUserId, eventId);
        if (!isHost) {
            return sendBadRequestResponse(res, responseMessages.event.onlyEventHostsCanViewRSVPRequests);
        }

        const result = await rsvpRequestService.getPendingRSVPRequests(eventId, page, limit);
        if (result.data.length === 0) {
            return sendSuccessResponse(res, responseMessages.event.noPendingRSVPRequests, result);
        }

        return sendSuccessResponse(res, responseMessages.event.rsvpRequestsRetrieved, result);
    } catch (error) {
        loggerService.error(`Error getting pending RSVP requests: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToFetchRSVPRequests, error);
        next(error);
    }
};

/** Get processed RSVP requests */
export const getProcessedRSVPRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { eventId } = req.params;
        const authUserId = res.locals.auth?.user?.id ?? null;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;

        // Check if user is event host
        const isHost = await rsvpRequestService.isEventHost(authUserId, eventId);
        if (!isHost) {
            return sendBadRequestResponse(res, responseMessages.event.onlyEventHostsCanViewRSVPRequests);
        }

        const result = await rsvpRequestService.getProcessedRSVPRequests(eventId, page, limit);
        if (result.data.length === 0) {
            return sendSuccessResponse(res, responseMessages.event.noProcessedRSVPRequests, result);
        }

        return sendSuccessResponse(res, responseMessages.event.rsvpRequestsRetrieved, result);
    } catch (error) {
        loggerService.error(`Error getting processed RSVP requests: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToFetchRSVPRequests, error);
        next(error);
    }
};

/** Approve or reject RSVP request */
export const approveRejectRSVPRequest = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { eventId, requestId } = req.params;
        const authUserId = res.locals.auth?.user?.id ?? null;
        const { action } = req.body;

        // Check if user is event host
        const isHost = await rsvpRequestService.isEventHost(authUserId, eventId);
        if (!isHost) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.event.onlyEventHostsCanApproveRejectRSVPRequests);
        }

        // Check if RSVP request exists and is pending
        const rsvpRequestExists = await rsvpRequestService.checkPendingRSVPRequest(eventId, requestId, transaction);
        if (!rsvpRequestExists) {
            await transaction.rollback();
            return sendConflictErrorResponse(res, responseMessages.event.noPendingRSVPRequests);
        }

        // Approve or reject RSVP request
        await rsvpRequestService.approveRejectRSVPRequest(eventId, requestId, action, authUserId, transaction);

        // Reload RSVP request
        await rsvpRequestExists.reload();
        
        await transaction.commit();
        const message = action === RSVPRequestStatus.APPROVED
            ? responseMessages.event.rsvpRequestApproved
            : responseMessages.event.rsvpRequestRejected;
        return sendSuccessResponse(res, message, rsvpRequestExists);
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error approving/rejecting RSVP request: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToProcessRSVPRequest, error);
        next(error);
    }
};