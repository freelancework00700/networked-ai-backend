import { Op, Sequelize, Transaction, FindAndCountOptions, WhereOptions } from "sequelize";
import { EventAttendee, EventTickets, EventPromoCode, User, Event, EventParticipant } from "../models";
import { ContentType, RSVPStatus, TicketType, ConnectionStatus, EventParticipantRole } from "../types/enums";
import { BulkEventAttendeeParams, eventAttendeeParams } from "../types/event.interfaces";
import gamificationCategoryService from "./gamification-category.service";
import userGamificationCategoryBadgesService from "./user-gamification-category-badges.service";
import userGamificationPointsService from "./user-gamification-points.service";
import userService from "./user.service";
import loggerService from "../utils/logger.service";
import { generateAppleWalletPassUrlDirect } from "./apple-pass.service";
import smsService from "./sms.service";
import emailService from "./email.service";
import * as eventService from "./event.service";
import notificationService from "./notification.service";
import { EventAttendeeCounts } from "../types/event-attendees.interface";

/** Check if user is event host (creator or HOST/CO_HOST participant) */
export const isEventHost = async (userId: string, eventId: string, transaction?: Transaction): Promise<boolean> => {
    const event = await Event.findOne({
        transaction,
        attributes: ['created_by'],
        where: { id: eventId, is_deleted: false },
    });
    if (!event) return false;

    // Check if user is event creator
    if (event.created_by === userId) return true;

    // Check if user is HOST or CO_HOST participant
    const participant = await EventParticipant.findOne({
        where: {
            user_id: userId,
            event_id: eventId,
            is_deleted: false,
            role: { [Op.in]: [EventParticipantRole.HOST, EventParticipantRole.CO_HOST] },
        },
        transaction,
    });

    return !!participant;
};

/** Check if user is already attending an event (main attendee record, not guests) */
export const checkUserAlreadyAttending = async (
    eventId: string,
    userId: string,
    transaction?: Transaction
): Promise<boolean> => {
    const existingAttendee = await EventAttendee.findOne({
        where: {
            user_id: userId,
            is_deleted: false,
            event_id: eventId,
        },
        transaction,
    });
    return !!existingAttendee;
};

/** Event attendees - create or manage attendees */
const eventAttendees = async (
    attendeeData: eventAttendeeParams,
    createdBy: string,
    transaction?: Transaction
): Promise<EventAttendee> => {
    // Decrement available_quantity for ticket if ticket is used
    if (attendeeData.event_ticket_id) {
        await EventTickets.increment('available_quantity', {
            where: {
                id: attendeeData.event_ticket_id,
                is_deleted: false,
                [Op.and]: [
                    Sequelize.literal('`available_quantity` > 0')
                ]
            },
            by: -1,
            transaction
        });
    }

    // Decrement available_quantity for promo code if promo code is used
    if (attendeeData.event_promo_code_id) {
        await EventPromoCode.increment('available_quantity', {
            where: {
                id: attendeeData.event_promo_code_id,
                is_deleted: false,
                [Op.and]: [
                    Sequelize.literal('`available_quantity` IS NOT NULL'),
                    Sequelize.literal('`available_quantity` > 0')
                ]
            },
            by: -1,
            transaction
        });
    }

    const attendee = await EventAttendee.create(
        {
            ...attendeeData,
            user_id: createdBy,
            created_by: createdBy,
        },
        { transaction }
    );

    // Increment user's total_events_attended (only for the actual attendee, not parent)
    if (!attendeeData.parent_user_id) {
        await userService.incrementUserTotal(createdBy, 'total_events_attended', transaction);
    }
    // Get category to fetch earned_points for updating user total
    const category = await gamificationCategoryService.getGamificationCategoryByName(
        'Attend an Event',
        undefined
    );

    if (category) {
        // Create user gamification points for the event creator
        await userGamificationPointsService.createUserGamificationPoints(
            {
                content_id: attendee.id,
                content_type: ContentType.ATTENDEE,
                user_id: createdBy,
                gamification_category_id: category?.id ?? "",
                earned_points: category?.earned_point ?? 0,
            },
            createdBy,
            transaction
        );

        //update user gamification category badges
        await userGamificationCategoryBadgesService.checkAndAwardBadgeByField(createdBy, category.id, "total_events_attended", transaction);

        // Update total gamification points if category exists
        await userService.addPointsToUserTotal(createdBy, "total_gamification_points", category?.earned_point ?? 0, transaction);
    }

    return attendee;
};

/** Create bulk event attendees */
const createBulkEventAttendees = async (
    bulkData: BulkEventAttendeeParams,
    createdBy: string,
    transaction?: Transaction
): Promise<EventAttendee[]> => {
    const createdAttendees: EventAttendee[] = [];

    // Process each attendee
    for (const attendeeItem of bulkData.attendees) {

        const fullAttendeeData: eventAttendeeParams = {
            event_id: bulkData.event_id,
            parent_user_id: attendeeItem.parent_user_id,
            name: attendeeItem.name ?? null,
            is_incognito: attendeeItem.is_incognito ?? false,
            rsvp_status: attendeeItem.rsvp_status,
            event_ticket_id: attendeeItem.event_ticket_id ?? null,
            event_promo_code_id: attendeeItem.event_promo_code_id ?? null,
            platform_fee_amount: attendeeItem.platform_fee_amount ?? 0,
            amount_paid: attendeeItem.amount_paid ?? 0,
            host_payout_amount: attendeeItem.host_payout_amount ?? 0,
            transaction_id: bulkData.transaction_id ?? null,
        };

        const attendee = await eventAttendees(fullAttendeeData, createdBy, transaction);
        
        // Check if the attendee purchased a sponsor ticket and add them as a sponsor
        if (attendee.event_ticket_id && transaction) {
            try {
                const ticket = await EventTickets.findByPk(attendee.event_ticket_id, {
                    attributes: ['id', 'ticket_type'],
                    transaction
                });
                
                if (ticket && ticket.ticket_type === TicketType.SPONSOR) {
                    // Add the user as a sponsor participant
                    await eventService.upsertEventParticipantRole(
                        bulkData.event_id,
                        createdBy, // Use the user who purchased the ticket
                        EventParticipantRole.SPONSOR,
                        createdBy,
                        transaction
                    );
                    loggerService.info(`User ${createdBy} added as sponsor for event ${bulkData.event_id} due to sponsor ticket purchase`);
                }
            } catch (error: any) {
                loggerService.error(`Error adding sponsor participant for attendee ${attendee.id}: ${error.message}`);
            }
        }
        
        // Always generate Apple Wallet Pass URL automatically
        try {
            const appleWalletPassUrl = await generateAppleWalletPassUrlDirect(bulkData.event_id, attendee.id);
            
            if (appleWalletPassUrl) {
                // Update attendee with the generated pass URL
                await attendee.update(
                    { apple_wallet_pass_url: appleWalletPassUrl },
                    { transaction }
                );
                attendee.apple_wallet_pass_url = appleWalletPassUrl;
            } else {
                loggerService.warn(`Failed to generate Apple Wallet Pass for attendee ${attendee.id} in event ${bulkData.event_id}`);
            }
        } catch (error: any) {
            loggerService.error(`Error generating Apple Wallet Pass for attendee ${attendee.id}: ${error.message}`);
            // Continue without pass URL - attendee is already created
        }
        
        createdAttendees.push(attendee);
    }

    try {
        if (createdAttendees.length > 0) {
            const shouldSendRsvpConfirmation =
                !bulkData.transaction_id &&
                createdAttendees.some(a => a.rsvp_status === RSVPStatus.YES);

            if (!shouldSendRsvpConfirmation) {
                return createdAttendees;
            }

            const event = await Event.findByPk(bulkData.event_id, {
                attributes: ['id', 'title', 'slug', 'description', 'address', 'city', 'state', 'country', 'start_date', 'end_date', 'image_url', 'created_by'],
                include: [{
                    model: User,
                    as: 'created_by_user',
                    attributes: ['id', 'name', 'email', 'mobile'],
                }],
                transaction,
            });

            const guest = await User.findByPk(createdBy, {
                attributes: ['id', 'name', 'email', 'mobile'],
                transaction,
            });

            if (event && guest) {
                const host = (event as any).created_by_user as User;

                const attendeesWithTickets = await EventAttendee.findAll({
                    where: {
                        id: { [Op.in]: createdAttendees.map(a => a.id) },
                        is_deleted: false,
                        rsvp_status: RSVPStatus.YES,
                    },
                    include: [{
                        model: EventTickets,
                        as: 'event_ticket',
                        attributes: ['id', 'name'],
                        required: false,
                        where: { is_deleted: false },
                    }],
                    transaction,
                });

                await emailService.sendRsvpConfirmationEmailToGuest(event, host, guest, attendeesWithTickets as any, transaction);
                if (host) {
                    await emailService.sendRsvpConfirmationEmailToHost(event, host, guest, attendeesWithTickets as any, transaction);
                }

                if (guest.mobile) {
                    await smsService.sendRsvpConfirmationSmsToGuest(event, guest.mobile, transaction);
                }
                if (host?.mobile) {
                    await smsService.sendRsvpConfirmationSmsToHost(event, host.mobile, guest.name || 'Someone', transaction);
                }

                await notificationService.sendRsvpConfirmationNotificationToGuest(event, guest.id, transaction);
                if (host?.id) {
                    await notificationService.sendRsvpConfirmationNotificationToHost(event, host.id, guest.id, guest.name || 'Someone', transaction);
                }
            }
        }
    } catch (error: any) {
        loggerService.error(`Error sending RSVP confirmation notifications/emails/sms: ${error.message || error}`);
    }

    return createdAttendees;
};

/** Update event attendee - only allows updating rsvp_status, is_incognito, and name */
const updateEventAttendee = async (
    attendeeId: string,
    updateData: {
        rsvp_status?: RSVPStatus;
        is_incognito?: boolean;
        name?: string | null;
    },
    updatedBy: string,
    transaction?: Transaction
): Promise<EventAttendee | null> => {
    // Find the attendee
    const attendee = await EventAttendee.findOne({
        where: {
            id: attendeeId,
            is_deleted: false,
        },
        transaction
    });

    if (!attendee) {
        return null;
    }

    // Build update object with only allowed fields
    const updateFields: any = {
        updated_by: updatedBy,
    };

    if (updateData.rsvp_status !== undefined) {
        updateFields.rsvp_status = updateData.rsvp_status;
    }

    if (updateData.is_incognito !== undefined) {
        updateFields.is_incognito = updateData.is_incognito;
    }

    if (updateData.name !== undefined) {
        updateFields.name = updateData.name;
    }

    // Update the attendee
    await attendee.update(updateFields, { transaction });

    return attendee;
};

/** Soft delete an event attendee by attendee id */
const softDeleteEventAttendee = async (
    attendeeId: string,
    deletedBy: string,
    transaction?: Transaction
): Promise<EventAttendee | null> => {
    const attendee = await EventAttendee.findOne({
        where: {
            id: attendeeId,
            is_deleted: false,
        },
        transaction
    });

    if (!attendee) {
        return null;
    }

    await attendee.update(
        {
            is_deleted: true,
            deleted_at: new Date(),
            deleted_by: deletedBy,
        },
        { transaction }
    );

    return attendee;
};

/** Check-in an event attendee */
const checkInAttendee = async (attendeeId: string, updatedBy: string, transaction?: Transaction): Promise<EventAttendee | null> => {
    const attendee = await EventAttendee.findOne({
        where: {
            id: attendeeId,
            is_deleted: false,
        },
        transaction
    });

    if (!attendee) return null;

    // If already checked in, return the attendee as is
    if (attendee.is_checked_in) return attendee;

    await attendee.update(
        {
            is_checked_in: true,
            updated_by: updatedBy,
        },
        { transaction }
    );

    return attendee;
};

/** Uncheck-in an event attendee */
const uncheckInAttendee = async (attendeeId: string, updatedBy: string, transaction?: Transaction): Promise<EventAttendee | null> => {
    const attendee = await EventAttendee.findOne({
        where: {
            id: attendeeId,
            is_deleted: false,
        },
        transaction
    });

    if (!attendee) return null;

    // If already unchecked, return the attendee as is
    if (!attendee.is_checked_in) return attendee;

    await attendee.update(
        {
            is_checked_in: false,
            updated_by: updatedBy,
        },
        { transaction }
    );

    return attendee;
};

/** Update attendee check-in status */
const updateAttendeeCheckIn = async (attendeeId: string, isCheckedIn: boolean, updatedBy: string, transaction?: Transaction): Promise<EventAttendee | null> => {
    const attendee = await EventAttendee.findOne({
        where: {
            id: attendeeId,
            is_deleted: false,
        },
        transaction
    });

    if (!attendee) return null;

    // If already in the desired state, return the attendee as is
    if (attendee.is_checked_in === isCheckedIn) return attendee;

    await attendee.update(
        {
            is_checked_in: isCheckedIn,
            updated_by: updatedBy,
        },
        { transaction }
    );

    return attendee;
};

const userAttributes = [
    'id',
    'name',
    'email',
    'mobile',
    'username',
    'image_url',
    'thumbnail_url',
    'total_gamification_points',
    'company_name',
    'total_gamification_points_weekly',
];
const eventTicketAttributes = ['id', 'name', 'ticket_type'];

type AttendeeFilterParams = {
    event_id: string;
    rsvp_status?: RSVPStatus[];
    is_checked_in?: boolean;
    ticket_type?: TicketType[];
    is_connected?: boolean;
    search?: string;
};

/** Get attendee counts for an event (total, by rsvp status, checked-in) */
const getEventAttendeeCounts = async (event_id: string): Promise<EventAttendeeCounts> => {
    const baseWhere = { event_id, is_deleted: false };
    const [total_guest, total_attending_guest, total_maybe_guest, total_no_guest, total_checkedin_guest] = await Promise.all([
        EventAttendee.count({ where: baseWhere }),
        EventAttendee.count({ where: { ...baseWhere, rsvp_status: RSVPStatus.YES } }),
        EventAttendee.count({ where: { ...baseWhere, rsvp_status: RSVPStatus.MAYBE } }),
        EventAttendee.count({ where: { ...baseWhere, rsvp_status: RSVPStatus.NO } }),
        EventAttendee.count({ where: { ...baseWhere, is_checked_in: true } }),
    ]);
    return {
        total_guest,
        total_no_guest,
        total_maybe_guest,
        total_attending_guest,
        total_checkedin_guest,
    };
};

/** Get event attendees with filters, pagination, and connection status */
const getEventAttendeesWithFilters = async (
    filters: AttendeeFilterParams,
    page: number,
    limit: number,
    authUserId: string | null
): Promise<{
    data: any[];
    pagination: {
        totalCount: number;
        currentPage: number;
        totalPages: number;
    };
    counts: EventAttendeeCounts;
}> => {
    const { event_id, rsvp_status, is_checked_in, ticket_type, is_connected, search } = filters;
    const offset = (Number(page) - 1) * Number(limit);

    // Build search conditions for EventAttendee fields
    let attendeeSearchConditions: any = {};
    if (search && search.trim().length > 0) {
        const searchPattern = `%${search.trim()}%`;
        attendeeSearchConditions = {
            [Op.or]: [
                // Search in EventAttendee.name for additional guests (when parent_user_id is not null)
                {
                    [Op.and]: [
                        { parent_user_id: { [Op.ne]: null } },
                        { name: { [Op.like]: searchPattern } }
                    ]
                }
            ]
        };
    }

    const where: WhereOptions = {
        event_id,
        is_deleted: false,
    };

    if (rsvp_status && rsvp_status.length > 0) {
        where.rsvp_status = { [Op.in]: rsvp_status };
    }
    if (typeof is_checked_in === 'boolean') {
        where.is_checked_in = is_checked_in;
    }

    // Add attendee search conditions if search is provided
    if (Object.keys(attendeeSearchConditions).length > 0) {
        const existingConditions = { ...where };
        
        // Combine existing conditions with search conditions
        Object.assign(where, {
            [Op.and]: [
                existingConditions,
                ...attendeeSearchConditions[Op.or]
            ]
        });
    }

    // Build optional user search filter
    const userWhere: any = { is_deleted: false };
    if (search && search.trim().length > 0) {
        const searchPattern = `%${search.trim()}%`;
        userWhere[Op.or] = [
            { name: { [Op.like]: searchPattern } },
            { username: { [Op.like]: searchPattern } },
            { email: { [Op.like]: searchPattern } },
        ];
    }

    const attendeeIncludes = [
        {
            model: User,
            as: 'user',
            required: true,
            where: userWhere,
            attributes: userAttributes,
        },
        {
            model: EventTickets,
            as: 'event_ticket',
            required: !!(ticket_type && ticket_type.length > 0),
            where: {
                is_deleted: false,
                ...(ticket_type && ticket_type.length > 0 ? { ticket_type: { [Op.in]: ticket_type } } : {}),
            },
            attributes: eventTicketAttributes,
        },
    ];

    const baseQuery: FindAndCountOptions = {
        where,
        include: attendeeIncludes,
        order: [['created_at', 'DESC']],
    };

    const fetchAllForConnectionFilter = typeof is_connected === 'boolean';

    let rows: EventAttendee[] = [];
    let totalCount = 0;

    if (fetchAllForConnectionFilter) {
        const allRows = await EventAttendee.findAll(baseQuery);
        rows = allRows;
        totalCount = allRows.length;
    } else {
        const { rows: pagedRows, count } = await EventAttendee.findAndCountAll({
            ...baseQuery,
            limit: Number(limit),
            offset,
            distinct: true,
        });
        rows = pagedRows;
        totalCount = Number(count);
    }

    // Build unique users for connection status lookup
    const uniqueUsersMap = new Map<string, any>();
    rows.forEach((att: any) => {
        if (att.user && !uniqueUsersMap.has(att.user.id)) {
            uniqueUsersMap.set(att.user.id, att.user);
        }
    });

    const usersWithStatus = await userService.addConnectionStatusToUsers(
        Array.from(uniqueUsersMap.values()),
        authUserId || null,
        true
    );
    const connectionStatusMap = new Map<string, ConnectionStatus>();
    usersWithStatus.forEach((u: any) => connectionStatusMap.set(u.id, u.connection_status));

    // Transform attendees
    let attendees = rows.map((att: any) => {
        const attendeePlain = att.get({ plain: true });
        const user = attendeePlain.user;
        const ticket = attendeePlain.event_ticket;
        const connection_status = connectionStatusMap.get(user.id) ?? ConnectionStatus.NOT_CONNECTED;

        return {
            id: attendeePlain.id,
            event_id: attendeePlain.event_id,
            user_id: attendeePlain.user_id,
            parent_user_id: attendeePlain.parent_user_id,
            name: attendeePlain.name,
            is_incognito: attendeePlain.is_incognito,
            rsvp_status: attendeePlain.rsvp_status,
            is_checked_in: attendeePlain.is_checked_in,
            event_ticket_id: attendeePlain.event_ticket_id,
            host_payout_amount: Number(attendeePlain.host_payout_amount ?? 0),
            amount_paid: Number(attendeePlain.amount_paid ?? 0),
            platform_fee_amount: Number(attendeePlain.platform_fee_amount ?? 0),
            created_at: attendeePlain.created_at,
            user: {
                ...user,
                connection_status,
            },
            event_ticket: ticket
                ? {
                    id: ticket.id,
                    name: ticket.name,
                    ticket_type: ticket.ticket_type,
                }
                : null,
        };
    });

    // Apply connection filter in-memory when requested
    if (fetchAllForConnectionFilter) {
        attendees = attendees.filter((att: any) => {
            const isConnected = att.user.connection_status === ConnectionStatus.CONNECTED;
            return is_connected ? isConnected : !isConnected;
        });
        totalCount = attendees.length;
        attendees = attendees.slice(offset, offset + Number(limit));
    }

    const counts = await getEventAttendeeCounts(event_id);

    return {
        data: attendees,
        pagination: {
            totalCount,
            currentPage: Number(page),
            totalPages: Math.ceil(totalCount / Number(limit)),
        },
        counts,
    };
};

export default {
    isEventHost,
    checkInAttendee,
    uncheckInAttendee,
    updateEventAttendee,
    updateAttendeeCheckIn,
    getEventAttendeeCounts,
    softDeleteEventAttendee,
    createBulkEventAttendees,
    checkUserAlreadyAttending,
    getEventAttendeesWithFilters
};