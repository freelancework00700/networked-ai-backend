import { Op, Transaction } from 'sequelize';
import {
    EventParticipant,
    RSVPRequest,
    User
} from '../models/index';
import { EventParticipantRole, RSVPRequestStatus } from '../types/enums';
import * as eventService from './event.service';

const userAttributes = ['id', 'name', 'email', 'mobile', 'username', 'image_url', 'thumbnail_url', 'total_gamification_points', 'total_gamification_points_weekly'];

const rsvpRequestIncludeOptions = [
    {
        model: User,
        as: 'user',
        required: true,
        where: { is_deleted: false },
        attributes: userAttributes,
    }
];

/** Check if user is event host (creator or HOST/CO_HOST participant) */
export const isEventHost = async (userId: string, eventId: string): Promise<boolean> => {
    const event = await eventService.getEventByIdOrSlug(eventId);
    if (!event) return false;

    // Check if user is event creator
    if (event.created_by === userId) return true;

    // Check if user is HOST or CO_HOST participant
    const participant = await EventParticipant.findOne({
        where: {
            event_id: eventId,
            user_id: userId,
            role: { [Op.in]: [EventParticipantRole.HOST, EventParticipantRole.CO_HOST] },
            is_deleted: false,
        },
    });

    return !!participant;
};

/** Check if rsvp request already exists */
export const isRSVPRequestExists = async (eventId: string, userId: string) => {
    return await RSVPRequest.findOne({
        where: {
            event_id: eventId,
            user_id: userId,
            is_deleted: false,
        },
    });
};

/** Send RSVP request */
export const sendRSVPRequest = async (eventId: string, userId: string, transaction?: Transaction): Promise<RSVPRequest> => {
    return await RSVPRequest.create({
        event_id: eventId,
        user_id: userId,
        status: RSVPRequestStatus.PENDING,
        created_by: userId,
    }, { transaction });
};

/** Get pending RSVP requests */
export const getPendingRSVPRequests = async (eventId: string, page: number = 1, limit: number = 20): Promise<{
    data: RSVPRequest[];
    pagination: {
        totalCount: number;
        currentPage: number;
        totalPages: number;
    };
}> => {
    const offset = (Number(page) - 1) * Number(limit);

    const whereClause: any = {
        event_id: eventId,
        status: RSVPRequestStatus.PENDING,
        is_deleted: false,
    };

    const { count, rows: requests } = await RSVPRequest.findAndCountAll({
        where: whereClause,
        include: rsvpRequestIncludeOptions,
        order: [['created_at', 'DESC']],
        limit: Number(limit),
        offset,
        distinct: true,
    });

    return {
        data: requests,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};

/** Get processed RSVP requests */
export const getProcessedRSVPRequests = async (eventId: string, page: number = 1, limit: number = 20,): Promise<{
    data: RSVPRequest[];
    pagination: {
        totalCount: number;
        currentPage: number;
        totalPages: number;
    };
}> => {
    const offset = (Number(page) - 1) * Number(limit);

    const whereClause: any = {
        event_id: eventId,
        status: { [Op.in]: [RSVPRequestStatus.APPROVED, RSVPRequestStatus.REJECTED] },
        is_deleted: false,
    };

    const { count, rows: requests } = await RSVPRequest.findAndCountAll({
        where: whereClause,
        include: rsvpRequestIncludeOptions,
        order: [['responded_at', 'DESC'], ['created_at', 'DESC']],
        limit: Number(limit),
        offset,
        distinct: true,
    });

    return {
        data: requests,
        pagination: {
            totalCount: count,
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};

/** Find RSVP request */
export const checkPendingRSVPRequest = async (eventId: string, requestId: string, transaction?: Transaction): Promise<RSVPRequest | null> => {
    return await RSVPRequest.findOne({
        where: {
            id: requestId,
            event_id: eventId,
            is_deleted: false,
            status: RSVPRequestStatus.PENDING,
        },
        transaction
    });
};

/** Approve or reject RSVP request */
export const approveRejectRSVPRequest = async (
    eventId: string,
    requestId: string,
    action: RSVPRequestStatus.APPROVED | RSVPRequestStatus.REJECTED,
    updatedBy?: string,
    transaction?: Transaction
) => {
    await RSVPRequest.update({
        status: action,
        responded_at: new Date(),
        updated_by: updatedBy,
    }, {
        where: {
            id: requestId,
            event_id: eventId,
            is_deleted: false
        },
        transaction,
        individualHooks: true
    });
};
