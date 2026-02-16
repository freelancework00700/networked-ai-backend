import { NextFunction, Request, Response } from 'express';
import { sequelize } from '../server';
import { User, Event, Notification } from '../models';
import * as eventService from '../services/event.service';
import { getEventAttendeesPaginated, getEventParticipantsPaginated } from '../services/event.service';
import { NotificationType } from '../types/enums';
import gamificationCategoryService from '../services/gamification-category.service';
import userGamificationCategoryBadgesService from '../services/user-gamification-category-badges.service';
import userGamificationPointsService from '../services/user-gamification-points.service';
import smsService from '../services/sms.service';
import userService from '../services/user.service';
import emailService from '../services/email.service';
import feedSharedService from '../services/feed-shared.service';
import { ContentType, EventParticipantRole } from '../types/enums';
import { CreateEventParams, eventAttendeeParams, eventFeedbackParams } from '../types/event.interfaces';
import { verifyToken } from '../utils/crypto.service';
import loggerService from '../utils/logger.service';
import { responseMessages } from '../utils/response-message.service';
import { sendBadRequestResponse, sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse } from '../utils/response.service';

/** Create event */
export const createEvent = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authUserId = res.locals.auth?.user?.id ?? null;
        const eventsParams: CreateEventParams[] = req.body;

        const createdEvents: { id: string; slug: string }[] = [];
        let parentEventId: string | null = null;

        for (const [index, params] of eventsParams.entries()) {
            if (index > 0 && !parentEventId) {
                throw new Error('Parent event ID not found');
            }

            const event = await eventService.createEvent(
                {
                    ...params,
                    parent_event_id: index === 0 ? null : parentEventId,
                },
                authUserId,
                transaction
            );

            if (!event) {
                throw new Error('Failed to create event');
            }

            if (index === 0) {
                parentEventId = event.id;
            }

            createdEvents.push({ id: event.id, slug: event.slug });
        }

        await transaction.commit();

        return sendSuccessResponse(
            res,
            responseMessages.event.created,
            {
                events: createdEvents,
                count: createdEvents.length,
            }
        );
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error creating event: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToCreate, error);
        next(error);
    }
};

/** Update event */
export const updateEvent = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const authUserId = res.locals.auth?.user?.id ?? null;

        // Check if event exists
        const existingEvent = await eventService.getEventByIdOrSlug(id as string, false);
        if (!existingEvent) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.event.notFoundSingle);
        }

        const params: CreateEventParams = {
            ...req.body,
        };

        const event = await eventService.updateEvent(id as string, params, authUserId, transaction);
        if (!event) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.event.failedToUpdate);
        }

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.event.updated, { id: event.id, slug: event.slug });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error updating event: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToUpdate, error);
        next(error);
    }
};

/** Delete event */
export const deleteEvent = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const authUserId = res.locals.auth?.user?.id ?? null;

        if (!authUserId) {
            await transaction.rollback();
            return sendBadRequestResponse(res, 'Authentication required');
        }

        // Check if event exists
        const existingEvent = await eventService.getEventByIdOrSlug(id as string, false);
        if (!existingEvent) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.event.notFoundSingle);
        }

        // Delete the event
        const deleted = await eventService.deleteEvent(id as string, authUserId, transaction);
        if (!deleted) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.event.failedToDelete);
        }

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.event.deleted);
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error deleting event: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToDelete, error);
        next(error);
    }
};

/** Upsert (create/update) an event participant role */
export const upsertEventParticipantRole = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { id: eventId } = req.params;
        const authUserId = res.locals.auth?.user?.id ?? null;

        if (!authUserId) {
            await transaction.rollback();
            return sendBadRequestResponse(res, 'Authentication required');
        }

        // Ensure event exists
        const existingEvent = await eventService.getEventByIdOrSlug(eventId as string, false);
        if (!existingEvent) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.event.notFoundSingle);
        }

        const { user_id, role } = req.body as { user_id: string; role: EventParticipantRole | 'None' };

        const participant = await eventService.upsertEventParticipantRole(eventId as string, user_id, role, authUserId, transaction);
        if (!participant && role !== 'None') {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.event.failedToUpdate);
        }

        await transaction.commit();
        return sendSuccessResponse(res, responseMessages.event.participantRoleUpserted, { participant });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error upserting event participant role: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToUpdate, error);
        next(error);
    }
};

/** Get event by id */
export const getEventByIdOrSlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { value } = req.params;
        const includeDetails = req.query.include_details === 'true';
        const authUserId = res.locals.auth?.user?.id ?? null;

        const event = await eventService.getEventByIdOrSlug(value as string, includeDetails, authUserId);
        if (!event) {
            return sendNotFoundResponse(res, responseMessages.event.notFoundSingle);
        }

        // Check if user has liked and subscribed to the requested event, and check if event has any plans
        const [likedEventIds, subscribedEventIds, planIds] = await Promise.all([
            eventService.checkUserLikedEvents([event.id], authUserId),
            eventService.checkUserSubscribedToEvents([event.id], authUserId),
            eventService.checkEventsHaveStripeProducts([event.id]),
        ]);
        
        const isLiked = likedEventIds.has(event.id);
        const hasSubscribed = subscribedEventIds.has(event.id);
        const hasPlans = planIds.has(event.id);
        
        const transformedEvent = eventService.transformEventWithLike(event, isLiked, hasPlans, hasSubscribed);

        // Optimize connection status: batch all users together and use lookup map
        if (includeDetails && authUserId) {
        const eventJson: any = transformedEvent;
            
            // Collect all unique users from both participants and attendees in one pass
            const allUsers: any[] = [];
            const userIdSet = new Set<string>();
            
            // Extract users from participants
            if (eventJson.participants && Array.isArray(eventJson.participants)) {
                eventJson.participants.forEach((p: any) => {
                    if (p.user && p.user.id && !userIdSet.has(p.user.id)) {
                        allUsers.push(p.user);
                        userIdSet.add(p.user.id);
                    }
                });
            }
            
            // Extract users from attendees
            if (eventJson.attendees && Array.isArray(eventJson.attendees)) {
                eventJson.attendees.forEach((a: any) => {
                    if (a.user && a.user.id && !userIdSet.has(a.user.id)) {
                        allUsers.push(a.user);
                        userIdSet.add(a.user.id);
                    }
                });
            }

            // Fetch connection status for all users in one batch call
            if (allUsers.length > 0) {
                const usersWithStatus = await userService.addConnectionStatusToUsers(allUsers, authUserId, false);
                
                // Create a lookup map for O(1) access instead of O(n) find operations
                const statusMap = new Map<string, any>();
                usersWithStatus.forEach((user: any) => {
                    statusMap.set(user.id, user);
                });

                // Update participants with connection status using map lookup
                if (eventJson.participants && Array.isArray(eventJson.participants)) {
                    eventJson.participants = eventJson.participants.map((participant: any) => {
                        if (participant.user && participant.user.id) {
                            const userWithStatus = statusMap.get(participant.user.id);
                            if (userWithStatus) {
                                return {
                                    ...participant,
                                    user: userWithStatus
                                };
                            }
                        }
                        return participant;
                    });
                }

                // Update attendees with connection status using map lookup
                if (eventJson.attendees && Array.isArray(eventJson.attendees)) {
                    eventJson.attendees = eventJson.attendees.map((attendee: any) => {
                        if (attendee.user && attendee.user.id) {
                            const userWithStatus = statusMap.get(attendee.user.id);
                            if (userWithStatus) {
                                return {
                                    ...attendee,
                                    user: userWithStatus
                                };
                            }
                        }
                        return attendee;
                    });
                }
            }
        }

        return sendSuccessResponse(res, responseMessages.event.retrieved, { content: transformedEvent });
    } catch (error) {
        loggerService.error(`Error fetching event: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToFetchSingle, error);
        next(error);
    }
};

/** Get ticket analytics for an event */
export const getEventAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const analytics = await eventService.getEventAnalytics(id as string);
        if (!analytics) {
            return sendNotFoundResponse(res, responseMessages.event.notFoundSingle);
        }

        return sendSuccessResponse(res, responseMessages.event.retrieved, analytics );
    } catch (error) {
        loggerService.error(`Error getting event ticket analytics: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToFetch, error);
        next(error);
    }
};

/** Get analytics for a single ticket (by ticket ID) with pagination */
export const getTicketAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { ticketId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = (req.query.search as string) || '';
        const authUserId = res.locals.auth?.user?.id ?? null;

        const analytics = await eventService.getTicketAnalytics(ticketId as string, page, limit, search);
        if (!analytics) {
            return sendNotFoundResponse(res, responseMessages.event.notFoundSingle);
        }

        // Add connection status to users
        const usersWithoutNull = analytics.users.filter((user: any) => !!user);

        const usersWithStatus = await userService.addConnectionStatusToUsers(
            usersWithoutNull.map((user: any) => (user.toJSON ? user.toJSON() : user)),
            authUserId || null
        );

        const usersWithStatusById = new Map(usersWithStatus.map((u: any) => [u.id, u]));

        const usersWithConnectionStatus = analytics.users.map((user: any) => {
            if (!user) return null;
            const userWithStatus = usersWithStatusById.get(user.id);
            return userWithStatus ? { ...user, ...userWithStatus } : user;
        });

        return sendSuccessResponse(res, responseMessages.event.retrieved, {
            ...analytics,
            users: usersWithConnectionStatus,
        });
    } catch (error) {
        loggerService.error(`Error getting ticket analytics: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToFetch, error);
        next(error);
    }
};

/** Download ticket analytics as CSV */
export const downloadTicketAnalyticsCSV = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { ticketId } = req.params;

        const csvData = await eventService.generateTicketAnalyticsCSV(ticketId as string);
        if (!csvData) {
            return sendNotFoundResponse(res, responseMessages.event.notFoundSingle);
        }

        // Get ticket name for filename
        const analytics = await eventService.getTicketAnalyticsForCSV(ticketId as string);
        const ticketName = analytics?.ticket?.name || 'ticket';
        const sanitizedTicketName = ticketName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${sanitizedTicketName}_${new Date().toISOString().split('T')[0]}.csv`;

        // Set headers for CSV download (browser will trigger download automatically)
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        // Use both filename and filename* for better browser compatibility
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // Send CSV data directly (browser will download the file)
        return res.status(200).send(csvData);
    } catch (error) {
        loggerService.error(`Error downloading ticket analytics CSV: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToFetch, error);
        next(error);
    }
};

/** Get liked events by authenticated user with pagination and search */
export const getLikedEvents = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authUserId = res.locals.auth?.user?.id;

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = (req.query.search as string) || '';

        const result = await eventService.getLikedEventsPaginated(
            authUserId,
            page,
            limit,
            search
        );
        if (!result.data.length) {
            return sendSuccessResponse(res, responseMessages.event.notFound, result);
        }

        // Transform events with is_like flag (will always be true for liked events)
        const transformedEvents = await eventService.transformEventsWithLike(result.data, authUserId);

        return sendSuccessResponse(res, responseMessages.event.retrieved, {
            ...result,
            data: transformedEvents,
        });
    } catch (error) {
        loggerService.error(`Error getting liked events: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToFetch, error);
        next(error);
    }
};

/** Get all events with pagination, search, sorting and filters */
export const getAllEvents = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = (req.query.search as string) || '';
        const orderBy = (req.query.order_by as string) || 'start_date';
        const orderDirection = (req.query.order_direction as string) || 'DESC';
        const authUserId = res.locals.auth?.user?.id ?? null;
        const isAuthenticated = !!authUserId;

        const filters: {
            start_date?: string;
            end_date?: string;
            latitude?: string;
            longitude?: string;
            radius?: number;
            city?: string;
            state?: string;
            country?: string;
            category_id?: string;
            is_paid_event?: boolean;
            is_public?: boolean;
            user_id?: string;
            roles?: string[];
            is_liked?: boolean;
            is_upcoming_event?: boolean;
            is_recommended?: boolean;
            is_live?: boolean;
            is_completed?: boolean;
        } = {};

        if (req.query.start_date) filters.start_date = req.query.start_date as string;
        if (req.query.end_date) filters.end_date = req.query.end_date as string;
        if (req.query.latitude) filters.latitude = req.query.latitude as string;
        if (req.query.longitude) filters.longitude = req.query.longitude as string;
        if (req.query.radius) filters.radius = parseFloat(req.query.radius as string);
        if (req.query.city) filters.city = req.query.city as string;
        if (req.query.state) filters.state = req.query.state as string;
        if (req.query.country) filters.country = req.query.country as string;
        if (req.query.category_id) filters.category_id = req.query.category_id as string;
        if (req.query.is_paid_event !== undefined) {
            filters.is_paid_event = req.query.is_paid_event === 'true';
        }
        if (req.query.is_public !== undefined) {
            filters.is_public = req.query.is_public === 'true';
        }
        if (req.query.user_id) filters.user_id = req.query.user_id as string;
        if (req.query.roles) {
            if (Array.isArray(req.query.roles)) {
                filters.roles = req.query.roles as string[];
            } else if (typeof req.query.roles === 'string') {
                filters.roles = req.query.roles.split(',').map(role => role.trim()).filter(role => role.length > 0);
            }
        }
        if (req.query.is_liked !== undefined) {
            filters.is_liked = req.query.is_liked === 'true';
            // is_liked filter requires authentication
            if (filters.is_liked && !isAuthenticated) {
                return sendBadRequestResponse(res, 'Authentication required to filter by liked events');
            }
        }

        if (req.query.is_upcoming_event !== undefined) {
            filters.is_upcoming_event = req.query.is_upcoming_event === 'true';
        }

        if (req.query.is_recommended !== undefined) {
            filters.is_recommended = req.query.is_recommended === 'true';
        }
        if (req.query.is_live !== undefined) {
            filters.is_live = req.query.is_live === 'true';
        }
        if (req.query.is_completed !== undefined) {
            filters.is_completed = req.query.is_completed === 'true';
        }

        // If not authenticated, only show public events
        // If authenticated, show all events (unless explicitly filtered)
        if (!isAuthenticated) {
            filters.is_public = true;
        }

        const result = await eventService.getAllEventsPaginated(
            page,
            limit,
            search,
            orderBy,
            orderDirection,
            Object.keys(filters).length > 0 ? filters : undefined,
            authUserId
        );

        // Transform events with is_like flag
        const transformedEvents = await eventService.transformEventsWithLike(result.data, authUserId);

        return sendSuccessResponse(res, responseMessages.event.retrieved, {
            ...result,
            data: transformedEvents,
        });
    } catch (error) {
        loggerService.error(`Error listing events: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToFetch, error);
        next(error);
    }
};

/** Create event view */
export const createEventView = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const deviceId = req.body.device_id;
        const authUserId = res.locals.auth?.user?.id ?? null;


        if (!deviceId) {
            return sendBadRequestResponse(res, responseMessages.event.deviceIDRequired);
        }

        const eventView = await eventService.createEventView(
            id as string,
            authUserId || null,
            deviceId,
            authUserId || null
        );

        return sendSuccessResponse(res, responseMessages.event.viewCreated, { content: eventView });
    } catch (error) {
        loggerService.error(`Error creating event view: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToCreate, error);
        next(error);
    }
};

/** Toggle event like (like if not liked, unlike if already liked) */
export const toggleEventLike = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const authUserId = res.locals.auth?.user?.id ?? null;

        // Check if event is already liked
        const existingLike = await eventService.findEventLikeByEventIdAndUserId(id as string, authUserId);

        if (existingLike) {
            // Unlike the event
            const result = await eventService.unlikeEvent(id as string, authUserId, authUserId);
            if (!result) {
                return sendNotFoundResponse(res, responseMessages.event.notFoundSingle);
            }
            return sendSuccessResponse(res, responseMessages.event.unliked, {
                content: { ...result, is_liked: false }
            });
        } else {
            // Like the event
            const eventLike = await eventService.createEventLike(id as string, authUserId, authUserId);
            return sendSuccessResponse(res, responseMessages.event.liked, {
                content: { ...eventLike.toJSON(), is_liked: true }
            });
        }
    } catch (error) {
        loggerService.error(`Error toggling event like: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToCreate, error);
        next(error);
    }
};

/** Report event */
export const reportEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const authUserId = res.locals.auth?.user?.id ?? null;

        const { report_reason_id, reason } = req.body;

        const eventReport = await eventService.reportEvent(
            id as string,
            authUserId,
            report_reason_id,
            reason || null,
            authUserId
        );

        return sendSuccessResponse(res, responseMessages.event.reported, { content: eventReport });
    } catch (error) {
        loggerService.error(`Error reporting event: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToCreateLike, error);
        next(error);
    }
};

/** Save event feedback */
export const saveEventFeedback = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const authUserId = res.locals.auth?.user?.id ?? null;

        const feedbackData: eventFeedbackParams[] = req.body.feedback || [];
        if (!feedbackData || feedbackData.length === 0) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.event.feedbackDataRequired);
        }

        const feedback = await eventService.saveEventFeedback(
            id as string,
            authUserId,
            feedbackData,
            authUserId,
            transaction
        );

        await transaction.commit();

        // Find and update the PostEventQuestionnaire notification so afterUpdate hook emits via socket
        if (authUserId) {
            const notification = await Notification.findOne({
                where: { event_id: id, user_id: authUserId, type: NotificationType.POST_EVENT_QUESTIONNAIRE, is_deleted: false },
            });
            if (notification) {
                await Notification.update(
                    { updated_at: new Date() },
                    { where: { id: notification.id }, individualHooks: true }
                );
            }
        }

        return sendSuccessResponse(res, responseMessages.event.feedbackSaved, { content: feedback });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error saving event feedback: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToCreateLike, error);
        next(error);
    }
};

/** Get all previous event attendees */
export const getPreviousEventAttendees = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit, user_id, event_id } = req.query;

        const result = await eventService.getPreviousEventAttendees(Number(page) || 1, Number(limit) || 10, user_id as string | undefined, event_id as string | undefined);
        if (!result.data.length) {
            return sendSuccessResponse(res, responseMessages.event.notFoundPreviousAttendees, result);
        }

        return sendSuccessResponse(res, responseMessages.event.previousAttendeesRetrieved, result);
    } catch (error) {
        loggerService.error(`Error getting previous event attendees: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToFetchPreviousAttendees, error);
        next(error);
    }
};

/** Get top cities with event counts */
export const getTopCities = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cities = await eventService.getTopCitiesWithEventCount();
        return sendSuccessResponse(res, responseMessages.event.retrieved, cities);
    } catch (error) {
        loggerService.error(`Error getting top cities: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToFetch, error);
        next(error);
    }
};

/** Get event questions by event ID and event phase with users who attended */
export const getEventQuestionsWithAttendees = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { event_id } = req.params;
        const { event_phase, page, limit, search } = req.query;

        if (!event_phase || (event_phase !== 'PreEvent' && event_phase !== 'PostEvent')) {
            return sendBadRequestResponse(res, 'event_phase query parameter is required and must be either "PreEvent" or "PostEvent"');
        }

        const pageNum = parseInt(page as string) || 1;
        const limitNum = parseInt(limit as string) || 10;

        const result = await eventService.getEventQuestionsWithAttendees(
            event_id as string,
            event_phase as string,
            pageNum,
            limitNum,
            (search as string) || undefined
        );
        
        if (!result) {
            return sendNotFoundResponse(res, responseMessages.event.notFoundSingle);
        }

        return sendSuccessResponse(res, responseMessages.event.retrieved, result);
    } catch (error) {
        loggerService.error(`Error getting event questions with attendees: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToFetch, error);
        next(error);
    }
};

/** Get questions and answers given by a user for a specific event */
export const getUserEventQuestionsAndAnswers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { user_id, event_id, event_phase } = req.query;
        if (!user_id || !event_id) {
            return sendBadRequestResponse(res, 'user_id and event_id query parameters are required');
        }

        // Validate event_phase if provided
        if (event_phase && event_phase !== 'PreEvent' && event_phase !== 'PostEvent') {
            return sendBadRequestResponse(res, 'event_phase must be either "PreEvent" or "PostEvent"');
        }

        const result = await eventService.getUserEventQuestionsAndAnswers(
            user_id as string,
            event_id as string,
            event_phase as string | undefined
        );
        
        if (!result) {
            return sendNotFoundResponse(res, 'Event or user not found');
        }

        return sendSuccessResponse(res, responseMessages.event.retrieved, result);
    } catch (error) {
        loggerService.error(`Error getting user event questions and answers: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToFetch, error);
        next(error);
    }
};

/** Get question analysis for single choice, multiple choice, and rating scale questions. If event_phase is omitted, returns both PreEvent and PostEvent questionnaires. */
export const getQuestionAnalysis = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { event_id, event_phase } = req.query;

        if (!event_id) {
            return sendBadRequestResponse(res, 'Event id query parameter is required');
        }

        const phase = typeof event_phase === 'string' ? event_phase : undefined;
        if (phase !== undefined && phase !== 'PreEvent' && phase !== 'PostEvent') {
            return sendBadRequestResponse(res, 'Event phase must be either "PreEvent" or "PostEvent"');
        }

        const result = await eventService.getQuestionAnalysis(
            event_id as string,
            phase
        );
        
        if (!result) {
            return sendNotFoundResponse(res, responseMessages.event.notFoundSingle);
        }

        return sendSuccessResponse(res, responseMessages.event.retrieved, result);
    } catch (error) {
        loggerService.error(`Error getting question analysis: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToFetch, error);
        next(error);
    }
};

/** Get users who selected a specific option for a question (only for SingleChoice and MultipleChoice questions) */
export const getUsersByQuestionOption = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { question_id, option_id, option_value, page, limit } = req.query;
        const authUserId = res.locals.auth?.user?.id ?? null;

        if (!question_id) {
            return sendBadRequestResponse(res, 'question_id query parameter is required');
        }

        // For rating questions, option_value is accepted but users won't be returned
        // For choice questions, option_id is required
        if (!option_id) {
            return sendBadRequestResponse(res, 'option_id for choice questions is required');
        }

        const pageNum = parseInt(page as string) || 1;
        const limitNum = parseInt(limit as string) || 10;

        const result = await eventService.getUsersByQuestionOption(
            question_id as string,
            (option_id as string) || null,
            (option_value as string) || null,
            pageNum,
            limitNum,
            authUserId
        );
        
        if (!result) {
            return sendNotFoundResponse(res, 'Question not found or invalid parameters');
        }

        return sendSuccessResponse(res, responseMessages.event.retrieved, result);
    } catch (error) {
        loggerService.error(`Error getting users by question option: ${error}`);
        sendServerErrorResponse(res, responseMessages.event.failedToFetch, error);
        next(error);
    }
};

/** POST API: Send email and SMS to entire network */
export const sendNetworkBroadcast = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        const authenticatedUser = res.locals.auth?.user;
        const { event_id, type } = req.body;

        if (!type || (type !== 'email' && type !== 'sms')) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.user.invalidBroadcastType);
        }

        // Fetch event with host information
        const event = await Event.findByPk(event_id, {
            include: [{
                model: User,
                as: 'created_by_user',
                attributes: ['id', 'name', 'email', 'username'],
                required: false,
            }],
            transaction
        });

        if (!event) {
            await transaction.rollback();
            return sendNotFoundResponse(res, responseMessages.event.notFound);
        }

        // Get all network user IDs
        const networkUserIds = await feedSharedService.getAllNetworkUserIds(authenticatedUser.id);

        if (networkUserIds.length === 0) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.user.noNetworkUsers);
        }

        let emailResult = null;
        let smsResult = null;

        // Send emails if type is email
        if (type === 'email') {
            emailResult = await emailService.sendNetworkBroadcastEmail(
                event,
                networkUserIds,
                authenticatedUser.id,
                transaction
            );
        }

        // Send SMS if type is sms
        if (type === 'sms') {
            smsResult = await smsService.sendNetworkBroadcastSms(
                event,
                networkUserIds,
                authenticatedUser.id,
                transaction
            );
        }

        await transaction.commit();

        return sendSuccessResponse(res, responseMessages.user.networkBroadcastSent, {
            sms_sent: smsResult ? true : false,
            email_sent: emailResult ? true : false,
            recipients_count: networkUserIds.length
        });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error sending network broadcast: ${error}`);
        sendServerErrorResponse(res, responseMessages.user.networkBroadcastFailed, error);
        next(error);
    }
};

/** Get event attendees with pagination and search */
export const getEventAttendees = async (req: Request, res: Response) => {
    try {
        const { value } = req.params;
        const authUserId = res.locals.auth?.user?.id;

        // Parse and validate query parameters
        const { page, limit, search, rsvp_status, order_by, order_direction } = req.query as Record<string, string>;

        // Handle multiple RSVP statuses (comma-separated)
        let rsvpStatuses: string[] = [];
        if (rsvp_status) rsvpStatuses = rsvp_status.split(',').map(s => s.trim()).filter(s => s);
        const options = {
            search: search || '',
            rsvp_status: rsvpStatuses,
            order_by: order_by || 'created_at',
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 10,
            order_direction: order_direction || 'DESC',
        };

        // Get event by ID or slug
        const event = await eventService.getEventByIdOrSlug(value as string);
        if (!event) return sendNotFoundResponse(res, responseMessages.event.notFound);

        // Get event attendees
        const result = await getEventAttendeesPaginated(event.id, authUserId, options);
        return sendSuccessResponse(res, responseMessages.event.retrieved, result);
    } catch (error) {
        loggerService.error(`Error fetching event attendees: ${error}`);
        return sendServerErrorResponse(res, responseMessages.event.failedToFetch, error);
    }
};

/** Get event participants with pagination and search */
export const getEventParticipants = async (req: Request, res: Response) => {
    try {
        const { value } = req.params;
        const authUserId = res.locals.auth?.user?.id;

        // Parse and validate query parameters
        const { page, limit, search, role, order_by, order_direction } = req.query as Record<string, string>;
        
        // Handle multiple roles (comma-separated)
        let roles: string[] = [];
        if (role) roles = role.split(',').map(r => r.trim()).filter(r => r);

        const options = {
            role: roles,
            search: search || '',
            order_by: order_by || 'created_at',
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 10,
            order_direction: order_direction || 'DESC',
        };

        // Get event by ID or slug
        const event = await eventService.getEventByIdOrSlug(value as string);
        if (!event) return sendNotFoundResponse(res, responseMessages.event.notFound);

        // Get event participants
        const result = await getEventParticipantsPaginated(event.id, authUserId, options);
        return sendSuccessResponse(res, responseMessages.event.retrieved, result);
    } catch (error) {
        loggerService.error(`Error fetching event participants: ${error}`);
        return sendServerErrorResponse(res, responseMessages.event.failedToFetch, error);
    }
};

 