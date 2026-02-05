import { NextFunction, Request, Response } from "express";
import { sequelize } from "../server";
import userService from "../services/user.service";
import eventAttendeesService from "../services/event-attendees.service";
import transactionService from "../services/transaction.service";
import { BulkEventAttendeeParams } from "../types/event.interfaces";
import gamificationCategoryService from "../services/gamification-category.service";
import userGamificationPointsService from "../services/user-gamification-points.service";
import userGamificationCategoryBadgesService from "../services/user-gamification-category-badges.service";
import { Event, EventAttendee } from "../models";
import loggerService from "../utils/logger.service";
import { responseMessages } from "../utils/response-message.service";
import { sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse, sendUnauthorizedResponse } from "../utils/response.service";
import { ContentType, RSVPStatus, TicketType } from "../types/enums";
import { emitAttendeeCheckInUpdate } from "../socket/event";

/** Create event attendees */
export const createEventAttendee = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authUserId = res.locals.auth?.user?.id ?? null;
        const { event_id, stripe_payment_intent_id, attendees } = req.body;

        // If stripe_payment_intent_id is provided, look up the transaction
        let transactionId: string | null = null;
        if (stripe_payment_intent_id) {
            const dbTransaction = await transactionService.getTransactionByPaymentIntentId(stripe_payment_intent_id, transaction);
            if (dbTransaction) {
                transactionId = dbTransaction.id;
                loggerService.info(`Found transaction ${transactionId} for payment intent ${stripe_payment_intent_id}`);
            } else {
                loggerService.warn(`Transaction not found for payment intent ${stripe_payment_intent_id}`);
            }
        }

        const bulkData: BulkEventAttendeeParams = {
            event_id,
            attendees,
            transaction_id: transactionId,
        };

        const createdAttendees = await eventAttendeesService.createBulkEventAttendees(
            bulkData,
            authUserId,
            transaction
        );

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.event.attendeeCreated, {
            content: createdAttendees,
            count: createdAttendees.length,
        });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error creating event attendee: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToCreateLike, error);
        next(error);
    }
};

/** Update event attendee - only allows updating rsvp_status, is_incognito, and name */
export const updateEventAttendee = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const authUserId = res.locals.auth?.user?.id;

        // Check if attendee exists
        const existingAttendee = await EventAttendee.findOne({
            where: {
                id,
                is_deleted: false,
            },
            transaction
        });

        if (!existingAttendee) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.event.attendeeNotFound);
        }

        // Check if user owns the attendee (user_id) or is the parent (parent_user_id)
        if (existingAttendee.user_id !== authUserId && existingAttendee.parent_user_id !== authUserId) {
            await transaction.rollback();
            return sendUnauthorizedResponse(res, responseMessages.user.forbidden);
        }

        // Update the attendee
        const updatedAttendee = await eventAttendeesService.updateEventAttendee(
            id as string,
            req.body,
            authUserId,
            transaction
        );

        if (!updatedAttendee) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.event.attendeeNotFound);
        }

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.event.attendeeUpdated, updatedAttendee);
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error updating event attendee: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToUpdateAttendee, error);
        next(error);
    }
};

/** Soft delete event attendee by attendee id */
export const deleteEventAttendee = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authUserId = res.locals.auth?.user?.id;
        const { id } = req.params;
        // Check if attendee exists and is not deleted
        const existingAttendee = await EventAttendee.findOne({
            where: {
                id,
                is_deleted: false,
            },
            transaction,
        });
        if (!existingAttendee) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.event.attendeeNotFound);
        }

        // Check if the requester is the attendee, their parent, or the event host/creator
        const isAttendee = existingAttendee.user_id === authUserId;
        const isParent = existingAttendee.parent_user_id === authUserId;

        let isHost = false;
        const event = await Event.findOne({
            where: { id: existingAttendee.event_id, is_deleted: false },
            attributes: ['id', 'created_by'],
            transaction,
        });
        if (event && event.created_by === authUserId) {
            isHost = true;
        }

        if (!isAttendee && !isParent && !isHost) {
            await transaction.rollback();
            return sendUnauthorizedResponse(res, responseMessages.user.forbidden);
        }

        const deletedAttendee = await eventAttendeesService.softDeleteEventAttendee(id as string, authUserId, transaction);

        if (!deletedAttendee) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.event.attendeeNotFound);
        }

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.event.attendeeDeleted, { content: true });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error deleting event attendee: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToDeleteAttendee, error);
        next(error);
    }
};

/** Update attendee check-in status */
export const updateAttendeeCheckIn = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { event_id, attendee_id, is_checked_in, is_scanned = false } = req.body;
        const authUserId = res.locals.auth?.user?.id;

        // Check if attendee exists and belongs to the event
        const existingAttendee = await EventAttendee.findOne({
            where: { 
                id: attendee_id, 
                event_id: event_id,
                is_deleted: false 
            },
            transaction
        });

        if (!existingAttendee) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.event.attendeeNotFound);
        }

        // Check if the requester is the attendee, their parent, or the event host/creator
        const isAttendee = existingAttendee.user_id === authUserId;
        const isParent = existingAttendee.parent_user_id === authUserId;

        let isHost = false;
        const event = await Event.findOne({
            where: { id: event_id, is_deleted: false },
            attributes: ['id', 'created_by'],
            transaction,
        });

        if (event && event.created_by === authUserId) {
            isHost = true;
        }

        if (!isAttendee && !isParent && !isHost) {
            await transaction.rollback();
            return sendUnauthorizedResponse(res, responseMessages.user.forbidden);
        }

        const updatedAttendee = await eventAttendeesService.updateAttendeeCheckIn(attendee_id, is_checked_in, authUserId, transaction);

        if (!updatedAttendee) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.event.attendeeNotFound);
        }

        // When scan is true and check-in succeeded, award gamification to the user who scanned (same flow as recordEventQrCodeScan)
        if (is_scanned && is_checked_in && authUserId) {
            await userService.incrementUserTotal(authUserId, 'total_qr_codes_scanned', transaction);

            const category = await gamificationCategoryService.getGamificationCategoryByName('Scan a QR Code', undefined);

            if (category) {
                await userGamificationPointsService.createUserGamificationPoints(
                    {
                        user_id: authUserId,
                        content_type: ContentType.QR,
                        content_id: existingAttendee.id,
                        gamification_category_id: category.id,
                        earned_points: category.earned_point ?? 0,
                    },
                    authUserId,
                    transaction
                );

                await userGamificationCategoryBadgesService.checkAndAwardBadgeByField(
                    authUserId,
                    category.id,
                    'total_qr_codes_scanned',
                    transaction
                );

                await userService.addPointsToUserTotal(
                    authUserId,
                    'total_gamification_points',
                    category.earned_point ?? 0,
                    transaction
                );
            }
        }

        await transaction.commit();

        // Prepare attendee data for socket event and emit socket event to the attendee user
        const attendeeData = updatedAttendee.toJSON ? updatedAttendee.toJSON() : updatedAttendee;
        emitAttendeeCheckInUpdate(existingAttendee.user_id, attendeeData);

        const message = is_checked_in ? responseMessages.event.attendeeCheckedIn : responseMessages.event.attendeeUncheckedIn;
        return sendSuccessResponse(res, message, updatedAttendee);
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error updating attendee check-in status: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToCheckInAttendee, error);
        next(error);
    }
};

/** Get event attendees with filters and pagination */
export const getEventAttendeesWithFilters = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authUserId = res.locals.auth?.user?.id ?? null;
        const {
            event_id,
            rsvp_status,
            is_checked_in,
            ticket_type,
            is_connected,
            search,
            page = '1',
            limit = '10',
        } = req.query;

        const pageNum = parseInt(page as string, 10) || 1;
        const limitNum = parseInt(limit as string, 10) || 10;

        const parseBooleanQuery = (value: unknown): boolean | undefined => {
            if (typeof value === 'string') {
                return value === 'true' || value === '1';
            }
            if (typeof value === 'boolean') return value;
            return undefined;
        };

        const parsedIsCheckedIn = parseBooleanQuery(is_checked_in);
        const parsedIsConnected = parseBooleanQuery(is_connected);

        const parseCsvQueryValues = (value: unknown): string[] | undefined => {
            if (typeof value !== 'string') return undefined;
            const parts = value
                .split(',')
                .map(v => v.trim())
                .filter(v => v.length > 0);
            return parts.length > 0 ? parts : undefined;
        };

        const parsedRsvpStatuses = parseCsvQueryValues(rsvp_status) as RSVPStatus[] | undefined;
        const parsedTicketTypes = parseCsvQueryValues(ticket_type) as TicketType[] | undefined;

        const attendees = await eventAttendeesService.getEventAttendeesWithFilters(
            {
                event_id: event_id as string,
                rsvp_status: parsedRsvpStatuses,
                is_checked_in: parsedIsCheckedIn,
                ticket_type: parsedTicketTypes,
                is_connected: parsedIsConnected,
                search: (search as string) || undefined,
            },
            pageNum,
            limitNum,
            authUserId
        );

        return sendSuccessResponse(res, responseMessages.event.retrieved, attendees);
    } catch (error) {
        loggerService.error(`Error fetching event attendees: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToFetch, error);
        next(error);
    }
};